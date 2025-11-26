"""
Life-Pilot Backend API
Secure API key management service built with Flask
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
from datetime import datetime
import base64

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8087",
])

# Configuration
app.config['ENVIRONMENT'] = os.getenv('ENVIRONMENT', 'development')
app.config['BACKEND_HOST'] = os.getenv('BACKEND_HOST', '127.0.0.1')
app.config['BACKEND_PORT'] = int(os.getenv('BACKEND_PORT', 8000))

# In-memory API keys storage
api_keys_store = {}


class EncryptionManager:
    """Manages encryption of sensitive data"""
    
    @staticmethod
    def encrypt_api_key(api_key: str) -> str:
        """Encrypt an API key for storage"""
        return base64.b64encode(api_key.encode()).decode()
    
    @staticmethod
    def decrypt_api_key(encrypted_key: str) -> str:
        """Decrypt an API key from storage"""
        try:
            return base64.b64decode(encrypted_key.encode()).decode()
        except Exception as e:
            raise Exception(f"Failed to decrypt API key: {str(e)}")


# Initialize encryption manager
encryption_manager = EncryptionManager()


# Routes
@app.route('/', methods=['GET'])
def root():
    """Root endpoint with API information"""
    return jsonify({
        "name": "Life-Pilot Backend API",
        "version": "1.0.0",
        "description": "Secure API key management backend",
        "endpoints": {
            "health": "/health",
            "store_key": "POST /api/keys/store",
            "retrieve_key": "GET /api/keys/retrieve/<service_name>",
            "list_keys": "GET /api/keys/list",
            "delete_key": "DELETE /api/keys/delete/<service_name>"
        }
    }), 200


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Life-Pilot Backend is running",
        "timestamp": datetime.utcnow().isoformat()
    }), 200


@app.route('/api/keys/store', methods=['POST'])
def store_api_key():
    """Store an API key securely"""
    try:
        data = request.get_json()
        
        if not data or 'service_name' not in data or 'api_key' not in data:
            return jsonify({
                "success": False,
                "error": "service_name and api_key are required"
            }), 400
        
        service_name = data['service_name']
        api_key = data['api_key']
        description = data.get('description', '')
        
        # Encrypt the API key
        encrypted_key = encryption_manager.encrypt_api_key(api_key)
        
        # Store in memory
        api_keys_store[service_name] = {
            "encrypted_key": encrypted_key,
            "description": description,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Return masked key for verification
        masked_key = api_key[:4] + "*" * (len(api_key) - 8) + api_key[-4:]
        
        logger.info(f"API key stored for service: {service_name}")
        
        return jsonify({
            "success": True,
            "message": f"API key for {service_name} stored securely",
            "service_name": service_name,
            "masked_key": masked_key,
            "description": description
        }), 201
    
    except Exception as e:
        logger.error(f"Error storing API key: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to store API key: {str(e)}"
        }), 500


@app.route('/api/keys/retrieve/<service_name>', methods=['GET'])
def retrieve_api_key(service_name):
    """Retrieve a stored API key"""
    try:
        if service_name not in api_keys_store:
            return jsonify({
                "success": False,
                "error": f"API key for {service_name} not found"
            }), 404
        
        stored_data = api_keys_store[service_name]
        decrypted_key = encryption_manager.decrypt_api_key(
            stored_data["encrypted_key"]
        )
        
        logger.info(f"API key retrieved for service: {service_name}")
        
        return jsonify({
            "service_name": service_name,
            "api_key": decrypted_key,
            "description": stored_data.get("description"),
            "created_at": stored_data.get("created_at")
        }), 200
    
    except Exception as e:
        logger.error(f"Error retrieving API key: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to retrieve API key: {str(e)}"
        }), 500


@app.route('/api/keys/list', methods=['GET'])
def list_api_keys():
    """List all stored API keys (without exposing actual keys)"""
    try:
        keys_list = []
        
        for service_name, data in api_keys_store.items():
            decrypted = encryption_manager.decrypt_api_key(data["encrypted_key"])
            masked_key = decrypted[:4] + "*" * (len(decrypted) - 8) + decrypted[-4:]
            
            keys_list.append({
                "service_name": service_name,
                "description": data.get("description"),
                "masked_key": masked_key,
                "created_at": data.get("created_at")
            })
        
        logger.info(f"Listed {len(keys_list)} API keys")
        
        return jsonify({
            "success": True,
            "total": len(keys_list),
            "keys": keys_list
        }), 200
    
    except Exception as e:
        logger.error(f"Error listing API keys: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to list API keys: {str(e)}"
        }), 500


@app.route('/api/keys/delete/<service_name>', methods=['DELETE'])
def delete_api_key(service_name):
    """Delete a stored API key"""
    try:
        if service_name not in api_keys_store:
            return jsonify({
                "success": False,
                "error": f"API key for {service_name} not found"
            }), 404
        
        del api_keys_store[service_name]
        
        logger.info(f"API key deleted for service: {service_name}")
        
        return jsonify({
            "success": True,
            "message": f"API key for {service_name} deleted successfully"
        }), 200
    
    except Exception as e:
        logger.error(f"Error deleting API key: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Failed to delete API key: {str(e)}"
        }), 500


# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "success": False,
        "error": "Endpoint not found"
    }), 404


@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        "success": False,
        "error": "Internal server error"
    }), 500


if __name__ == '__main__':
    logger.info(f"Starting Life-Pilot Backend API in {app.config['ENVIRONMENT']} environment")
    logger.info(f"Listening on {app.config['BACKEND_HOST']}:{app.config['BACKEND_PORT']}")
    
    app.run(
        host=app.config['BACKEND_HOST'],
        port=app.config['BACKEND_PORT'],
        debug=(app.config['ENVIRONMENT'] == 'development')
    )

