# ✨ Lyra AI Assistant

A modern AI assistant application for Linux Mint that provides contextual help with selected text through an elegant floating interface.

## 🌟 Features

- **Persistent Floating Icon**: Always-visible, draggable icon that stays on top of all applications
- **Smart Text Processing**: Automatically provides definitions for single words and summaries for longer text
- **Cross-Application Support**: Works with any application that supports text selection (browsers, PDFs, documents, etc.)
- **Modern UI**: Beautiful, translucent interface with smooth animations
- **Conversation Memory**: Remembers the last 10 messages for contextual conversations
- **Powered by Groq**: Uses Llama 3 70B model for high-quality responses

## Quick Start

### Prerequisites

- Linux Mint (or any Ubuntu-based distribution)
- Node.js 16+ and npm
- Internet connection for AI responses

### Installation

1. **Download and extract the Lyra AI Assistant files to a directory of your choice**

2. **Navigate to the project directory:**

   ```bash
   cd lyra-ai-assistant
   ```

3. **Run the setup script:**

   ```bash
   chmod +x setup.sh
   ./setup.sh
   ```

4. **Start the application:**
   ```bash
   ./start.sh
   ```

### Manual Installation

If you prefer to install manually:

```bash
# Install Node.js if not already installed
sudo apt update
sudo apt install nodejs npm

# Install dependencies
npm install

# Start the application
npm start
```

## 🎯 How to Use

### Basic Usage

1. **Start Lyra**: Run `./start.sh` or `npm start`
2. **Floating Icon**: A magical ✨ icon appears on your screen (usually bottom-right)
3. **Select Text**: Highlight any text in any application
4. **Interact**: Click the floating icon to open the chat interface
5. **Get Help**: Lyra automatically processes your selected text:
   - **Single word** → Definition and examples
   - **Multiple words** → Summary and key points

### Advanced Features

- **Manual Text Capture**: Press `Ctrl+Shift+L` to capture currently selected text
- **Follow-up Questions**: Ask additional questions about the selected text
- **Drag Icon**: Move the floating icon anywhere on your screen
- **Conversation History**: Lyra remembers your last 10 interactions

### Keyboard Shortcuts

- `Ctrl+Shift+L` - Capture selected text globally
- `Enter` - Send message in chat
- `Shift+Enter` - New line in message input
- `Esc` - Close chat window

## 🎨 Interface

### Floating Icon States

- **Default** (Purple gradient): Ready to help
- **Active** (Green gradient with pulse): Text selected, ready to process
- **Notification Dot**: Appears when new text is selected

### Chat Window

- **Modern Design**: Translucent background with blur effects
- **Smart Sizing**: Adjustable height, optimized for readability
- **Typing Indicators**: Shows when Lyra is thinking
- **Smooth Animations**: Polished user experience

## ⚙️ Configuration

### API Configuration

The application uses Groq API with Llama 3 70B model. The API key is pre-configured, but you can modify it in `src/chat-script.js`:

```javascript
const GROQ_API_KEY = "your-api-key-here";
const MODEL_NAME = "llama3-70b-8192";
```

### Startup Options

- **Auto-start**: The setup script can configure Lyra to start automatically on login
- **Manual start**: Use `./start.sh` or add to your startup applications

## 🛠️ Development

### Project Structure

```
lyra-ai-assistant/
├── src/
│   ├── main.js              # Electron main process
│   ├── floating-icon.html   # Floating icon interface
│   ├── chat-window.html     # Chat interface
│   └── chat-script.js       # Chat functionality & API calls
├── assets/
│   └── icon.png             # Application icon
├── package.json             # Dependencies and scripts
├── setup.sh                 # Installation script
├── start.sh                 # Launch script
└── README.md               # This file
```

### Available Scripts

```bash
npm start          # Start the application
npm run dev        # Start in development mode
npm run build      # Build distributable package
npm install        # Install dependencies
```

### Building Distribution Package

```bash
npm run build
```

This creates a distributable AppImage in the `dist/` directory.

## 🔧 Troubleshooting

### Common Issues

**Floating icon not appearing:**

- Check if the application started successfully
- Look for error messages in the terminal
- Ensure no other overlay applications are interfering

**Text selection not working:**

- Try using `Ctrl+Shift+L` after selecting text
- Ensure text is properly copied to clipboard
- Some applications may require explicit copy (Ctrl+C)

**API errors:**

- Check internet connection
- Verify Groq API service status
- Rate limiting may apply - wait a moment and try again

**Permission issues:**

- Ensure scripts are executable: `chmod +x setup.sh start.sh`
- Check file permissions in the project directory

### System Requirements

- **OS**: Linux Mint 20+ (or Ubuntu 20.04+)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 200MB for application and dependencies
- **Network**: Internet connection required for AI responses

## 🤝 Contributing

Feel free to contribute to Lyra AI Assistant! Here are some ways you can help:

- Report bugs or suggest features
- Improve the user interface
- Add support for additional languages
- Optimize performance
- Enhance text selection detection

**Personal Project Lyra AI Assistant! ✨**
