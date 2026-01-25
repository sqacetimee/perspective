#!/usr/bin/env python3
import os
import sys
import subprocess
import requests
import json
from pathlib import Path
from datetime import datetime

# Configuration
BACKEND_DIR = Path("/root/perspective/backend")
LOG_DIR = BACKEND_DIR / "logs"
ENV_FILE = BACKEND_DIR / ".env"

RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def log(msg, color=RESET):
    print(f"{color}{msg}{RESET}")

def check_service():
    log("--- Checking Service Status ---", YELLOW)
    try:
        result = subprocess.run(
            ["systemctl", "is-active", "perspective-backend"], 
            capture_output=True, text=True
        )
        status = result.stdout.strip()
        if status == "active":
            log(f"Service 'perspective-backend': {status}", GREEN)
        else:
            log(f"Service 'perspective-backend': {status}", RED)
            return False
    except Exception as e:
        log(f"Failed to check service: {e}", RED)
        return False
    return True

def scan_logs():
    log("\n--- Scanning Logs for Eras ---", YELLOW)
    error_log = LOG_DIR / "backend-error.log"
    if not error_log.exists():
        log("No error log found.", GREEN)
        return

    try:
        # Get last 50 lines
        lines = subprocess.check_output(
            ["tail", "-n", "50", str(error_log)], text=True
        ).splitlines()
        
        errors_found = False
        for line in lines:
            if "Error" in line or "Exception" in line or "Traceback" in line:
                log(f"Found in logs: {line}", RED)
                errors_found = True
        
        if not errors_found:
            log("No recent errors found in backend-error.log", GREEN)
            
    except Exception as e:
        log(f"Failed to read logs: {e}", RED)

def check_connectivity():
    log("\n--- Checking Connectivity ---", YELLOW)
    
    # 1. Local API
    try:
        r = requests.get("http://127.0.0.1:8000/api/health", timeout=2)
        if r.status_code == 200:
            log("Local API (port 8000): Accessible", GREEN)
            data = r.json()
            log(f"API Health JSON: {json.dumps(data, indent=2)}")
        else:
            log(f"Local API (port 8000): Returned {r.status_code}", RED)
    except Exception as e:
        log(f"Local API (port 8000): Unreachable ({e})", RED)

    # 2. Ollama (read from .env)
    ollama_url = None
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                if line.startswith("OLLAMA_BASE_URL="):
                    ollama_url = line.strip().split("=", 1)[1]
                    break
    
    if ollama_url:
        try:
            log(f"Checking Ollama at {ollama_url}...", YELLOW)
            r = requests.get(f"{ollama_url}/api/tags", timeout=5)
            if r.status_code == 200:
                log("Ollama: Reachable", GREEN)
            else:
                log(f"Ollama: Returned {r.status_code}", RED)
        except Exception as e:
            log(f"Ollama: Unreachable ({e})", RED)
            log("  -> Check Tailscale on both machines.", YELLOW)
            log("  -> Check if Ollama is running on laptop.", YELLOW)
    else:
        log("Could not find OLLAMA_BASE_URL in .env", RED)

def main():
    log("=== Perspective System Diagnostic Scan ===\n", YELLOW)
    check_service()
    scan_logs()
    check_connectivity()
    log("\n=== Scan Complete ===", YELLOW)

if __name__ == "__main__":
    main()
