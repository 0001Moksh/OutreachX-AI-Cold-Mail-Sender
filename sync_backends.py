import os
import shutil

def clear_and_copy_dir(src, dest):
    """Safely clear destination directory and copy from source."""
    if os.path.exists(dest):
        print(f"Clearing existing directory: {dest}")
        shutil.rmtree(dest)
    print(f"Copying {src} -> {dest}")
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '.vercel', '.git', '.ipynb_checkpoints'))

def copy_file(src, dest):
    """Safely copy single file."""
    dest_dir = os.path.dirname(dest)
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir, exist_ok=True)
    print(f"Copying file {src} -> {dest}")
    if os.path.exists(dest):
        os.remove(dest)
    shutil.copy2(src, dest)

def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 1. Source directories
    shared_src = os.path.join(root_dir, "shared")
    deva_src = os.path.join(root_dir, "deva")
    backend_src = os.path.join(root_dir, "backend")
    
    # 2. Destinations
    backends = ["deva", "deva_backend_1", "deva_backend_2", "deva_backend_3"]
    
    # Copy shared/ to all backends and primary backend
    for b in backends:
        dest_shared = os.path.join(root_dir, b, "shared")
        clear_and_copy_dir(shared_src, dest_shared)
    
    dest_backend_shared = os.path.join(root_dir, "backend", "shared")
    clear_and_copy_dir(shared_src, dest_backend_shared)

        
    # Copy deva package to all backends (as 'deva' subdirectory)
    # For 'deva' itself, we copy packages inside to 'deva/deva/' to allow import from deva.*
    for b in backends:
        dest_deva = os.path.join(root_dir, b, "deva")
        if b == "deva":
            # Avoid copying the entire 'deva' directory into itself recursively!
            # We copy specific parts of deva into 'deva/deva'
            deva_sub = os.path.join(root_dir, "deva", "deva")
            if os.path.exists(deva_sub):
                shutil.rmtree(deva_sub)
            os.makedirs(deva_sub, exist_ok=True)
            
            items_to_copy = ["agents", "api", "services", "tools", "workflows", "prompts"]
            for item in items_to_copy:
                src_item = os.path.join(root_dir, "deva", item)
                dest_item = os.path.join(deva_sub, item)
                if os.path.isdir(src_item):
                    clear_and_copy_dir(src_item, dest_item)
            
            # Copy single python files
            files_to_copy = ["database.py", "models.py"]
            for f in files_to_copy:
                src_f = os.path.join(root_dir, "deva", f)
                dest_f = os.path.join(deva_sub, f)
                if os.path.isfile(src_f):
                    copy_file(src_f, dest_f)
        else:
            # For other backends, copy the full deva directory contents
            if os.path.exists(dest_deva):
                shutil.rmtree(dest_deva)
            os.makedirs(dest_deva, exist_ok=True)
            
            # Copy all folders
            folders = ["agents", "api", "services", "tools", "workflows", "prompts"]
            for f in folders:
                src_f = os.path.join(deva_src, f)
                if os.path.exists(src_f):
                    clear_and_copy_dir(src_f, os.path.join(dest_deva, f))
            
            # Copy files
            files = ["database.py", "models.py"]
            for f in files:
                src_f = os.path.join(deva_src, f)
                if os.path.exists(src_f):
                    copy_file(src_f, os.path.join(dest_deva, f))
                    
    # 3. Copy asset_parser.py from backend/services to deva_backend_2/backend/services/
    parser_src = os.path.join(backend_src, "services", "asset_parser.py")
    parser_dest = os.path.join(root_dir, "deva_backend_2", "backend", "services", "asset_parser.py")
    copy_file(parser_src, parser_dest)
    
    # 4. Copy backend/ (excluding .vercel, __pycache__, etc.) to deva_backend_3/backend/
    dest_backend_3 = os.path.join(root_dir, "deva_backend_3", "backend")
    if os.path.exists(dest_backend_3):
        shutil.rmtree(dest_backend_3)
    os.makedirs(dest_backend_3, exist_ok=True)
    
    backend_items = os.listdir(backend_src)
    ignore_items = [".vercel", "__pycache__", "node_modules", ".env", ".env.example", ".gitignore", "scratch", "a.ipynb", "pip_out.txt", "shared"]
    for item in backend_items:
        if item in ignore_items:
            continue
        src_path = os.path.join(backend_src, item)
        dest_path = os.path.join(dest_backend_3, item)
        if os.path.isdir(src_path):
            clear_and_copy_dir(src_path, dest_path)
        else:
            copy_file(src_path, dest_path)

    print("Synchronization completed successfully!")

if __name__ == "__main__":
    main()
