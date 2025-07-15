#!/bin/bash

echo "🚀 Setting up Lyra AI Assistant for Linux Mint..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Installing Node.js..."
    
    # Update package list
    sudo apt update
    
    # Install Node.js and npm
    sudo apt install -y nodejs npm
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        echo "❌ Failed to install Node.js. Please install it manually and try again."
        exit 1
    fi
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Make sure you're in the Lyra project directory."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies. Please check your internet connection and try again."
    exit 1
fi

# Create desktop entry
echo "🖥️ Creating desktop entry..."
cat > ~/.local/share/applications/lyra-ai.desktop << EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=Lyra AI Assistant
Comment=AI Assistant for Linux Mint
Exec=$(pwd)/start.sh
Icon=$(pwd)/assets/icon.png
Terminal=false
StartupNotify=true
Categories=Utility;Office;
EOF

# Create start script
echo "📝 Creating start script..."
cat > start.sh << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"
npm start
EOF

chmod +x start.sh

# Create assets directory and icon
mkdir -p assets

# Create a simple SVG icon and convert to PNG
cat > assets/icon.svg << 'EOF'
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="32" cy="32" r="30" fill="url(#grad)"/>
  <text x="32" y="40" font-family="serif" font-size="24" fill="white" text-anchor="middle">✨</text>
</svg>
EOF

# Convert SVG to PNG if ImageMagick is available
if command -v convert &> /dev/null; then
    convert assets/icon.svg assets/icon.png
    echo "✅ Icon created"
else
    echo "⚠️ ImageMagick not found. Using SVG icon."
    cp assets/icon.svg assets/icon.png
fi

# Set up autostart (optional)
read -p "🔄 Do you want Lyra to start automatically when you log in? (y/n): " autostart
if [[ $autostart =~ ^[Yy]$ ]]; then
    mkdir -p ~/.config/autostart
    cp ~/.local/share/applications/lyra-ai.desktop ~/.config/autostart/
    echo "✅ Autostart enabled"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 How to use Lyra AI Assistant:"
echo "1. Run './start.sh' to start the application"
echo "2. A floating icon will appear on your screen"
echo "3. Select any text in any application (Ctrl+C to copy)"
echo "4. Click the floating icon to interact with Lyra"
echo "5. Use Ctrl+Shift+L as a global shortcut to capture selected text"
echo ""
echo "🚀 To start Lyra now, run: ./start.sh"
echo "🔧 To build a distributable package, run: npm run build"
echo ""
echo "💡 Tips:"
echo "   - Drag the floating icon to move it around"
echo "   - Single words will get definitions and examples"
echo "   - Multiple words will get summaries"
echo "   - You can ask follow-up questions about selected text"
echo ""
