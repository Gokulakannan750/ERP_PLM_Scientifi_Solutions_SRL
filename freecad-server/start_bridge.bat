@echo off
set "FREECAD_PYTHON=C:\Program Files\FreeCAD 1.1\bin\python.exe"
if not exist "%FREECAD_PYTHON%" (
    echo Error: FreeCAD Python not found at %FREECAD_PYTHON%
    pause
    exit /b 1
)
"%FREECAD_PYTHON%" app.py
pause
