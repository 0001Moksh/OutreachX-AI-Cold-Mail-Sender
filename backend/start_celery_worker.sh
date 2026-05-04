#!/bin/bash
# Start Celery Worker for OutreachX (Linux/Mac)

set -a
source .env 2>/dev/null || true
set +a

# Ensure Redis is running
if ! redis-cli ping > /dev/null 2>&1; then
    echo "Error: Redis is not running. Please start Redis first."
    exit 1
fi

# Ensure database is accessible
python -c "
import os
from sqlalchemy import create_engine
db_url = os.getenv('DATABASE_URL', 'postgresql://outreachx:outreachx_password@localhost:5432/outreachx')
try:
    engine = create_engine(db_url)
    conn = engine.connect()
    conn.close()
    print('✓ Database connection successful')
except Exception as e:
    print(f'✗ Database connection failed: {e}')
    exit(1)
" || exit 1

echo "Starting Celery Worker..."
echo "Worker will listen to queues: default, emails, ai_tasks, cleanup"
echo ""

celery -A tasks worker \
    --loglevel=info \
    --concurrency=4 \
    --queues=default,emails,ai_tasks,cleanup \
    --max-tasks-per-child=1000 \
    --time-limit=1800 \
    --soft-time-limit=1500
