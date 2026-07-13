"""
run.py — VisionVault AI Launcher
=================================
Run this single file to start the entire project:

    python run.py

It will:
  1. Start the FastAPI backend   (http://localhost:8002)
  2. Start the Vite frontend      (http://localhost:5173)
  3. Wait for both to be ready
  4. Open the browser automatically
  5. Keep both servers alive — press Ctrl+C to stop everything
"""

import os
import sys
import time
import signal
import socket
import subprocess
import threading
import webbrowser
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).resolve().parent
BACKEND    = ROOT / "backend"
FRONTEND   = ROOT / "frontend"

# Python inside the venv (falls back to current interpreter if venv missing)
VENV_PY = BACKEND / "venv" / "Scripts" / "python.exe"
if not VENV_PY.exists():
    VENV_PY = Path(sys.executable)

BACKEND_PORT  = 8002
FRONTEND_PORT = 5173
FRONTEND_URL  = f"http://localhost:{FRONTEND_PORT}"

# ── Colour helpers ─────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
CYAN   = "\033[96m"
YELLOW = "\033[93m"
RED    = "\033[91m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def log(color: str, tag: str, msg: str):
    print(f"{color}{BOLD}[{tag}]{RESET} {msg}")

# ── Port helpers ───────────────────────────────────────────────────────────────
def port_open(port: int) -> bool:
    """Return True if something is already listening on *port*."""
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=0.5):
            return True
    except OSError:
        return False


def wait_for_port(port: int, timeout: float = 60.0, label: str = "") -> bool:
    """Block until *port* is open or *timeout* seconds elapse."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        if port_open(port):
            return True
        time.sleep(0.5)
    log(RED, "ERROR", f"{label} did not start within {timeout:.0f}s")
    return False

# ── Stream reader (pipe stdout/stderr to our console) ─────────────────────────
def _stream(proc: subprocess.Popen, prefix: str, color: str):
    for line in iter(proc.stdout.readline, b""):
        text = line.decode(errors="replace").rstrip()
        if text:
            print(f"{color}[{prefix}]{RESET} {text}")


# ── Process registry (so Ctrl+C kills everything) ─────────────────────────────
_procs: list[subprocess.Popen] = []

def _kill_all(*_):
    print(f"\n{YELLOW}Shutting down VisionVault AI...{RESET}")
    for p in _procs:
        try:
            p.terminate()
        except Exception:
            pass
    time.sleep(1)
    for p in _procs:
        try:
            p.kill()
        except Exception:
            pass
    print(f"{GREEN}Goodbye!{RESET}")
    sys.exit(0)


signal.signal(signal.SIGINT,  _kill_all)
signal.signal(signal.SIGTERM, _kill_all)


# ── Main ───────────────────────────────────────────────────────────────────────
def main():
    os.system("")   # enable ANSI on Windows

    print(f"""
{CYAN}{BOLD}╔══════════════════════════════════════════════════╗
║          VisionVault AI — Local Launcher         ║
╚══════════════════════════════════════════════════╝{RESET}
""")

    # ── 1. Backend ─────────────────────────────────────────────────────────────
    if port_open(BACKEND_PORT):
        log(YELLOW, "Backend", f"Port {BACKEND_PORT} already in use — skipping start")
        backend_proc = None
    else:
        log(CYAN, "Backend", f"Starting FastAPI on http://localhost:{BACKEND_PORT} ...")
        backend_proc = subprocess.Popen(
            [
                str(VENV_PY), "-m", "uvicorn",
                "app.main:app",
                "--host", "0.0.0.0",
                "--port", str(BACKEND_PORT),
                "--reload",
            ],
            cwd=str(BACKEND),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        _procs.append(backend_proc)
        threading.Thread(
            target=_stream, args=(backend_proc, "Backend", CYAN), daemon=True
        ).start()

        if not wait_for_port(BACKEND_PORT, timeout=30, label="Backend"):
            _kill_all()

        log(GREEN, "Backend", f"Ready → http://localhost:{BACKEND_PORT}")

    # ── 2. Frontend ────────────────────────────────────────────────────────────
    # npm must be on PATH
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    if port_open(FRONTEND_PORT):
        log(YELLOW, "Frontend", f"Port {FRONTEND_PORT} already in use — skipping start")
        frontend_proc = None
    else:
        log(CYAN, "Frontend", "Starting Vite dev server ...")
        frontend_proc = subprocess.Popen(
            [npm_cmd, "run", "dev"],
            cwd=str(FRONTEND),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            shell=False,
        )
        _procs.append(frontend_proc)
        threading.Thread(
            target=_stream, args=(frontend_proc, "Frontend", GREEN), daemon=True
        ).start()

        # Vite may pick a different port if 5173 is busy — detect it
        detected_url = FRONTEND_URL
        deadline = time.time() + 30
        while time.time() < deadline:
            if port_open(FRONTEND_PORT):
                break
            # Try the next port Vite usually falls back to
            for fallback in range(FRONTEND_PORT, FRONTEND_PORT + 10):
                if port_open(fallback):
                    detected_url = f"http://localhost:{fallback}"
                    break
            if detected_url != FRONTEND_URL:
                break
            time.sleep(0.5)

        log(GREEN, "Frontend", f"Ready → {detected_url}")

    # ── 3. Open browser ────────────────────────────────────────────────────────
    time.sleep(1.0)   # tiny grace period so the page loads cleanly
    open_url = FRONTEND_URL
    # detect actual running port
    for port in range(FRONTEND_PORT, FRONTEND_PORT + 10):
        if port_open(port):
            open_url = f"http://localhost:{port}"
            break

    log(YELLOW, "Browser", f"Opening {open_url} ...")
    webbrowser.open(open_url)

    # ── 4. Status banner ───────────────────────────────────────────────────────
    print(f"""
{GREEN}{BOLD}╔══════════════════════════════════════════════════╗
║         VisionVault AI is running!               ║
╠══════════════════════════════════════════════════╣
║  App      →  {open_url:<35}║
║  API      →  http://localhost:{BACKEND_PORT}/docs{' ' * 13}║
║  Health   →  http://localhost:{BACKEND_PORT}/health{' ' * 11}║
╠══════════════════════════════════════════════════╣
║  Press  Ctrl+C  to stop all servers              ║
╚══════════════════════════════════════════════════╝{RESET}
""")

    # ── 5. Keep alive ─────────────────────────────────────────────────────────
    try:
        while True:
            # Restart either process if it dies unexpectedly
            for proc in list(_procs):
                if proc.poll() is not None:
                    log(RED, "Watchdog", f"A server process exited (code {proc.returncode}). Shutting down.")
                    _kill_all()
            time.sleep(2)
    except KeyboardInterrupt:
        _kill_all()


if __name__ == "__main__":
    main()
