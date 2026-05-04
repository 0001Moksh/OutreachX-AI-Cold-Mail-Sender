# OutreachX - AI-Powered Cold Outreach OS

OutreachX is a highly secure, AI-powered cold outreach operating system designed for scale, deliverability, and hyper-personalization.

## Architecture
The application is structured into two main components:
- **Frontend**: Next.js (React) application configured for high-performance and SEO.
- **Backend**: FastAPI (Python) service ensuring rapid execution, secure credential management (AES-256), and PostgreSQL database integration.

## Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- Docker & Docker Compose (optional, for containerized deployments)
- PostgreSQL (if running locally without Docker)

## Setup & Execution

### 1. Backend Setup (FastAPI)
1. Navigate to the backend directory: `cd backend`
2. Create a virtual environment: `python -m venv myenv`
3. Activate the virtual environment:
   - Windows: `myenv\Scripts\activate`
   - Mac/Linux: `source myenv/bin/activate`
4. Install dependencies: `pip install -r requirements.txt`
5. Copy `.env.example` to `.env` and fill in your secure credentials.
6. Run the server: `uvicorn main:app --reload`
   - The API will be available at `http://localhost:8000`

### 2. Frontend Setup (Next.js)
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`
   - The UI will be available at `http://localhost:3000`

### 3. Docker Deployment (Recommended)
To run the entire application stack (Frontend + Backend + PostgreSQL) using Docker:
1. Ensure Docker Desktop is running.
2. From the root directory, run: `docker-compose up --build`
3. Access the frontend at `http://localhost:3000` and the backend at `http://localhost:8000`.

## Security Implementations (Industrial Standard)
- **AES-256 Encryption**: All sensitive data (App Passwords, OAuth tokens) are encrypted before storage in PostgreSQL.
- **Strict CORS**: FastAPI middleware restricts API access only to authorized domains (e.g., the Vercel frontend URL).
- **Environment Variables**: API keys and secrets are strictly loaded via `.env` files and never committed to source control.
- **SEO & Web Security**: The Next.js frontend implements standard Google SEO guidelines and Content Security Policies.

## Database
We use PostgreSQL. To initialize the database structure, run the queries found in `schema.sql`.

## Deployment
Both services are configured for seamless deployment on **Vercel**. 
- Backend: Uses `vercel.json` to route `/api/*` to the FastAPI application.
- Frontend: Natively supported by Vercel's Next.js integration.
Alternatively, the included `Dockerfile`s allow deployment to any cloud provider supporting containers (AWS ECS, Google Cloud Run, etc.).
