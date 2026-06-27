import os
import glob

def patch_backend_startup():
    base_dir = r"c:\Users\renuk\Projects\cold Mail Sender"
    main_files = glob.glob(os.path.join(base_dir, "deva_backend_*", "main.py"))
    
    for mf in main_files:
        try:
            with open(mf, "r", encoding="utf-8") as f:
                content = f.read()
                
            if 'app.state.db_pool = await get_db_pool()' in content and 'try:' not in content:
                # Need to replace the startup block
                old_startup = '''@app.on_event("startup")
async def startup():
    app.state.db_pool = await get_db_pool()'''
                
                new_startup = '''@app.on_event("startup")
async def startup():
    try:
        app.state.db_pool = await get_db_pool()
        print(f"[{os.path.basename(os.path.dirname(mf))}] Database connected successfully.")
    except Exception as e:
        print(f"[{os.path.basename(os.path.dirname(mf))}] WARNING: Could not connect to database on startup: {e}")
        app.state.db_pool = None'''
                
                if old_startup in content:
                    new_content = content.replace(old_startup, new_startup)
                    with open(mf, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Patched {mf}")
        except Exception as e:
            print(f"Error processing {mf}: {e}")

if __name__ == "__main__":
    patch_backend_startup()
