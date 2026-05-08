# Deva Agent Backend

Standalone FastAPI service for the OutreachX Deva assistant.

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8010
```

## Endpoints

- `GET /health`
- `GET /deva/context`
- `POST /deva/chat`
- `POST /deva/actions`
