# Complete Setup Guide - Step 2

This guide walks you through setting up the complete Stack: FastAPI backend + React frontend.

## Prerequisites

### System Requirements
- **Python**: 3.8 or higher
- **Node.js**: 16 or higher
- **npm**: 8 or higher (comes with Node.js)
- **Operating System**: Windows, macOS, or Linux

### Check Your Versions
```bash
python --version
node --version
npm --version
```

## Step-by-Step Installation

### 1. Backend Setup

#### Navigate to Project Root
```bash
cd E:\Money_Muling
```

#### Create Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

#### Install Python Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

**Packages installed:**
- fastapi>=0.109.0
- uvicorn[standard]>=0.27.0
- python-multipart>=0.0.6
- pandas>=2.1.0
- numpy>=1.24.0
- networkx>=3.0
- typing-extensions>=4.9.0

#### Verify Backend Installation
```bash
python -c "import fastapi, pandas, networkx; print('All packages installed!')"
```

### 2. Frontend Setup

#### Navigate to Frontend Directory
```bash
cd frontend
```

#### Install Node Dependencies
```bash
npm install
```

**Packages installed:**
- react & react-dom (UI framework)
- react-force-graph-2d (graph visualization)
- axios (HTTP client)
- vite (build tool)
- @vitejs/plugin-react (React support)

#### Verify Frontend Installation
```bash
npm list react react-force-graph-2d
```

#### Return to Root
```bash
cd ..
```

## Running the Application

### Option 1: Use the Startup Script (Windows)

#### Start Both Servers Automatically
```bash
start_all.bat
```

This will:
1. Open a new terminal window for the backend
2. Open a new terminal window for the frontend
3. Display URLs for both services

### Option 2: Manual Start (All Platforms)

#### Terminal 1: Start Backend
```bash
# Make sure you're in the project root
cd E:\Money_Muling

# Activate virtual environment if using one
# Windows: venv\Scripts\activate
# macOS/Linux: source venv/bin/activate

# Start FastAPI server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend is ready when you see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
```

#### Terminal 2: Start Frontend
```bash
# Open a NEW terminal
cd E:\Money_Muling\frontend

# Start Vite dev server
npm run dev
```

**Frontend is ready when you see:**
```
  VITE v5.0.0  ready in XXX ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

## Access the Application

### URLs

- **Frontend Application**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation (Swagger)**: http://localhost:8000/docs
- **API Documentation (ReDoc)**: http://localhost:8000/redoc

### Test the Setup

1. **Open Frontend**: http://localhost:3000
2. **Upload Sample CSV**: Click "Upload & Analyze" and select `sample_transactions.csv`
3. **View Graph**: Interactive graph should appear with 10 nodes

## Troubleshooting

### Backend Issues

#### "ModuleNotFoundError: No module named 'fastapi'"
**Solution:**
```bash
pip install -r requirements.txt
```

#### "Address already in use" (Port 8000)
**Solution:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
```

#### "No module named 'app'"
**Solution:**
Ensure you're running uvicorn from the project root (E:\Money_Muling), not from inside the app folder.

### Frontend Issues

#### "npm: command not found"
**Solution:**
Install Node.js from https://nodejs.org/

#### "Cannot find module 'react'"
**Solution:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

#### "EADDRINUSE: address already in use :::3000"
**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

#### Frontend shows "Network Error"
**Solution:**
1. Check if backend is running on port 8000
2. Check browser console for CORS errors
3. Verify Vite proxy settings in `vite.config.js`

### CORS Issues

If you see CORS errors in the browser console:

1. **Check Backend CORS Settings** in `app/main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Or ["http://localhost:3000"]
    ...
)
```

2. **Restart Backend** after changing CORS settings

### Package Version Conflicts

#### Pandas Build Errors on Windows
If pandas fails to install (C compiler error):
```bash
# Use a newer version that has pre-built wheels
pip install pandas>=2.1.0
```

#### React Version Conflicts
```bash
cd frontend
npm install --legacy-peer-deps
```

## Development Workflow

### Making Code Changes

#### Backend Changes
- Edit files in `app/` directory
- Server auto-reloads (if using `--reload`)
- Check terminal for errors
- Test at http://localhost:8000/docs

#### Frontend Changes
- Edit files in `frontend/src/`
- Vite auto-reloads browser
- Check browser console for errors
- Component changes reflect instantly

### Testing Your Changes

#### Backend Testing
```bash
# Test upload endpoint
curl -X POST "http://localhost:8000/upload" \
  -F "file=@sample_transactions.csv"

# Test graph endpoint
curl http://localhost:8000/graph-data
```

#### Frontend Testing
1. Open http://localhost:3000
2. Open browser DevTools (F12)
3. Check Console and Network tabs
4. Test all interactions

### Stopping the Servers

#### Stop Backend
Press `CTRL+C` in the backend terminal

#### Stop Frontend
Press `CTRL+C` in the frontend terminal

#### Deactivate Virtual Environment (if using)
```bash
deactivate
```

## Building for Production

### Backend Production
```bash
# Use gunicorn or similar ASGI server
pip install gunicorn
gunicorn app.main:app -k uvicorn.workers.UvicornWorker
```

### Frontend Production
```bash
cd frontend
npm run build
```

Build output in `frontend/dist/` can be served by any static file server.

## Environment Variables

### Backend (.env)
Create `.env` in project root:
```
API_HOST=0.0.0.0
API_PORT=8000
LOG_LEVEL=INFO
```

### Frontend (.env)
Create `.env` in `frontend/`:
```
VITE_API_URL=http://localhost:8000
```

## Next Steps

1. ✅ Backend and frontend running
2. ✅ Sample data uploaded successfully
3. ✅ Graph visualization working
4. ⏳ Ready for Step 3: Implement detection algorithms

## Getting Help

- Check **STEP2_GUIDE.md** for architecture details
- Check **README.md** for feature overview
- Review API docs at http://localhost:8000/docs
- Check browser console for frontend errors
- Check terminal for backend errors

---

**Happy Coding!** 🚀
