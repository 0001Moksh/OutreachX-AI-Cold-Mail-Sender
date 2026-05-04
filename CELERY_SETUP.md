# Celery Queue System Setup Guide

Complete guide for OutreachX Celery + Redis task queue infrastructure.

## 🏗️ Architecture Overview

```
┌─────────────────┐
│    FastAPI      │ (enqueues tasks)
│  Application    │
└────────┬────────┘
         │
         │ Redis Protocol
         ▼
┌─────────────────┐
│     Redis       │ (message broker)
│  Broker/Cache   │
└────────┬────────┘
         │
    ┌────┴────┬────────┬──────────┐
    │          │        │          │
    ▼          ▼        ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Worker 1│ │Worker 2│ │  Beat  │ │Flower  │
│(email) │ │(ai)    │ │(sched) │ │(monitor)
└────────┘ └────────┘ └────────┘ └────────┘
```

## 📦 Components

### 1. **Redis**
- Message broker for task queue
- Result backend for task results
- Cache store for sessions/data
- Port: 6379

### 2. **Celery Worker**
- Processes tasks from queue
- 4 worker processes (configurable)
- Handles: emails, AI tasks, scheduled tasks, cleanup
- Auto-retries failed tasks
- Max 30 min per task

### 3. **Celery Beat**
- Scheduler for periodic tasks
- Runs every minute to check schedules
- Tasks:
  - Update campaign stats (every 5 min)
  - Clean expired OTPs (every 1 hour)
  - Process scheduled campaigns (every 1 min)

### 4. **Flower**
- Web-based monitoring dashboard
- Real-time task status
- Worker metrics
- Port: 5555

## 🚀 Quick Start with Docker

```bash
# 1. Start all services
docker-compose up -d

# 2. Verify all services are running
docker-compose ps

# 3. Check logs
docker-compose logs -f celery_worker
docker-compose logs -f celery_beat
docker-compose logs -f flower

# 4. Access Flower dashboard
# Open http://localhost:5555 in browser
```

## 💻 Local Development (Without Docker)

### Prerequisites
```bash
# Redis must be running
redis-server

# Ensure dependencies installed
cd backend
pip install -r requirements.txt
```

### Start Components

**Terminal 1 - Backend API:**
```bash
cd backend
python -m uvicorn main:app --reload --port 8000
```

**Terminal 2 - Celery Worker:**
```bash
cd backend
python start_celery_worker.ps1  # Windows
# or
bash start_celery_worker.sh     # Linux/Mac
```

**Terminal 3 - Celery Beat (Optional):**
```bash
cd backend
python start_celery_beat.ps1    # Windows
# or
bash start_celery_beat.sh       # Linux/Mac
```

**Terminal 4 - Flower Dashboard (Optional):**
```bash
cd backend
celery -A tasks flower
# Open http://localhost:5555
```

## 📋 Task Configuration

### Task Queues
```
- default:   General tasks
- emails:    Email sending (high priority)
- ai_tasks:  AI/ML operations
- cleanup:   Maintenance tasks (low priority)
```

### Task Routes
```python
send_campaign_emails      → emails queue (priority: 10)
retry_failed_emails       → emails queue (priority: 9)
schedule_campaign         → default queue (priority: 8)
update_campaign_stats     → default queue (priority: 5)
cleanup_old_otp_codes     → cleanup queue (priority: 1)
```

### Task Timeouts
```
- Hard limit:     30 minutes (1800 sec)
- Soft limit:     25 minutes (1500 sec)
- Soft limit = graceful shutdown time
```

## 🎯 Monitoring

### Flower Dashboard

**URL:** `http://localhost:5555`

**Features:**
- Active tasks real-time
- Worker status
- Task history and details
- Queue lengths
- Execution graphs
- Worker pool management

### Command Line Monitoring

```bash
# Inspect active tasks
celery -A tasks inspect active

# View worker stats
celery -A tasks inspect stats

# Monitor queue length
celery -A tasks inspect reserved

# View all tasks
celery -A tasks inspect registered

# Get worker details
celery -A tasks inspect query_task <task_id>
```

### Logs

```bash
# Docker logs
docker-compose logs celery_worker
docker-compose logs celery_beat
docker-compose logs flower

# Real-time follow
docker-compose logs -f celery_worker

# Search logs
docker-compose logs celery_worker | grep "ERROR"
```

## 🧪 Testing Tasks

### Enqueue a Campaign

```python
# Via API
POST /campaigns/{campaign_id}/launch

# Response includes task_id
{
  "success": true,
  "task_id": "abc123...",
  "campaign_id": "xyz789..."
}
```

### Check Task Status

```python
from tasks import celery_app

# Get task result
result = celery_app.AsyncResult('task_id')
print(result.state)     # PENDING, STARTED, SUCCESS, FAILURE
print(result.result)    # Task result or error
```

