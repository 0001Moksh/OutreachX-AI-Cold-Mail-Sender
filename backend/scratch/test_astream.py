import sys
import os
import asyncio

# Setup paths
root_dir = r"c:\Users\renuk\Projects\cold Mail Sender"
sys.path.append(root_dir)
sys.path.append(os.path.join(root_dir, "deva_backend"))

import main
from shared.database import SessionLocal, DATABASE_URL

async def run():
    db = SessionLocal()
    checkpointer = main.PostgresSaver(DATABASE_URL)
    user_id = "f5f7dea2-d2f9-431c-8529-aea5cd0fa49a"
    graph = main.get_user_graph(user_id, db, checkpointer)
    config = {
        "configurable": {
            "thread_id": "test_thread_async_run",
            "user_id": user_id
        }
    }
    inputs = {"messages": [("user", "hi")]}
    
    print("Starting async stream...")
    try:
        async for chunk in graph.astream(inputs, config, stream_mode="updates"):
            print("CHUNK:", chunk)
    except Exception as e:
        import traceback
        print("EXCEPTION ENCOUNTERED:")
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run())
