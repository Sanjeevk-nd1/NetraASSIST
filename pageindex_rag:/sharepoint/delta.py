import os
import requests

def delta(token, delta_link=None):
    headers = {"Authorization": f"Bearer {token}"}

    if delta_link:
        url = delta_link
    else:
        url = (
            f"https://graph.microsoft.com/v1.0/sites/"
            f"{os.environ['SHAREPOINT_SITE_ID']}/drives/"
            f"{os.environ['SHAREPOINT_DRIVE_ID']}/root:"
            f"/{os.environ['SHAREPOINT_FOLDER_PATH']}"
            f":/delta"
        )

    r = requests.get(url, headers=headers)
    r.raise_for_status()
    return r.json()