import os
import sys
import tempfile
import urllib.parse
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import requests
from sqlalchemy import text

from backend.database import SessionLocal

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
PAGEINDEX_ROOT = os.path.join(PROJECT_ROOT, "pageindex_rag:")
if PAGEINDEX_ROOT not in sys.path:
    sys.path.insert(0, PAGEINDEX_ROOT)

from pageindex.parse_markdown import parse_markdown
from ingest.docx_to_md import docx_to_markdown
from ingest.excel_to_md import excel_to_markdown
from ingest.pdf_to_md import pdf_to_markdown
from ingest.pptx_to_md import pptx_to_markdown
from sharepoint.auth import token as sharepoint_token

GRAPH_ROOT = "https://graph.microsoft.com/v1.0"
DEFAULT_LIBRARY_ALIASES = {"documents", "shareddocuments"}
SUPPORTED_SUFFIXES = {".docx", ".xlsx", ".xls", ".md", ".markdown", ".txt", ".pptx", ".pdf"}
CURRENT_INDEX_VERSION = 2

SHAREPOINT_PROFILES = {
    "knowledge": {
        "label": "SE Knowledge Base",
        "config_keys": {
            "repository_url": "sharepoint_repository_url",
            "site_id": "sharepoint_site_id",
            "drive_id": "sharepoint_drive_id",
            "folder_path": "sharepoint_folder_path",
            "delta_link": "sharepoint_delta_link",
            "last_sync_at": "sharepoint_last_sync_at",
        },
    },
    "policy": {
        "label": "Infosec Knowledge Base",
        "config_keys": {
            "repository_url": "policy_docs_repository_url",
            "site_id": "policy_docs_site_id",
            "drive_id": "policy_docs_drive_id",
            "folder_path": "policy_docs_folder_path",
            "delta_link": "policy_docs_delta_link",
            "last_sync_at": "policy_docs_last_sync_at",
        },
    },
}


def _profile_def(profile: str) -> Dict:
    if profile not in SHAREPOINT_PROFILES:
        raise ValueError(f"Unsupported SharePoint profile '{profile}'")
    return SHAREPOINT_PROFILES[profile]


def _write_profile_config(profile: str, values: Dict[str, str]) -> None:
    profile_def = _profile_def(profile)
    db = SessionLocal()
    try:
        for key, storage_key in profile_def["config_keys"].items():
            db.execute(text("""
                INSERT INTO system_config (key, value, updated_at)
                VALUES (:key, :value, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = NOW()
            """), {"key": storage_key, "value": values.get(key, "").strip()})
        db.commit()
    finally:
        db.close()


def get_sharepoint_config(profile: str = "knowledge") -> Dict[str, str]:
    profile_def = _profile_def(profile)
    quoted_keys = ", ".join(f"'{key}'" for key in profile_def["config_keys"].values())
    db = SessionLocal()
    try:
        rows = db.execute(text(f"""
            SELECT key, value
            FROM system_config
            WHERE key IN ({quoted_keys})
        """)).fetchall()
        stored = {row[0]: row[1] for row in rows}
    finally:
        db.close()

    return {
        "profile": profile,
        "label": profile_def["label"],
        **{
            key: stored.get(storage_key, "")
            for key, storage_key in profile_def["config_keys"].items()
        },
    }


def get_all_sharepoint_configs() -> Dict[str, Dict[str, str]]:
    return {
        profile: get_sharepoint_config(profile)
        for profile in SHAREPOINT_PROFILES
    }


def _graph_get(access_token: str, url: str) -> Dict:
    response = requests.get(url, headers={"Authorization": f"Bearer {access_token}"}, timeout=60)
    response.raise_for_status()
    return response.json()


def _normalize_name(value: str) -> str:
    return "".join(char.lower() for char in (value or "") if char.isalnum())


def _normalize_folder_path(value: str) -> str:
    return (value or "").strip().strip("/")


def _drive_aliases(library_name: str) -> List[str]:
    normalized = _normalize_name(library_name)
    aliases = {normalized}
    if normalized == "shareddocuments":
        aliases.add("documents")
    if normalized == "documents":
        aliases.add("shareddocuments")
    return list(aliases)


