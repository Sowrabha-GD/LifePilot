# Backend Setup Instructions

## Overview

This is the FastAPI backend for Life-Pilot that securely manages API keys and provides backend services.

## Installation

1. **Create a Python virtual environment:**

   ```bash
   cd backend
   python -m venv venv
   ```

2. **Activate the virtual environment:**

   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your values:

   - Supabase credentials
   - JWT secret key (generate with: `openssl rand -hex 32`)
   - CORS origins matching your frontend

5. **Run the server:**

   ```bash
   uvicorn main:app --reload
   ```

   The API will be available at `http://localhost:8000`

## API Endpoints

### Health Check

- `GET /` - Root endpoint with API info
- `GET /health` - Health check

### API Keys Management

- `POST /api/keys/store` - Store an API key securely
- `GET /api/keys/retrieve/{service_name}` - Retrieve a stored API key
- `GET /api/keys/list` - List all stored API keys (masked)
- `DELETE /api/keys/delete/{service_name}` - Delete an API key

## API Key Storage Logic

1. **Encryption**: API keys are encrypted before storage using base64 encoding (for production, use cryptography.fernet for better security)
2. **Retrieval**: Only authenticated requests can retrieve the actual API key
3. **Listing**: Shows only masked versions of keys (first 4 and last 4 characters visible)
4. **In-Memory Storage**: Currently uses in-memory dict (for production, use database like PostgreSQL)

## Security Features

- ✅ CORS protection with configurable allowed origins
- ✅ JWT token support for authentication
- ✅ Password hashing with bcrypt
- ✅ API key encryption/decryption
- ✅ Environment variable management
- ✅ Request validation with Pydantic
- ✅ Global exception handling
- ✅ Logging and monitoring

## Future Enhancements

- [ ] Database integration (PostgreSQL with SQLAlchemy ORM)
- [ ] User authentication and authorization
- [ ] Rate limiting
- [ ] API key rotation and expiration
- [ ] Audit logging
- [ ] Advanced encryption (Fernet)
- [ ] Webhook support
- [ ] Async database operations

## Development

For development, the server auto-reloads on file changes. Access API docs at:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Production Deployment

For production:

1. Set `ENVIRONMENT=production` in .env
2. Generate strong JWT_SECRET_KEY: `openssl rand -hex 32`
3. Use environment variables for sensitive data
4. Enable database persistence
5. Set up proper error logging and monitoring
6. Use HTTPS/SSL
7. Implement rate limiting and request throttling
8. Set up proper CORS policy
