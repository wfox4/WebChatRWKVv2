@echo off
set "VENV_NAME=venv"
set "PYTHON_PATH=C:\Users\thewh\AppData\Local\Programs\Python\Python310\python.exe"
set LIB=%LIB%;C:\Users\thewh\AppData\Local\Programs\Python\Python310\libs

echo Setting up the virtual environment...
if not exist "%VENV_NAME%\Scripts" (
    echo Creating virtual environment...
    "%PYTHON_PATH%" -m venv %VENV_NAME%
)

echo Activating virtual environment...
call %VENV_NAME%\Scripts\activate

REM Update PATH variable to include virtual environment executables
set PATH=%VENV_NAME%\Scripts;%PATH%

set PYTHONPATH=%PYTHONPATH%;%VENV_NAME%\Lib\site-packages\rwkvstic

echo Running main.py...
python main.py || goto Error
pause
goto End

:Error
echo.
echo An error occurred during the process. Please check the error message above.
pause

:End
