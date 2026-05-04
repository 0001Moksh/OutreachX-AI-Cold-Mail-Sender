"""
Celery Configuration for OutreachX
Advanced task queue settings with beat scheduler
"""

from datetime import timedelta
from kombu import Exchange, Queue

# Broker and Result Backend
broker_url = "redis://localhost:6379/0"
result_backend = "redis://localhost:6379/0"

# Task Settings
task_serializer = "json"
accept_content = ["json"]
result_serializer = "json"
timezone = "UTC"
enable_utc = True

# Task Execution Settings
task_track_started = True
task_time_limit = 30 * 60  # 30 minutes hard limit
task_soft_time_limit = 25 * 60  # 25 minutes soft limit (allow cleanup)

# Worker Settings
worker_prefetch_multiplier = 4  # Prefetch 4 tasks per worker
worker_max_tasks_per_child = 1000  # Recycle worker process after 1000 tasks

# Retry Settings
task_acks_late = True
worker_disable_rate_limits = False

# Queue Configuration
default_queue = "default"
default_exchange = "outreachx"
default_routing_key = "default"

task_queues = (
    Queue(
        "default",
        Exchange("outreachx", type="direct"),
        routing_key="default",
        queue_arguments={"x-max-priority": 10}
    ),
    Queue(
        "emails",
        Exchange("outreachx", type="direct"),
        routing_key="email",
        queue_arguments={"x-max-priority": 10}
    ),
    Queue(
        "ai_tasks",
        Exchange("outreachx", type="direct"),
        routing_key="ai",
        queue_arguments={"x-max-priority": 5}
    ),
    Queue(
        "cleanup",
        Exchange("outreachx", type="direct"),
        routing_key="cleanup",
        queue_arguments={"x-max-priority": 1}
    ),
)

# Task Routing
task_routes = {
    "tasks.send_campaign_emails": {"queue": "emails", "priority": 10},
    "tasks.retry_failed_emails": {"queue": "emails", "priority": 9},
    "tasks.update_campaign_stats": {"queue": "default", "priority": 5},
    "tasks.schedule_campaign": {"queue": "default", "priority": 8},
    "tasks.cleanup_old_otp_codes": {"queue": "cleanup", "priority": 1},
}

# Beat Schedule (Periodic Tasks)
beat_schedule = {
    "cleanup-otp-codes": {
        "task": "tasks.cleanup_old_otp_codes",
        "schedule": timedelta(hours=1),  # Every hour
        "options": {"expires": 3600}
    },
    "update-campaign-stats": {
        "task": "tasks.update_campaign_stats",
        "schedule": timedelta(minutes=5),  # Every 5 minutes
        "options": {"expires": 300}
    },
    "process-scheduled-campaigns": {
        "task": "tasks.process_scheduled_campaigns",
        "schedule": timedelta(minutes=1),  # Every minute
        "options": {"expires": 60}
    },
}

# Timezone
timezone = "UTC"
