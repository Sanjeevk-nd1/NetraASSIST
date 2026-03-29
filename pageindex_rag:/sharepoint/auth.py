import msal, os

def token():
    client_id = os.environ.get("AZURE_CLIENT_ID")
    tenant_id = os.environ.get("AZURE_TENANT_ID")
    client_secret = os.environ.get("AZURE_CLIENT_SECRET")

    if not client_id or not tenant_id or not client_secret:
        missing = [k for k in ("AZURE_CLIENT_ID", "AZURE_TENANT_ID", "AZURE_CLIENT_SECRET")
                   if not os.environ.get(k)]
        raise ValueError(
            f"SharePoint authentication is not configured. "
            f"Missing environment variable(s): {', '.join(missing)}"
        )

    app = msal.ConfidentialClientApplication(
        client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        client_credential=client_secret,
    )
    result = app.acquire_token_for_client(
        scopes=["https://graph.microsoft.com/.default"]
    )

    if "access_token" not in result:
        error_desc = result.get("error_description", result.get("error", "Unknown MSAL error"))
        raise ValueError(
            f"Failed to obtain SharePoint access token: {error_desc}"
        )

    return result["access_token"]