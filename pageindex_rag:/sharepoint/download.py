import requests
from typing import List, Dict


GRAPH_ROOT = "https://graph.microsoft.com/v1.0"


def list_files_in_folder(
    access_token: str,
    site_id: str,
    drive_id: str,
    folder_path: str,
) -> List[Dict]:
    """
    Lists all files in a SharePoint folder (non-recursive).

    folder_path example: "SOC/N8N"
    """

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    # Graph expects path relative to drive root
    url = (
        f"{GRAPH_ROOT}/sites/{site_id}"
        f"/drives/{drive_id}"
        f"/root:/{folder_path}:/children"
    )

    items: List[Dict] = []

    while url:
        resp = requests.get(url, headers=headers)
        resp.raise_for_status()

        data = resp.json()
        items.extend(data.get("value", []))

        # Pagination support
        url = data.get("@odata.nextLink")

    return items