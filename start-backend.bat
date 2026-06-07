@echo off
title RAG Chatbot - Backend
cd /d "%~dp0backend"
echo Starting RAG Chatbot Backend...
call venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
pause
