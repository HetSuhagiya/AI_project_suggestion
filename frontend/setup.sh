#!/bin/bash

echo "🚀 Setting up JobScraperAI Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🎉 Frontend setup complete!"
    echo ""
    echo "To start the frontend:"
    echo "  npm start"
    echo ""
    echo "To build for production:"
    echo "  npm run build"
    echo ""
    echo "Make sure the backend API server is running on http://localhost:5000"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi 