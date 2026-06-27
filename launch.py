import os
import sys
import time
import socket
import subprocess
import webbrowser
import urllib.request

# ANSI escape codes for premium colors and styles
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
RESET = "\033[0m"

# Clear terminal screen
if sys.platform == "win32":
    os.system("cls")
else:
    os.system("clear")

def print_banner():
    banner = fr"""
{CYAN}{BOLD}
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║   ██████╗ ██╗   ██╗████████╗██████╗ ███████╗ █████╗  ██████╗██╗  ██╗██╗  ██╗ ║
║  ██╔═══██╗██║   ██║╚══██╔══╝██╔══██╗██╔════╝██╔══██╗██╔════╝██║  ██║╚██╗██╔╝ ║
║  ██║   ██║██║   ██║   ██║   ██████╔╝█████╗  ███████║██║     ███████║ ╚███╔╝  ║
║  ██║   ██║██║   ██║   ██║   ██╔══██╗██╔══╝  ██╔══██║██║     ██╔══██║ ██╔██╗  ║
║  ╚██████╔╝╚██████╔╝   ██║   ██║  ██║███████╗██║  ██║╚██████╗██║  ██║██╔╝ ██╗ ║
║   ╚═════╝  ╚═════╝    ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝ ║
║                                                                              ║
║  ██████╗ ███████╗██╗   ██╗ █████╗                                            ║
║  ██╔══██╗██╔════╝██║   ██║██╔══██╗                                           ║
║  ██║  ██║█████╗  ██║   ██║███████║                                           ║
║  ██║  ██║██╔══╝  ╚██╗ ██╔╝██╔══██║                                           ║
║  ██████╔╝███████╗ ╚████╔╝ ██║  ██║                                           ║
║  ╚═════╝ ╚══════╝  ╚═══╝  ╚═╝  ╚═╝                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

{MAGENTA}                 ◈ AI OUTREACH OPERATING SYSTEM ◈{RESET}

{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}

  {YELLOW}◉ SYSTEM:{RESET}            DEVA Autonomous Intelligence Core
  {YELLOW}◉ VERSION:{RESET}           v3.0 Enterprise Edition
  {YELLOW}◉ BUILDER:{RESET}           Moksh Bhardwaj
  {YELLOW}◉ ORGANIZATION:{RESET}      OutreachX Technologies
  {YELLOW}◉ ENVIRONMENT:{RESET}       myenv
  {YELLOW}◉ PLATFORM:{RESET}          {sys.platform.upper()}
  {YELLOW}◉ STARTED:{RESET}           {time.strftime('%Y-%m-%d %H:%M:%S')}

{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}

  [✓] Memory Engine Initialized
  [✓] Agent Runtime Online
  [✓] Workflow Orchestrator Ready
  [✓] LLM Gateway Connected
  [✓] Vector Intelligence Active
  [✓] Campaign Engine Armed
  [✓] Autonomous Execution Enabled

{CYAN}
          "Building Autonomous Businesses Through AI"
{RESET}

{GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{RESET}
"""
    print(banner)


def is_port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.2)
        try:
            s.connect(("127.0.0.1", port))
            return True
        except Exception:
            return False

def get_pid_occupying_port(port):
    if sys.platform != "win32":
        return []
    try:
        cmd = f'netstat -ano | findstr LISTENING | findstr :{port}'
        output = subprocess.check_output(cmd, shell=True, text=True)
        pids = set()
        for line in output.strip().split('\n'):
            parts = line.split()
            if len(parts) >= 5:
                # The last item is the PID
                pids.add(parts[-1])
        return list(pids)
    except Exception:
        return []

def terminate_process_tree(pid):
    try:
        if sys.platform == "win32":
            subprocess.run(f"taskkill /F /T /PID {pid}", shell=True, capture_output=True)
        else:
            subprocess.run(f"kill -9 {pid}", shell=True, capture_output=True)
        return True
    except Exception:
        return False

def check_and_clear_ports(services):
    print(f"{BOLD}[1/4] Checking Port Availability...{RESET}")
    for service in services:
        port = service.get("port")
        if not port:
            continue
        
        if is_port_in_use(port):
            pids = get_pid_occupying_port(port)
            pid_str = f" (PIDs: {', '.join(pids)})" if pids else ""
            print(f"  {YELLOW}[!] Warning: Port {port} is occupied by another process{pid_str}.{RESET}")
            ans = input(f"      Do you want to terminate the conflicting process on port {port}? [Y/n]: ").strip().lower()
            if ans in ("", "y", "yes"):
                if pids:
                    for pid in pids:
                        print(f"      Killing process tree with PID {pid}...")
                        terminate_process_tree(pid)
                else:
                    # Generic kill if netstat PID lookup failed
                    try:
                        subprocess.run(f"taskkill /F /IM uvicorn.exe /FI \"PORT eq {port}\"", shell=True, capture_output=True)
                    except Exception:
                        pass
                
                # Verify port is now free
                time.sleep(1)
                if is_port_in_use(port):
                    print(f"  {RED}[x] Error: Port {port} could not be cleared. Startup may fail.{RESET}")
                else:
                    print(f"  {GREEN}[OK] Port {port} cleared successfully.{RESET}")
            else:
                print(f"  {YELLOW}[!] Skipping process termination. Startup might conflict.{RESET}")
        else:
            print(f"  {GREEN}[OK] Port {port} is free.{RESET}")
    print()

def load_env_file():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(root_dir, "backend", ".env")
    if not os.path.exists(env_path):
        env_path = os.path.join(root_dir, ".env")
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    parts = line.split("=", 1)
                    if len(parts) == 2:
                        key = parts[0].strip()
                        val = parts[1].strip().strip('"').strip("'")
                        os.environ[key] = val

def check_external_dependencies():
    load_env_file()
    print(f"{BOLD}[2/4] Checking External Databases & Dependencies...{RESET}")
    
    # Check Postgres
    postgres_port = 5432
    if is_port_in_use(postgres_port):
        print(f"  {GREEN}[OK] PostgreSQL Database detected on port {postgres_port}{RESET}")
    else:
        print(f"  {YELLOW}[!] Warning: PostgreSQL is not detected on port {postgres_port}. Please ensure it is running.{RESET}")
        
    # Check Redis (Upstash Cloud vs Local)
    broker_url = os.getenv("CELERY_BROKER_URL") or os.getenv("REDIS_URL")
    if broker_url:
        if "upstash" in broker_url or "rediss://" in broker_url or "cloud" in broker_url:
            print(f"  {GREEN}[OK] Upstash Redis configured via environment variable.{RESET}")
            redis_active = True
        else:
            redis_port = 6379
            redis_active = is_port_in_use(redis_port)
            if redis_active:
                print(f"  {GREEN}[OK] Local Redis Queue Server detected on port 6379.{RESET}")
            else:
                print(f"  {YELLOW}[!] Warning: Local Redis is not detected on port 6379. Celery task queues will not be started.{RESET}")
    else:
        redis_port = 6379
        redis_active = is_port_in_use(redis_port)
        if redis_active:
            print(f"  {GREEN}[OK] Local Redis Queue Server detected on port 6379.{RESET}")
        else:
            print(f"  {YELLOW}[!] Warning: Redis environment variables are missing and local Redis is not running.{RESET}")
    
    # Check npm
    try:
        subprocess.run("npm --version", shell=True, capture_output=True, check=True)
        print(f"  {GREEN}[OK] Node.js & npm environment detected.{RESET}")
    except Exception:
        print(f"  {RED}[x] Error: npm is not found in system PATH. Install Node.js v18+ to run the frontend.{RESET}")
        
    print()
    return redis_active

def start_service(service, root_dir, python_exe, celery_exe, uvicorn_exe):
    name = service["name"]
    cwd = os.path.join(root_dir, service["cwd"])
    command = service["command"].copy()
    
    # Resolve python/celery/uvicorn executable pathways
    if command[0] == "python":
        command[0] = python_exe
    elif command[0] == "celery":
        command[0] = celery_exe
    elif command[0] == "uvicorn":
        command[0] = uvicorn_exe
    
    # On Windows: convert npm to npm.cmd
    if command[0] == "npm" and sys.platform == "win32":
        command[0] = "npm.cmd"
        
    print(f"  [>] Launching {CYAN}{name}{RESET}...")
    
    # Create logs directory and log file
    logs_dir = os.path.join(root_dir, "logs")
    os.makedirs(logs_dir, exist_ok=True)
    safe_name = name.lower().replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_")
    log_path = os.path.join(logs_dir, f"{safe_name}.log")
    
    log_file = open(log_path, "w", encoding="utf-8")
    
    # Setup environment variables for activation
    env = os.environ.copy()
    
    # Add workspace root to PYTHONPATH so sibling modules can import each other
    env["PYTHONPATH"] = root_dir + os.pathsep + env.get("PYTHONPATH", "")
    
    if service["cwd"] != "frontend":
        venv_dir = os.path.join(root_dir, "myenv")
        if os.path.exists(venv_dir):
            venv_scripts = os.path.join(venv_dir, "Scripts")
            env["PATH"] = venv_scripts + os.pathsep + env.get("PATH", "")
            env["VIRTUAL_ENV"] = venv_dir

    creationflags = 0
    if sys.platform == "win32":
        # Run completely hidden in the background, no extra console windows
        creationflags = subprocess.CREATE_NO_WINDOW
        
    p = subprocess.Popen(
        command,
        cwd=cwd,
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        creationflags=creationflags,
        shell=(sys.platform == "win32")
    )
    return p

def verify_health_endpoint(url, timeout=120):
    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=1) as response:
                if response.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(1)
    return False

def main():
    start_timestamp = time.time()
    print_banner()
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Configure absolute paths for python and celery
    venv_python = os.path.join(root_dir, "myenv", "Scripts", "python.exe")
    python_exe = venv_python if os.path.exists(venv_python) else "python"
    
    venv_celery = os.path.join(root_dir, "myenv", "Scripts", "celery.exe")
    celery_exe = venv_celery if os.path.exists(venv_celery) else "celery"
    
    venv_uvicorn = os.path.join(root_dir, "myenv", "Scripts", "uvicorn.exe")
    uvicorn_exe = venv_uvicorn if os.path.exists(venv_uvicorn) else "uvicorn"
    
    # Target services definition
    services_to_run = [
        {
            "name": "OutreachX Backend API",
            "port": 8000,
            "cwd": "backend",
            "command": ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"],
            "health_endpoint": "http://127.0.0.1:8000/docs"
        },
        {
            "name": "Deva Backend 1 (Orchestrator)",
            "port": 8001,
            "cwd": "deva_backend_1",
            "command": ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
            "health_endpoint": "http://127.0.0.1:8001/docs"
        },
        {
            "name": "Deva Backend 2 (Research)",
            "port": 8002,
            "cwd": "deva_backend_2",
            "command": ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"],
            "health_endpoint": "http://127.0.0.1:8002/docs"
        },
        {
            "name": "Deva Backend 3 (Lead)",
            "port": 8003,
            "cwd": "deva_backend_3",
            "command": ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"],
            "health_endpoint": "http://127.0.0.1:8003/docs"
        },
        {
            "name": "Deva Backend 4 (Campaign & Template)",
            "port": 8004,
            "cwd": "deva_backend_4",
            "command": ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004", "--reload"],
            "health_endpoint": "http://127.0.0.1:8004/docs"
        },
        {
            "name": "Deva Backend 5 (General)",
            "port": 8005,
            "cwd": "deva_backend_5",
            "command": ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8005", "--reload"],
            "health_endpoint": "http://127.0.0.1:8005/docs"
        },
        {
            "name": "OutreachX Frontend (Next.js)",
            "port": 3000,
            "cwd": "frontend",
            "command": ["npm", "run", "dev"],
            "health_endpoint": "http://127.0.0.1:3000"
        }
    ]
    
    # 1. Clean conflicting ports
    check_and_clear_ports(services_to_run)
    
    # 2. Check Postgres and Redis dependencies
    redis_active = check_external_dependencies()
    
    # If Redis is running, append Celery tasks to services
    if redis_active:
        worker_command = ["celery", "-A", "tasks", "worker", "--loglevel=info"]
        if sys.platform == "win32":
            worker_command.extend(["--pool", "solo"])
            
        services_to_run.extend([
            {
                "name": "Celery Campaign Worker",
                "cwd": "backend",
                "command": worker_command,
                "is_celery": True
            },
            {
                "name": "Celery Beat Scheduler",
                "cwd": "backend",
                "command": ["celery", "-A", "tasks", "beat", "--loglevel=info"],
                "is_celery": True
            }
        ])
    
    # 3. Startup sequence
    print(f"{BOLD}[3/4] Launching Service Nodes...{RESET}")
    processes = []
    for s in services_to_run:
        proc = start_service(s, root_dir, python_exe, celery_exe, uvicorn_exe)
        processes.append((s, proc))
    print()
    
    # 4. Verification & Health Monitoring
    print(f"{BOLD}[4/4] Verifying Cluster Integrity...{RESET}")
    
    # Track backends first
    backend_failed = False
    for s, proc in processes:
        if s.get("port") and s["port"] != 3000:
            print(f"  Waiting for {CYAN}{s['name']}{RESET} (port {s['port']})...", end="", flush=True)
            healthy = verify_health_endpoint(s["health_endpoint"], timeout=45)
            if healthy:
                print(f" {GREEN}[OK]{RESET}")
            else:
                print(f" {RED}[FAILED]{RESET}")
                backend_failed = True
                
    if backend_failed:
        print(f"\n{RED}[!] One or more backends failed to start. Please check the individual console windows.{RESET}")
    else:
        print(f"  {GREEN}[OK] Backend Running{RESET}")
        
    # Track frontend Next.js
    print(f"  Waiting for {CYAN}Next.js Frontend{RESET} (port 3000)...", end="", flush=True)
    frontend_healthy = verify_health_endpoint("http://localhost:3000", timeout=30)
    if frontend_healthy:
        print(f" {GREEN}[OK]{RESET}")
        print(f"  {GREEN}[OK] Frontend Running{RESET}")
    else:
        print(f" {RED}[TIMEOUT]{RESET}")
        print(f"  {RED}[x] Frontend startup timed out or failed.{RESET}")
        
    # Open Browser
    if frontend_healthy:
        url = "http://localhost:3000"
        print(f"  Auto-launching default browser redirecting to {CYAN}{url}{RESET}...")
        webbrowser.open(url)
        print(f"  {GREEN}[OK] Browser Opened{RESET}")
        
    duration = time.time() - start_timestamp
    print(f"\n======================================================================")
    print(f"{GREEN}{BOLD}OutreachX Stack successfully initiated in {duration:.1f} seconds!{RESET}")
    print(f"Press {RED}{BOLD}Ctrl+C{RESET} in this terminal to shut down all services.")
    print(f"======================================================================")
    
    # Keep launcher open and wait for termination to kill process tree cleanly
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n\n{YELLOW}[!] Shutdown signal received. Terminating all services...{RESET}")
        for s, proc in processes:
            if proc:
                print(f"  Stopping {CYAN}{s['name']}{RESET} (PID {proc.pid})...")
                terminate_process_tree(proc.pid)
        print(f"{GREEN}[OK] Clean shutdown complete. All ports released.{RESET}")
        time.sleep(1)

if __name__ == "__main__":
    main()
