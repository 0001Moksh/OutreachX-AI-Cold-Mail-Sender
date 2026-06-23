import os
import redis
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL")
print(f"Connecting to: {url}")

# Create default client (will use RESP3 by default in redis-py 5.x)
client = redis.from_url(url)
print("Ping:", client.ping())

key_str = "unacked_index"
try:
    print(f"Testing zrevrangebyscore on {key_str} WITHOUT monkeypatching...")
    res = client.zrevrangebyscore(key_str, 1e15, 0, withscores=True)
    print(f"Result: {res}")
except Exception as e:
    import traceback
    traceback.print_exc()
