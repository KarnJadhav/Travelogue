@echo off
REM ============================================
REM Voice Assistant Installation Script
REM Windows Batch Version
REM ============================================

echo.
echo 🎤 Voice Assistant - Installation Script
echo =========================================
echo.

REM Step 1: Install Gemini Package
echo 📦 Installing @google/generative-ai...
call npm install @google/generative-ai

if %errorlevel% neq 0 (
    echo ❌ Failed to install package
    pause
    exit /b 1
)

echo ✅ Package installed successfully
echo.

REM Step 2: Check for .env file
if not exist .env (
    echo ⚠️  .env file not found!
    echo Creating .env file...
    (
        echo # Gemini API Key
        echo GEMINI_API_KEY=your_api_key_here
    ) > .env
    echo Created .env file - please add your Gemini API key
)

echo.
echo =========================================
echo ✅ Installation Complete!
echo =========================================
echo.
echo Next Steps:
echo.
echo 1. Add GEMINI_API_KEY to .env file
echo    Get free key from: https://aistudio.google.com/app/apikey
echo.
echo 2. Restart your server:
echo    npm start
echo.
echo 3. Open Tourist Dashboard
echo    Look for 🎤 button in bottom-right corner
echo.
echo 4. Try a command like:
echo    "Book a guide for trekking in Lonavala"
echo.
echo Questions? Check VOICE_ASSISTANT_IMPLEMENTATION_COMPLETE.md
echo.
pause
