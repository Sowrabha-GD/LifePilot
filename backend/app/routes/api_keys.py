"""
API Routes for managing API keys securely
"""

from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from app.utils.security import encryption_manager, security_manager
from app.config.settings import settings

router = APIRouter(prefix="/api/keys", tags=["api-keys"])


class APIKeyRequest(BaseModel):
    """Request model for storing API keys"""
    service_name: str  # e.g., "supabase", "google", "stripe"
    api_key: str
    description: Optional[str] = None


class APIKeyResponse(BaseModel):
    """Response model for API key operations"""
    service_name: str
    description: Optional[str] = None
    masked_key: str  # Only return masked key for security
    created_at: str


# In-memory storage (In production, use a database)
# Format: {service_name: {"encrypted_key": str, "description": str}}
api_keys_store = {}


@router.post("/store", response_model=dict)
async def store_api_key(request: APIKeyRequest):
    """
    Store an API key securely
    
    The API key is encrypted before storage and never exposed in responses.
    Only the service name and a masked version of the key are returned.
    """
    try:
        # Validate that service name is not empty
        if not request.service_name or not request.api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="service_name and api_key are required"
            )
        
        # Encrypt the API key
        encrypted_key = encryption_manager.encrypt_api_key(request.api_key)
        
        # Store in memory (In production, save to database)
        api_keys_store[request.service_name] = {
            "encrypted_key": encrypted_key,
            "description": request.description,
            "created_at": __import__("datetime").datetime.utcnow().isoformat()
        }
        
        # Return masked key for verification
        masked_key = request.api_key[:4] + "*" * (len(request.api_key) - 8) + request.api_key[-4:]
        
        return {
            "success": True,
            "message": f"API key for {request.service_name} stored securely",
            "service_name": request.service_name,
            "masked_key": masked_key,
            "description": request.description
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store API key: {str(e)}"
        )


@router.get("/retrieve/{service_name}")
async def retrieve_api_key(service_name: str):
    """
    Retrieve a stored API key
    
    This endpoint decrypts and returns the API key.
    In production, this should be protected with authentication and authorization.
    """
    try:
        if service_name not in api_keys_store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"API key for {service_name} not found"
            )
        
        stored_data = api_keys_store[service_name]
        decrypted_key = encryption_manager.decrypt_api_key(
            stored_data["encrypted_key"]
        )
        
        return {
            "service_name": service_name,
            "api_key": decrypted_key,
            "description": stored_data.get("description"),
            "created_at": stored_data.get("created_at")
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve API key: {str(e)}"
        )


@router.get("/list")
async def list_api_keys():
    """
    List all stored API keys (without exposing actual keys)
    
    Returns only service names, descriptions, and masked keys.
    """
    keys_list = []
    
    for service_name, data in api_keys_store.items():
        # Get masked version of the key
        decrypted = encryption_manager.decrypt_api_key(data["encrypted_key"])
        masked_key = decrypted[:4] + "*" * (len(decrypted) - 8) + decrypted[-4:]
        
        keys_list.append({
            "service_name": service_name,
            "description": data.get("description"),
            "masked_key": masked_key,
            "created_at": data.get("created_at")
        })
    
    return {
        "total": len(keys_list),
        "keys": keys_list
    }


@router.delete("/delete/{service_name}")
async def delete_api_key(service_name: str):
    """Delete a stored API key"""
    try:
        if service_name not in api_keys_store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"API key for {service_name} not found"
            )
        
        del api_keys_store[service_name]
        
        return {
            "success": True,
            "message": f"API key for {service_name} deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {str(e)}"
        )