def _resolve_drive(access_token: str, site_id: str, library_name: str) -> Dict:
    normalized_library = _normalize_name(library_name)

    if normalized_library in DEFAULT_LIBRARY_ALIASES:
        try:
            default_drive = _graph_get(access_token, f"{GRAPH_ROOT}/sites/{site_id}/drive")
            if default_drive.get("id"):
                return default_drive
        except Exception:
            pass

    drives_lookup = _graph_get(access_token, f"{GRAPH_ROOT}/sites/{site_id}/drives")
    drive_candidates = drives_lookup.get("value", [])
    aliases = set(_drive_aliases(library_name))

    direct_match = next(
        (item for item in drive_candidates if _normalize_name(item.get("name", "")) in aliases),
        None,
    )
    if direct_match:
        return direct_match

    url_match = next(
        (
            item for item in drive_candidates
            if normalized_library and normalized_library in _normalize_name(item.get("webUrl", ""))
        ),
        None,
    )
    if url_match:
        return url_match

    if normalized_library in DEFAULT_LIBRARY_ALIASES and drive_candidates:
        return drive_candidates[0]

    raise ValueError(f"Could not find SharePoint drive for library '{library_name}'")


def parse_sharepoint_repository_url(repository_url: str) -> Dict[str, str]:
    parsed = urllib.parse.urlparse(repository_url)
    if not parsed.netloc or "/sites/" not in parsed.path:
        raise ValueError("Invalid SharePoint repository URL")

    query = urllib.parse.parse_qs(parsed.query)
    item_path = urllib.parse.unquote(query.get("id", [""])[0])
    if not item_path:
        raise ValueError("The SharePoint URL does not contain a folder id path")

    path_parts = [part for part in item_path.split("/") if part]
    try:
        sites_index = path_parts.index("sites")
    except ValueError as exc:
        raise ValueError("Could not infer SharePoint site from the repository URL") from exc

    if len(path_parts) < sites_index + 4:
        raise ValueError("Could not infer document library from the repository URL")

    return {
        "host": parsed.netloc,
        "site_path": "/".join(path_parts[sites_index:sites_index + 2]),
        "library_name": path_parts[sites_index + 2],
        "folder_path": _normalize_folder_path("/".join(path_parts[sites_index + 3:])),
    }


def resolve_sharepoint_repository_url(repository_url: str) -> Dict[str, str]:
    parsed = parse_sharepoint_repository_url(repository_url)
    access_token = sharepoint_token()
    site_lookup = _graph_get(access_token, f"{GRAPH_ROOT}/sites/{parsed['host']}:/{parsed['site_path']}")
    site_id = site_lookup["id"]
    drive = _resolve_drive(access_token, site_id, parsed["library_name"])

    return {
        "repository_url": repository_url,
        "site_id": site_id,
        "drive_id": drive["id"],
        "folder_path": parsed["folder_path"],
    }


def save_sharepoint_config(config: Dict[str, str], profile: str = "knowledge") -> None:
    current = get_sharepoint_config(profile)
    repository_url = config.get("repository_url", "").strip()
    repository_changed = repository_url != (current.get("repository_url") or "")

    base_config = {
        "repository_url": repository_url,
        "site_id": config.get("site_id", "").strip(),
        "drive_id": config.get("drive_id", "").strip(),
        "folder_path": _normalize_folder_path(config.get("folder_path", "")),
        "delta_link": "" if repository_changed else (current.get("delta_link") or ""),
        "last_sync_at": "" if repository_changed else (current.get("last_sync_at") or ""),
    }

    if repository_url:
        _write_profile_config(profile, base_config)
        resolved = resolve_sharepoint_repository_url(repository_url)
        base_config.update(resolved)
    else:
        _write_profile_config(profile, base_config)
        return

    _write_profile_config(profile, base_config)


def ensure_sharepoint_config(profile: str = "knowledge") -> Dict[str, str]:
    config = get_sharepoint_config(profile)
    config["folder_path"] = _normalize_folder_path(config.get("folder_path", ""))
    if config["site_id"] and config["drive_id"] and config["folder_path"]:
        return config

    repository_url = config.get("repository_url", "").strip()
    if not repository_url:
        return config

    resolved = resolve_sharepoint_repository_url(repository_url)
    merged = {**config, **resolved}
    merged["folder_path"] = _normalize_folder_path(merged.get("folder_path", ""))
    _write_profile_config(profile, merged)
    return merged


def _delta_root_url(config: Dict[str, str]) -> str:
    normalized_path = _normalize_folder_path(config.get("folder_path", ""))
    if normalized_path:
        folder_path = urllib.parse.quote(normalized_path)
        return f"{GRAPH_ROOT}/sites/{config['site_id']}/drives/{config['drive_id']}/root:/{folder_path}:/delta"
    return f"{GRAPH_ROOT}/sites/{config['site_id']}/drives/{config['drive_id']}/root/delta"


