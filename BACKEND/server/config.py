from datetime import timedelta
import os
from dotenv import load_dotenv

# Load .env file from the server directory
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

class Config:
    #App Configuration
    SECRET_KEY = os.getenv('SECRET_KEY')
    # Prefer DATABASE_URL from environment (.env). Keep a safe local fallback.
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(BASE_DIR, 'app.db'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False


    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    #File Uploads
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static/uploads')  # Local storage
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

    # Ensure upload folder exists
    os.makedirs(UPLOAD_FOLDER, exist_ok=True) 