### Test Task Directly

```python
# In Python shell
python
>>> from tasks import send_campaign_emails
>>> task = send_campaign_emails.delay('campaign_uuid')
>>> task.id
'abc123...'
>>> task.status
'PENDING'
>>> task.result  # Wait for completion
```

## 🔧 Configuration Files

### `celery_config.py`
- Broker and backend URLs
- Task serialization settings
- Retry policies
- Queue definitions
- Task routing
- Beat schedule

### `tasks.py`
- Celery app initialization
- Task definitions
- Task-specific logic
- Error handling
- Logging

### `docker-compose.yml`
- Service definitions
- Environment variables
- Network configuration
- Volume management
- Health checks

## 🚨 Troubleshooting

### Worker not starting
```bash
# Check Redis connection
redis-cli ping

# Check database connection
python -c "from database import engine; engine.connect()"

# View error logs
docker-compose logs celery_worker

# Rebuild image
docker-compose build --no-cache celery_worker
```

### Tasks stuck in queue
```bash
# Check active tasks
celery -A tasks inspect active

# Purge queue (WARNING: clears all pending tasks)
celery -A tasks purge

# Restart worker
docker-compose restart celery_worker
```

### High memory usage
```bash
# Reduce concurrency
# Edit docker-compose.yml: --concurrency=2

# Reduce prefetch multiplier
# In celery_config.py: worker_prefetch_multiplier = 1

# Force worker recycle more often
# In celery_config.py: worker_max_tasks_per_child = 500
```

### Task timing out
```bash
# Increase timeout in celery_config.py
task_time_limit = 45 * 60  # 45 minutes
task_soft_time_limit = 40 * 60  # 40 minutes

# Or mark task as long-running
@celery_app.task(time_limit=3600)  # 1 hour
def long_task():
    pass
```

## 📊 Performance Tips

1. **Concurrency**
   - Default: 4 workers
   - CPU-heavy: Match CPU cores
   - I/O-heavy: 2x CPU cores

2. **Prefetch**
   - Increase for many small tasks
   - Decrease for few large tasks
   - Current: 4 tasks prefetched

3. **Result Backend**
   - Redis: Fast but temporary
   - Postgres: Permanent but slower
   - Current: Redis (auto-cleanup)

4. **Queue Priority**
   - Email tasks: priority 9-10
   - Default tasks: priority 5-8
   - Cleanup tasks: priority 1

5. **Task Routing**
   - Separate queues by type
   - Workers listen to specific queues
   - Prevents blocking between types

## 🔐 Security Best Practices

1. ✅ Use strong Redis password
2. ✅ Limit worker file descriptors
3. ✅ Run workers as non-root
4. ✅ Enable SSL/TLS for Redis
5. ✅ Sanitize task inputs
6. ✅ Monitor queue size
7. ✅ Set task timeouts
8. ✅ Enable task rate limiting

## 📈 Scaling

### Horizontal Scaling
```bash
# Add more workers
docker-compose up -d --scale celery_worker=3

# Add dedicated queue
# Update celery_config.py with new queue
# Update docker-compose with queue flag
```

### Redis Clustering
```bash
# Use Redis Cluster for high availability
# Update CELERY_BROKER_URL to use cluster endpoints
```

### Load Balancing
```bash
# Use Nginx/HAProxy before Redis if needed
# Or use AWS ElastiCache / Azure Cache
```

## 📚 Useful Commands

```bash
# List all registered tasks
celery -A tasks inspect registered_tasks

# Get worker info
celery -A tasks inspect stats

# View queue length
celery -A tasks inspect reserved

# Shutdown worker gracefully
celery -A tasks control shutdown

# Kill task
celery -A tasks control revoke <task_id>

# View task history
celery -A tasks events

# Export stats
celery -A tasks events --camera <camera> -f <file>
```

## 🎓 Resources

- [Celery Documentation](https://docs.celeryproject.org/)
- [Flower Documentation](https://flower.readthedocs.io/)
- [Redis Documentation](https://redis.io/documentation)
- [Django Celery Beat](https://github.com/celery/django-celery-beat)

## ✅ Deployment Checklist

- [ ] Redis configured with persistence
- [ ] Worker concurrency tuned for server
- [ ] Task timeouts set appropriately
- [ ] Dead letter queue configured
- [ ] Flower access restricted
- [ ] Monitoring/alerting enabled
- [ ] Log aggregation set up
- [ ] Task retries configured
- [ ] Database connection pooling configured
- [ ] Error handling/fallbacks implemented
- [ ] Load testing completed
- [ ] Backup strategy for queue state

---

**Status:** ✅ Ready for Production
**Last Updated:** 2024
