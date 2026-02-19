@echo off
echo ============================================
echo   Financial Crime Detection - Step 2
echo   Starting Backend + Frontend
echo ============================================
echo.

REM Start backend in new window
echo Starting backend server...
start "Backend - FastAPI" cmd /k "cd /d %~dp0 && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend in new window
echo Starting frontend server...
start "Frontend - React" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ============================================
echo   Both servers are starting...
echo ============================================
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:3000
echo   API Docs: http://localhost:8000/docs
echo ============================================
echo.
pause