def _collect_delta_items(access_token: str, config: Dict[str, str]) -> Dict:
    delta_link = (config.get("delta_link") or "").strip()
    url = delta_link or _delta_root_url(config)

    items = []
    final_delta_link = None
    used_delta_link = bool(delta_link)
    while url:
        try:
            data = _graph_get(access_token, url)
        except requests.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            can_retry_from_root = used_delta_link and status in {400, 404, 410}
            if can_retry_from_root:
                url = _delta_root_url(config)
                items = []
                final_delta_link = None
                used_delta_link = False
                continue
            raise
        items.extend(data.get("value", []))
        url = data.get("@odata.nextLink")
        final_delta_link = data.get("@odata.deltaLink", final_delta_link)

    return {"items": items, "delta_link": final_delta_link}


def _download_drive_item(access_token: str, site_id: str, drive_id: str, item_id: str, destination: str) -> None:
    headers = {"Authorization": f"Bearer {access_token}"}
    url = f"{GRAPH_ROOT}/sites/{site_id}/drives/{drive_id}/items/{item_id}/content"
    response = requests.get(url, headers=headers, timeout=120)
    response.raise_for_status()
    with open(destination, "wb") as file_obj:
        file_obj.write(response.content)


def _file_to_markdown(local_path: str, original_name: str) -> str:
    suffix = Path(original_name).suffix.lower()
    if suffix == ".docx":
        return docx_to_markdown(local_path)
    if suffix in {".xlsx", ".xls"}:
        return excel_to_markdown(local_path)
    if suffix == ".pptx":
        return pptx_to_markdown(local_path)
    if suffix == ".pdf":
        return pdf_to_markdown(local_path)
    if suffix in {".md", ".markdown", ".txt"}:
        return Path(local_path).read_text(encoding="utf-8", errors="ignore")
    raise ValueError(f"Unsupported file type for indexing: {suffix}")


def _source_file_key(profile: str, file_id: str) -> str:
    return f"{profile}:{file_id}"


def _document_type(filename: str) -> str:
    suffix = Path(filename).suffix.lower().lstrip(".")
    return suffix or "unknown"


def _upsert_document_metadata(db, file_meta: Dict, config: Dict[str, str], profile: str) -> str:
    source_key = _source_file_key(profile, file_meta["id"])
    payload = {
        "source_file_id": source_key,
        "legacy_source_file_id": file_meta["id"],
        "repository_key": profile,
        "document_type": _document_type(file_meta["name"]),
        "name": file_meta["name"],
        "web_url": file_meta.get("webUrl", ""),
        "etag": file_meta.get("eTag", ""),
        "last_modified": file_meta.get("lastModifiedDateTime", datetime.utcnow().isoformat()),
        "drive_id": config["drive_id"],
        "site_id": config["site_id"],
        "path": config["folder_path"],
    }

    existing = db.execute(text("""
        SELECT id
        FROM documents
        WHERE source_file_id IN (:source_file_id, :legacy_source_file_id)
        LIMIT 1
    """), payload).fetchone()

    if existing:
        row = db.execute(text("""
            UPDATE documents
            SET source_file_id = :source_file_id,
                repository_key = :repository_key,
                document_type = :document_type,
                name = :name,
                web_url = :web_url,
                etag = :etag,
                last_modified = :last_modified,
                drive_id = :drive_id,
                site_id = :site_id,
                path = :path,
                is_deleted = false
            WHERE id = :id
            RETURNING id
        """), {**payload, "id": existing[0]}).fetchone()
    else:
        row = db.execute(text("""
            INSERT INTO documents (
                source_file_id, repository_key, document_type, name, web_url, etag, last_modified, drive_id, site_id, path, is_deleted
            )
            VALUES (
                :source_file_id, :repository_key, :document_type, :name, :web_url, :etag, :last_modified, :drive_id, :site_id, :path, false
            )
            RETURNING id
        """), payload).fetchone()
    return str(row[0])


def _replace_sections(db, document_id: str, markdown: str) -> int:
    sections = parse_markdown(markdown)

    # If the document has content but no markdown headings (e.g. docx without
    # heading styles), wrap it under a synthetic root heading so the parser
    # produces at least one section.
    if not sections and markdown.strip():
        # Try to use the first non-empty line as a title, fall back to generic
        first_line = next(
            (line.strip() for line in markdown.splitlines() if line.strip()), "Document"
        )
        title = first_line[:120]
        markdown = f"# {title}\n\n{markdown}"
        sections = parse_markdown(markdown)

    db.execute(text("DELETE FROM sections WHERE document_id = :document_id"), {"document_id": document_id})
    for section in sections:
        db.execute(text("""
            INSERT INTO sections (id, document_id, parent_id, title, level, summary, content)
            VALUES (:id, :document_id, :parent_id, :title, :level, :summary, :content)
        """), {
            "id": section.id,
            "document_id": document_id,
            "parent_id": section.parent_id,
            "title": section.title,
            "level": section.level,
            "summary": (section.content or "").strip()[:220],
            "content": section.content,
        })
    return len(sections)


