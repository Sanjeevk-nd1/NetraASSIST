import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('JWT_SECRET_KEY', '')
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', '')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    AZURE_OPENAI_API_KEY = os.environ.get('AZURE_OPENAI_API_KEY', '')
    AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT', '')
    AZURE_OPENAI_DEPLOYMENT = os.environ.get('AZURE_OPENAI_DEPLOYMENT', 'gpt-4-2')
    AZURE_OPENAI_API_VERSION = os.environ.get('AZURE_OPENAI_API_VERSION', '2024-12-01-preview')

    AZURE_TENANT_ID = os.environ.get('AZURE_TENANT_ID', '')
    AZURE_CLIENT_ID = os.environ.get('AZURE_CLIENT_ID', '')
    AZURE_CLIENT_SECRET = os.environ.get('AZURE_CLIENT_SECRET', '')
    SHAREPOINT_SITE_ID = os.environ.get('SHAREPOINT_SITE_ID', '')
    SHAREPOINT_DRIVE_ID = os.environ.get('SHAREPOINT_DRIVE_ID', '')
    SHAREPOINT_FOLDER_PATH = os.environ.get('SHAREPOINT_FOLDER_PATH', 'SOC/N8N')

    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'downloads')
