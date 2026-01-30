#!/bin/bash
# Start both frontend and backend services

echo "=========================================="
echo "STARTING PERSPECTIVE SERVICES"
echo "=========================================="

# Backend
echo ""
echo "1. Starting Backend..."
cd /root/perspective2/perspective/backend

# Kill any existing backend
pkill -9 -f "python.*main" 2>/dev/null
sleep 2

# Start backend
source venv/bin/activate
nohup python3 -m app.main > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend started (PID: $BACKEND_PID)"
echo "   Log: /root/perspective2/perspective/backend/logs/backend.log"
echo "   Health: http://127.0.0.1:8000/api/health"

# Wait for backend to start
echo "   Waiting for backend to be ready..."
sleep 5

# Check backend health
HEALTH=$(curl -s http://127.0.0.1:8000/api/health)
if echo "$HEALTH" | grep -q "healthy"; then
    echo "   ✅ Backend is healthy"
else
    echo "   ❌ Backend health check failed"
    echo "   Response: $HEALTH"
fi

# Frontend
echo ""
echo "2. Starting Frontend..."
cd /root/perspective2/perspective

# Start frontend
nohup npm run dev > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend started (PID: $FRONTEND_PID)"
echo "   Log: /root/perspective2/perspective/logs/frontend.log"
echo "   URL: http://localhost:3000"

# Summary
echo ""
echo "=========================================="
echo "SERVICES STARTED"
echo "=========================================="
echo ""
echo "Backend:"
echo "  - PID: $BACKEND_PID"
echo "  - Health: http://127.0.0.1:8000/api/health"
echo "  - Diagnostic: http://127.0.0.1:8000/api/diagnose"
echo ""
echo "Frontend:"
echo "  - PID: $FRONTEND_PID"
echo "  - URL: http://localhost:3000"
echo ""
echo "Public Access:"
echo "  - IP: http://65.108.67.204"
echo "  - Domain: https://roancurtis.com"
echo ""
echo "To stop services:"
echo "  - Backend: kill $BACKEND_PID"
echo "  - Frontend: kill $FRONTEND_PID"
echo ""
echo "Or stop all: kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "View logs:"
echo "  - Backend: tail -f /root/perspective2/perspective/backend/logs/backend.log"
echo "  - Frontend: tail -f /root/perspective2/perspective/logs/frontend.log"
echo ""
