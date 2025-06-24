@echo off
cd /d D:\tts_app

REM Запускаем сервер в фоне
start "TTS Server" cmd /c "python app.py"

REM Даём ему 2 секунды на запуск
timeout /t 2 >nul

REM Открываем сайт
start http://localhost:5000
