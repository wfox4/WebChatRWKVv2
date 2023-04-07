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
echo Installing requirements...
venv\Scripts\pip install -r requirements.txt || goto Error
pip install fastapi
pip install rwkv
pip install transformers
pip install rwkvstic --force-reinstall
pip install inquirer uvicorn
pip install websockets
pip install psutil requests requests-oauthlib tensorflow scipy
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/nightly/cu117

echo Running main.py...
python main.py || goto Error
pause
goto End

:Error
echo.
echo An error occurred during the process. Please check the error message above.
pause

:End
