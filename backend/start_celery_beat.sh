#!/bin/bash
# Start Celery Beat Scheduler for OutreachX (Linux/Mac)

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

echo "Starting Celery Beat Scheduler..."
echo "Scheduled tasks:"
echo "  - cleanup-otp-codes (every hour)"
echo "  - update-campaign-stats (every 5 minutes)"
echo "  - process-scheduled-campaigns (every minute)"
echo ""

celery -A tasks beat \
    --loglevel=info \
    --scheduler django_celery_beat.schedulers:PersistentScheduler