def _retire_documents_outside_current_scope(db, profile: str, config: Dict[str, str]) -> None:
    db.execute(text("""
        UPDATE documents
        SET is_deleted = true,
            processed = false,
            processed_at = NULL
        WHERE repository_key = :repository_key
          AND (
            COALESCE(site_id, '') <> :site_id
            OR COALESCE(drive_id, '') <> :drive_id
            OR COALESCE(path, '') <> :path
          )
    """), {
        "repository_key": profile,
        "site_id": config["site_id"],
        "drive_id": config["drive_id"],
        "path": config["folder_path"],
    })


def sync_sharepoint_documents(profile: str = "knowledge") -> Dict:
    config = ensure_sharepoint_config(profile)
    if not config["site_id"] or not config["drive_id"] or not config["folder_path"]:
        raise ValueError("SharePoint site, drive, and folder path must be configured.")

    access_token = sharepoint_token()
    delta_payload = _collect_delta_items(access_token, config)
    entries = delta_payload["items"]
    file_entries = [entry for entry in entries if "file" in entry and not entry.get("deleted")]
    deleted_entries = [entry for entry in entries if entry.get("deleted")]

    db = SessionLocal()
    indexed_count = 0
    skipped_count = 0
    unsupported = []
    try:
        _retire_documents_outside_current_scope(db, profile, config)

        for file_meta in file_entries:
            source_key = _source_file_key(profile, file_meta["id"])
            current = db.execute(text("""
                SELECT id, etag, processed_at, COALESCE(index_version, 0) AS index_version
                FROM documents
                WHERE source_file_id IN (:source_file_id, :legacy_source_file_id)
            """), {"source_file_id": source_key, "legacy_source_file_id": file_meta["id"]}).mappings().fetchone()
            document_id = _upsert_document_metadata(db, file_meta, config, profile)

            suffix = Path(file_meta["name"]).suffix.lower()
            if suffix not in SUPPORTED_SUFFIXES:
                unsupported.append(file_meta["name"])
                skipped_count += 1
                db.execute(text("""
                    UPDATE documents
                    SET processed_at = NULL
                    WHERE id = :document_id
                """), {"document_id": document_id})
                continue

            if (
                current
                and current["etag"] == file_meta.get("eTag", "")
                and current["processed_at"] is not None
                and current["index_version"] == CURRENT_INDEX_VERSION
            ):
                skipped_count += 1
                continue

            with tempfile.TemporaryDirectory() as temp_dir:
                local_path = os.path.join(temp_dir, file_meta["name"])
                _download_drive_item(access_token, config["site_id"], config["drive_id"], file_meta["id"], local_path)
                markdown = _file_to_markdown(local_path, file_meta["name"])
                section_count = _replace_sections(db, document_id, markdown)
                db.execute(text("""
                    UPDATE documents
                    SET processed = :processed,
                        processed_at = :processed_at,
                        index_version = :index_version
                    WHERE id = :document_id
                """), {
                    "document_id": document_id,
                    "processed": section_count > 0,
                    "processed_at": datetime.utcnow() if section_count > 0 else None,
                    "index_version": CURRENT_INDEX_VERSION,
                })
                indexed_count += 1

        for deleted in deleted_entries:
            db.execute(text("""
                UPDATE documents
                SET is_deleted = true,
                    processed = false,
                    processed_at = NULL
                WHERE source_file_id IN (:source_file_id, :legacy_source_file_id)
            """), {
                "source_file_id": _source_file_key(profile, deleted["id"]),
                "legacy_source_file_id": deleted["id"],
            })

        profile_keys = _profile_def(profile)["config_keys"]
        if delta_payload["delta_link"]:
            db.execute(text("""
                INSERT INTO system_config (key, value, updated_at)
                VALUES (:key, :value, NOW())
                ON CONFLICT (key) DO UPDATE SET
                    value = EXCLUDED.value,
                    updated_at = NOW()
            """), {"key": profile_keys["delta_link"], "value": delta_payload["delta_link"]})

        db.execute(text("""
            INSERT INTO system_config (key, value, updated_at)
            VALUES (:key, :value, NOW())
            ON CONFLICT (key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = NOW()
        """), {"key": profile_keys["last_sync_at"], "value": datetime.utcnow().isoformat()})
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    return {
        "profile": profile,
        "label": config["label"],
        "total_files": len(file_entries),
        "indexed_count": indexed_count,
        "skipped_count": skipped_count,
        "unsupported_files": unsupported,
        "config": config,
    }
