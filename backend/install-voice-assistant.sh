#!/bin/bash

# ============================================
# Voice Assistant Installation Script
# Auto-setup for Gemini AI integration
# ============================================

echo "🎤 Voice Assistant - Installation Script"
echo "========================================"
echo ""

# Step 1: Install Gemini Package
echo "📦 Installing @google/generative-ai..."
npm install @google/generative-ai

if [ $? -eq 0 ]; then
    echo "✅ Package installed successfully"
else
    echo "❌ Failed to install package"
    exit 1
fi

echo ""
echo "========================================="
echo "✅ Installation Complete!"
echo "========================================="
echo ""
echo "Next Steps:"
echo "1. Add GEMINI_API_KEY to .env file"
echo "   Get free key from: https://aistudio.google.com/app/apikey"
echo ""
echo "2. Restart your server:"
echo "   npm start"
echo ""
echo "3. Open Tourist Dashboard"
echo "   Look for 🎤 button in bottom-right corner"
echo ""
echo "4. Try a command like:"
echo "   'Book a guide for trekking in Lonavala'"
echo ""
echo "Questions? Check VOICE_ASSISTANT_IMPLEMENTATION_COMPLETE.md"
