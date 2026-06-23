"""
Redis and Celery Connection Validation for OutreachX
Handles TLS/SSL connections, retry logic, and exponential backoff
"""

import os
import ssl
import time
import logging
import redis

logger = logging.getLogger(__name__)

def verify_redis_url(url_name: str, url: str) -> bool:
    """Verify connection to a Redis/Celery URL with exponential backoff and timeout."""
    if not url:
        print(f"[FAIL] {url_name} Env Variable Missing")
        logger.error(f"{url_name} environment variable is not set.")
        return False

    # Check protocol for SSL options
    ssl_options = {}
    if url.startswith("rediss://"):
        ssl_options = {"ssl_cert_reqs": ssl.CERT_NONE}

    max_retries = 3
    timeout = 5.0  # seconds socket timeout
    
    for attempt in range(1, max_retries + 1):
        try:
            # Create the Redis client instance
            client = redis.Redis.from_url(
                url,
                socket_timeout=timeout,
                socket_connect_timeout=timeout,
                **ssl_options
            )
            # Execute ping check
            if client.ping():
                print(f"[OK] {url_name} Connected")
                logger.info(f"{url_name} connection verified successfully.")
                return True
        except Exception as e:
            wait_time = 2 ** attempt
            logger.warning(f"Attempt {attempt} failed to connect to {url_name}: {e}. Retrying in {wait_time}s...")
            if attempt < max_retries:
                time.sleep(wait_time)
            else:
                print(f"[FAIL] {url_name} Connection Failed")
                logger.error(f"Failed to connect to {url_name} after {max_retries} attempts: {e}")
                
    return False

def run_startup_validation():
    """Run all Redis and Celery connection validations gracefully."""
    print("\n--- Redis & Celery Environment Validation ---")
    redis_url = os.getenv("REDIS_URL")
    broker_url = os.getenv("CELERY_BROKER_URL")
    backend_url = os.getenv("CELERY_RESULT_BACKEND")
    
    redis_ok = verify_redis_url("Upstash Redis", redis_url)
    broker_ok = verify_redis_url("Celery Broker", broker_url)
    backend_ok = verify_redis_url("Celery Backend", backend_url)
    print("---------------------------------------------\n")
    
    return redis_ok and broker_ok and backend_ok
