"""
Security utilities for handling JWT tokens and password hashing
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.config.settings import settings
import os

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class SecurityManager:
    """Manages security operations like JWT and password handling"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Create a JWT access token
        
        Args:
            data: Dictionary containing token claims
            expires_delta: Optional expiration time delta
            
        Returns:
            Encoded JWT token
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                hours=settings.jwt_expiration_hours
            )
        
        to_encode.update({"exp": expire})
        
        try:
            encoded_jwt = jwt.encode(
                to_encode,
                settings.jwt_secret_key,
                algorithm=settings.jwt_algorithm
            )
            return encoded_jwt
        except Exception as e:
            raise Exception(f"Failed to create token: {str(e)}")
    
    @staticmethod
    def verify_token(token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode a JWT token
        
        Args:
            token: JWT token to verify
            
        Returns:
            Decoded token data if valid, None otherwise
        """
        try:
            payload = jwt.decode(
                token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm]
            )
            return payload
        except JWTError:
            return None


class EncryptionManager:
    """Manages encryption of sensitive data"""
    
    @staticmethod
    def encrypt_api_key(api_key: str) -> str:
        """
        Encrypt an API key for storage
        In production, use a proper encryption library like cryptography.fernet
        """
        # This is a basic implementation
        # For production, implement proper encryption
        import base64
        return base64.b64encode(api_key.encode()).decode()
    
    @staticmethod
    def decrypt_api_key(encrypted_key: str) -> str:
        """
        Decrypt an API key from storage
        """
        import base64
        try:
            return base64.b64decode(encrypted_key.encode()).decode()
        except Exception as e:
            raise Exception(f"Failed to decrypt API key: {str(e)}")


# Global instances
security_manager = SecurityManager()
encryption_manager = EncryptionManager()
