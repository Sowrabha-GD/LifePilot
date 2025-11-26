"""
Health check and status routes
"""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "message": "Life-Pilot Backend is running"
    }


@router.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Life-Pilot Backend API",
        "version": "1.0.0",
        "description": "Secure API key management and task management backend",
        "endpoints": {
            "health": "/health",
            "api-keys": "/api/keys",
            "docs": "/docs"
        }
    }
