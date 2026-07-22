"""Start the Data Service.  Run: python run_data.py"""
import uvicorn
from data_service.config import DATA_SERVICE_PORT

if __name__ == "__main__":
    print(f"Starting Data Service  →  http://localhost:{DATA_SERVICE_PORT}")
    print(f"Swagger UI             →  http://localhost:{DATA_SERVICE_PORT}/docs")
    uvicorn.run("data_service.main:app", host="0.0.0.0", port=DATA_SERVICE_PORT, reload=True)
