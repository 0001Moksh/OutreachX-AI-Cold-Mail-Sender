# Start Celery Worker for OutreachX (Windows PowerShell)

# Load environment variables from .env
$envFile = ".\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Set defaults if not in .env
if (-not $env:DATABASE_URL) {
    $env:DATABASE_URL = "postgresql://outreachx:outreachx_password@localhost:5432/outreachx"
}
if (-not $env:CELERY_BROKER_URL) {
    Write-Host "✗ CELERY_BROKER_URL is not set. Celery cannot connect without Redis host configuration." -ForegroundColor Red
    exit 1
}

Write-Host "Checking database connection..." -ForegroundColor Cyan
$testDb = python -c "
import os
from sqlalchemy import create_engine
db_url = os.getenv('DATABASE_URL', 'postgresql://outreachx:outreachx_password@localhost:5432/outreachx')
try:
    engine = create_engine(db_url)
    conn = engine.connect()
    conn.close()
    print('success')
except Exception as e:
    print(f'error: {e}')
"

if ($testDb -like "*success*") {
    Write-Host "✓ Database connection successful" -ForegroundColor Green
} else {
    Write-Host "✗ Database connection failed: $testDb" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting Celery Worker..." -ForegroundColor Cyan
Write-Host "Worker will listen to queues: default, emails, ai_tasks, cleanup" -ForegroundColor Yellow
Write-Host ""

# Start worker
celery -A tasks worker `
    --loglevel=info `
    --pool=solo `
    --queues=default,emails,ai_tasks,cleanup `
    --time-limit=1800
