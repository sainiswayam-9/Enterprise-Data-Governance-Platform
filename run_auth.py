"""Start the Auth Service.  Run: python run_auth.py"""
import uvicorn
from auth_service.config import AUTH_SERVICE_PORT

if __name__ == "__main__":
    print(f"Starting Auth Service  →  http://localhost:{AUTH_SERVICE_PORT}")
    print(f"Swagger UI             →  http://localhost:{AUTH_SERVICE_PORT}/docs")
    uvicorn.run("auth_service.main:app", host="0.0.0.0", port=AUTH_SERVICE_PORT, reload=True)
