import os
import sys
from types import ModuleType

# Mock pkg_resources to prevent Vercel python 3.12 setuptools ModuleNotFoundError
if "pkg_resources" not in sys.modules:
    pkg_resources_mock = ModuleType("pkg_resources")
    def mock_parse_version(version_str):
        try:
            from packaging.version import parse
            return parse(version_str)
        except ImportError:
            import re
            parts = [int(x) if x.isdigit() else x for x in re.split(r'(\d+)', version_str) if x]
            return tuple(parts)
    pkg_resources_mock.parse_version = mock_parse_version
    sys.modules["pkg_resources"] = pkg_resources_mock

# Load environment variables explicitly from deva/.env if it exists
deva_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
if os.path.exists(deva_env_path):
    from dotenv import load_dotenv
    load_dotenv(deva_env_path, override=True)
else:
    from dotenv import load_dotenv
    load_dotenv()


# Adjust paths to import shared and deva modules
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
if current_dir not in sys.path:
    sys.path.append(current_dir)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from deva.api.routes import chat, actions, workflows

app = FastAPI(
    title="OutreachX Deva AI OS API",
    description="Conversational Agentic AI Engine for cold outreach management",
    version="1.0.0"
)

# CORS configuration to allow local frontend access
origins = ["*"]
allowed_origins_env = os.getenv("ALLOWED_ORIGINS")
if allowed_origins_env:
    origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True if origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register routes
app.include_router(chat.router)
app.include_router(actions.router)
app.include_router(workflows.router)

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "deva-ai-os"}

@app.get("/")
def root():
    """Root endpoint"""
    return {
        "name": "OutreachX Deva AI Operating System Backend",
        "status": "online",
        "port": 8001
    }

if __name__ == "__main__":
    import uvicorn
    # Start on port 8001 to align with frontend getDevaApiUrl() config
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
