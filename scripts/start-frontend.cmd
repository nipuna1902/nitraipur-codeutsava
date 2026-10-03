@echo off
cd /d "%~dp0..\frontend"
"C:\Program Files\nodejs\node.exe" node_modules\next\dist\bin\next start --hostname 127.0.0.1 --port 3000
