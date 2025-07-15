#!/bin/bash

# Lyra AI Assistant Launcher
echo "🚀 Starting Lyra AI Assistant..."

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Change to project directory
cd "$DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies first..."
    npm install
    
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies. Please run setup.sh first."
        exit 1
    fi
fi

# Check if main.js exists
if [ ! -f "src/main.js" ]; then
    echo "❌ Main application file not found. Please ensure all files are present."
    exit 1
fi

# Start the application
echo "✨ Launching Lyra..."
npm start

# If we get here, the app was closed
echo "👋 Lyra AI Assistant has been closed."
