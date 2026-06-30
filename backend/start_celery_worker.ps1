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
    $env:DATABASE_URL = "postgresql://postgres.nhderhrbasdzdqixvcvd:tmBG_NCB7xb3um.@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
}
if (-not $env:CELERY_BROKER_URL) {
    Write-Host "✗ CELERY_BROKER_URL is not set." -ForegroundColor Red
    exit 1
}

Write-Host "Starting Celery Worker..." -ForegroundColor Cyan
Write-Host "Worker will listen to queues: default, emails, ai_tasks, cleanup" -ForegroundColor Yellow

# Start worker
celery -A tasks worker --loglevel=info --pool=solo --queues=default,emails,ai_tasks,cleanup --time-limit=1800
