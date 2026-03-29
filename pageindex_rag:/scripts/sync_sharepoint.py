from sharepoint.auth import token
from sharepoint.download import list_files_in_folder
from db.repo import upsert_document
from dotenv import load_dotenv
import os

load_dotenv() 

SITE_ID = os.environ["SHAREPOINT_SITE_ID"]
DRIVE_ID = os.environ["SHAREPOINT_DRIVE_ID"]
FOLDER_PATH = os.environ["SHAREPOINT_FOLDER_PATH"]


def run():
    access_token = token()

    items = list_files_in_folder(
        access_token=access_token,
        site_id=SITE_ID,
        drive_id=DRIVE_ID,
        folder_path=FOLDER_PATH,
    )

    for item in items:
        # Skip folders
        if "file" not in item:
            continue

        doc = {
            "source_file_id": item["id"],
            "name": item["name"],
            "web_url": item["webUrl"],
            "etag": item.get("eTag"),
            "last_modified": item["lastModifiedDateTime"],
            "drive_id": DRIVE_ID,   # ✅ now defined
            "site_id": SITE_ID,
            "path": item["parentReference"]["path"],
        }

        upsert_document(doc)
        print(f"Upserted: {item['name']}")


if __name__ == "__main__":
    run()