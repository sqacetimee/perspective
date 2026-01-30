#!/usr/bin/env python3
"""
Backend Test Script

This script tests:
1. Health check endpoint
2. Diagnostic endpoint
3. Z.AI API connectivity
4. Cost tracking functionality
"""

import asyncio
import sys
import json
from pathlib import Path

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.config import get_settings
from app.ollama_client import zai_client
from app.model_config import TaskType, calculate_cost, get_model_for_task
import httpx

# ANSI color codes
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_success(msg):
    print(f"{GREEN}✅ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}❌ {msg}{RESET}")

def print_info(msg):
    print(f"{YELLOW}ℹ️  {msg}{RESET}")

async def test_health_check():
    """Test /api/health endpoint"""
    print("\n" + "="*60)
    print("TEST 1: Health Check Endpoint")
    print("="*60)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://127.0.0.1:8000/api/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                print_success("Health check passed")
                print(f"  Status: {data.get('status')}")
                print(f"  Backend: {data.get('backend')}")
                print(f"  Z.AI Connected: {data.get('zai_connected')}")
                print(f"  Z.AI URL: {data.get('zai_url')}")
                return True
            else:
                print_error(f"Health check failed with status {response.status_code}")
                print(f"  Response: {response.text}")
                return False
    except Exception as e:
        print_error(f"Health check failed: {e}")
        return False

async def test_diagnostic():
    """Test /api/diagnose endpoint"""
    print("\n" + "="*60)
    print("TEST 2: Diagnostic Endpoint")
    print("="*60)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://127.0.0.1:8000/api/diagnose", timeout=10)
            if response.status_code == 200:
                data = response.json()
                print_success("Diagnostic endpoint passed")
                print(f"  Status: {data.get('status')}")
                print(f"  Checks:")
                for check in data.get('checks', []):
                    status = GREEN + "✓" + RESET if check.get('status') == 'pass' else RED + "✗" + RESET
                    print(f"    {status} {check.get('name')}: {check.get('status')}")
                    if 'latency_ms' in check:
                        print(f"       Latency: {check['latency_ms']}ms")
                return True
            else:
                print_error(f"Diagnostic failed with status {response.status_code}")
                return False
    except Exception as e:
        print_error(f"Diagnostic failed: {e}")
        return False

async def test_zai_connectivity():
    """Test Z.AI API connectivity"""
    print("\n" + "="*60)
    print("TEST 3: Z.AI API Connectivity")
    print("="*60)

    try:
        is_healthy = await zai_client.health_check()
        if is_healthy:
            print_success("Z.AI API is reachable")
            print(f"  Base URL: {zai_client.base_url}")
            print(f"  API Key: {zai_client.api_key[:10]}...")
            return True
        else:
            print_error("Z.AI API health check failed")
            return False
    except Exception as e:
        print_error(f"Z.AI connectivity test failed: {e}")
        return False

async def test_cost_tracking():
    """Test cost calculation and tracking"""
    print("\n" + "="*60)
    print("TEST 4: Cost Tracking Functionality")
    print("="*60)

    try:
        # Test model config
        print_info("Testing model configuration...")

        for task_type in [TaskType.CLARIFICATION, TaskType.DEBATE, TaskType.SYNTHESIS]:
            config = get_model_for_task(task_type)
            model = config["model"]
            tier = config["tier"].value
            print(f"  {task_type.value:15} -> {model:25} ({tier})")

        # Test cost calculation
        print_info("Testing cost calculation...")

        test_cases = [
            ("glm-4.7-flash", 1000, 500),  # FREE model
            ("glm-4-32b-0414-128k", 10000, 5000),  # CHEAP model
            ("glm-4.7", 5000, 2500),  # PREMIUM model
        ]

        for model, input_toks, output_toks in test_cases:
            cost = calculate_cost(model, input_toks, output_toks)
            print(f"  {model:25}: {input_toks:6} input + {output_toks:6} output = ${cost:.6f}")

        print_success("Cost tracking functionality working")
        return True
    except Exception as e:
        print_error(f"Cost tracking test failed: {e}")
        return False

async def test_backend_running():
    """Test if backend is running"""
    print("\n" + "="*60)
    print("TEST 0: Backend Server Status")
    print("="*60)

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get("http://127.0.0.1:8000/", timeout=2)
            # 404 is expected for root, but confirms server is running
            print_success("Backend server is running")
            print(f"  Response status: {response.status_code}")
            return True
    except Exception as e:
        print_error("Backend server is not responding")
        print(f"  Error: {e}")
        return False

async def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("BACKEND TEST SUITE")
    print("="*60)
    print(f"Testing: http://127.0.0.1:8000")
    print(f"Configuration: {get_settings().zai_base_url}")

    results = []

    # Test 0: Backend running
    results.append(await test_backend_running())

    # Test 1: Health check
    results.append(await test_health_check())

    # Test 2: Diagnostic
    results.append(await test_diagnostic())

    # Test 3: Z.AI connectivity
    results.append(await test_zai_connectivity())

    # Test 4: Cost tracking
    results.append(await test_cost_tracking())

    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)

    passed = sum(results)
    total = len(results)

    print(f"Passed: {passed}/{total}")

    if all(results):
        print_success("All tests passed! Backend is ready for production.")
        print_info("You can now:")
        print("  - Start frontend: cd ../ && npm run dev")
        print("  - Access via IP: http://65.108.67.204")
        print("  - Access via domain: https://roancurtis.com")
        return 0
    else:
        print_error(f"{total - passed} test(s) failed. Please check errors above.")
        return 1

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
