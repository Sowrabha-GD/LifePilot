"""
Application Settings and Configuration
Handles environment variables and app configuration securely
"""

from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings loaded from environment variables"""
    
    # Server Configuration
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    environment: str = "development"
    
    # Supabase Configuration
    supabase_project_id: str
    supabase_publishable_key: str
    supabase_url: str
    supabase_secret_key: str
    
    # JWT Configuration
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24
    
    # CORS Configuration
    allowed_origins: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8087",
    ]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False

# Initialize settings
settings = Settings()
