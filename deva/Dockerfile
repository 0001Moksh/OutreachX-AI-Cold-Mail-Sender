FROM python:3.10-slim

WORKDIR /app

# Install system dependencies for postgres/cryptography
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

COPY deva/requirements.txt ./deva/requirements.txt
RUN pip install --no-cache-dir -r ./deva/requirements.txt

COPY shared ./shared
COPY deva ./deva

# Set python path to allow importing shared modules
ENV PYTHONPATH=/app

# Expose the port FastAPI runs on
EXPOSE 8001

CMD ["uvicorn", "deva.main:app", "--host", "0.0.0.0", "--port", "8001"]
