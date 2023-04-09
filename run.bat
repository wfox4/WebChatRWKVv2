@echo off
set "VENV_NAME=chatbot_env_new"
set LIB=%LIB%;C:\Users\thewh\AppData\Local\Programs\Python\Python310\libs

echo Setting up the virtual environment...
python -m venv venv || goto Error

if not exist "%VENV_NAME%\Scripts" (
    echo Creating virtual environment...
    python -m venv %VENV_NAME%
)
echo Activating virtual environment...
call %VENV_NAME%\Scripts\activate

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
