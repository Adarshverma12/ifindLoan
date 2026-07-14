@echo off
cd /d "%~dp0"
echo Starting local preview at http://localhost:5599/
echo Press Ctrl+C to stop.
start "" "http://localhost:5599/"
python -m http.server 5599
pause
