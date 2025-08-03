const { app, BrowserWindow, ipcMain, globalShortcut, clipboard, screen } = require('electron');
const path = require('path');
const axios = require('axios');
const { translate } = require('@vitalets/google-translate-api');
const mousePosition = require('mouse-position');
require('dotenv').config();

let floatingWindow;
let chatWindow;
let selectedText = '';
let messageHistory = [];

// Supported languages for translation
const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'ru', name: 'Russian' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'ar', name: 'Arabic' }
];

let translationPopup = null;
let translationTimer = null;

// Helper function to strip HTML and get clean text
function stripHtmlToText(html) {
  if (!html) return '';
  
  // Remove script and style elements completely
  let text = html.replace(/<(script|style)[^>]*>.*?<\/(script|style)>/gis, '');
  
  // Replace block elements with line breaks
  text = text.replace(/<\/(div|p|br|h[1-6]|li|tr)>/gi, '\n');
  text = text.replace(/<(div|p|br|h[1-6]|li|tr)[^>]*>/gi, '\n');
  
  // Remove all other HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ')
             .replace(/&amp;/g, '&')
             .replace(/&lt;/g, '<')
             .replace(/&gt;/g, '>')
             .replace(/&quot;/g, '"')
             .replace(/&#39;/g, "'");
  
  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n')
             .replace(/\s+/g, ' ')
             .trim();
  
  return text;
}

// Helper function to detect if text is code/HTML that shouldn't be processed
function isCodeOrHTML(text) {
  if (!text) return true;
  
  // Check if it looks like code or HTML
  const codeIndicators = [
    /<[a-z][^>]*>/i,  // HTML tags
    /function\s*\(/,   // JavaScript functions
    /class\s+\w+/,     // Class declarations
    /import\s+.*from/, // Import statements
    /console\./,       // Console statements
    /document\./,      // DOM access
    /window\./,        // Window object
    /\$\(/,           // jQuery
    /\{[\s]*["\w]+\s*:/, // JSON-like objects
  ];
  
  const codeRatio = (text.match(/[{}();]/g) || []).length / text.length;
  const htmlRatio = (text.match(/[<>]/g) || []).length / text.length;
  
  // If it's mostly code/HTML syntax, skip it
  if (codeRatio > 0.1 || htmlRatio > 0.1) return true;
  
  // Check specific patterns
  return codeIndicators.some(pattern => pattern.test(text));
}

// Create floating icon window
function createFloatingWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  floatingWindow = new BrowserWindow({
    width: 60,
    height: 60,
    x: width - 80,
    y: height - 80,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  floatingWindow.loadFile('src/floating-icon.html');
  floatingWindow.setIgnoreMouseEvents(false);
  
  // Make window draggable
  floatingWindow.on('will-move', (event, bounds) => {
    // Keep window within screen bounds
    const display = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = display.workAreaSize;
    
    if (bounds.x < 0) bounds.x = 0;
    if (bounds.y < 0) bounds.y = 0;
    if (bounds.x + bounds.width > screenWidth) bounds.x = screenWidth - bounds.width;
    if (bounds.y + bounds.height > screenHeight) bounds.y = screenHeight - bounds.height;
  });
}

// Create chat popup window
function createChatWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  chatWindow = new BrowserWindow({
    width: 450,
    height: 600,
    x: width - 470,
    y: height - 620,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    transparent: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  chatWindow.loadFile('src/chat-window.html');
  chatWindow.on('ready-to-show', () => {
    chatWindow.show();
    console.log('Chat window is ready to show');
  });
  
  chatWindow.on('blur', () => {
    // Auto-hide chat window when it loses focus (optional)
    // chatWindow.hide();
  });
}

// Create translation popup window
function createTranslationPopup(x, y) {
    if (translationPopup && !translationPopup.isDestroyed()) {
        translationPopup.destroy();
    }

    translationPopup = new BrowserWindow({
        width: 300,
        height: 120,
        x: x,
        y: y + 20, // Show below cursor
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        transparent: true,
        show: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    translationPopup.loadFile('src/translation-popup.html');
    
    // Hide popup when clicking outside
    translationPopup.on('blur', () => {
        translationPopup.destroy();
    });
}

// Monitor clipboard for text selection
function monitorTextSelection() {
  let lastClipboard = '';
  
  setInterval(async () => {
    const currentClipboard = clipboard.readText();
    const mousePos = mousePosition();
    
    if (currentClipboard && 
        currentClipboard.trim().length > 0 && 
        currentClipboard !== lastClipboard) {
      
      lastClipboard = currentClipboard;
      
      // Clear existing timer
      if (translationTimer) {
        clearTimeout(translationTimer);
      }
      
      // Set new timer for translation
      translationTimer = setTimeout(async () => {
        const cleanText = currentClipboard.trim();
        
        // Create popup at mouse position
        createTranslationPopup(mousePos.x, mousePos.y);
        
        // Show popup with original text
        translationPopup.show();
        translationPopup.webContents.send('translate-text', {
          original: cleanText
        });
        
        // Get translation
        const translation = await translateToUrdu(cleanText);
        
        // Update popup with translation
        if (translationPopup && !translationPopup.isDestroyed()) {
          translationPopup.webContents.send('translation-result', {
            translation: translation
          });
        }
      }, 2000); // 2 second delay
    }
  }, 200);
}

// Function to force refresh selected text
function refreshSelectedText() {
  const currentClipboard = clipboard.readText();
  if (currentClipboard && currentClipboard.trim().length > 0) {
    selectedText = currentClipboard.trim();
    if (floatingWindow) {
      floatingWindow.webContents.send('text-selected', selectedText);
    }
    console.log('Force refreshed text:', selectedText.substring(0, 50) + '...');
    return true;
  }
  return false;
}

// Translate text to supported languages
async function translateText(text, targetLanguages) {
    try {
        const translations = [];
        const sourceText = text.trim();
        
        // Using LibreTranslate API (you can self-host or use public instance)
        const API_URL = 'https://libretranslate.de/translate';
        
        for (const lang of targetLanguages) {
            try {
                const response = await axios.post(API_URL, {
                    q: sourceText,
                    source: 'auto',
                    target: lang.code
                });
                
                if (response.data && response.data.translatedText) {
                    translations.push({
                        language: lang.name,
                        code: lang.code,
                        text: response.data.translatedText
                    });
                }
            } catch (err) {
                console.log(`Translation error for ${lang.code}:`, err.message);
            }
        }
        
        return translations;
    } catch (error) {
        console.log('Translation error:', error.message);
        return [];
    }
}

// Add this function for Google Translate API
async function translateToUrdu(text) {
    try {
        const result = await translate(text, { to: 'ur' });
        return result.text;
    } catch (error) {
        console.error('Translation error:', error);
        return 'Translation failed';
    }
}

// App initialization
app.whenReady().then(() => {
  createFloatingWindow();
  createChatWindow();
  monitorTextSelection();
  
  // Register global shortcut for manual text selection
  globalShortcut.register('Ctrl+Shift+L', () => {
    try {
      const text = clipboard.readText();
      const html = clipboard.readHTML();
      
      let cleanText = '';
      
      if (text && text.trim()) {
        if (!text.includes('<') || text.length < 100) {
          cleanText = text.trim();
        } else if (html) {
          cleanText = stripHtmlToText(html);
        } else {
          cleanText = text.trim();
        }
        
        // Only proceed if it's not code/HTML
        if (!isCodeOrHTML(cleanText)) {
          selectedText = cleanText;
          console.log('Global shortcut captured clean text:', selectedText.substring(0, 100) + '...');
          
          // Update floating icon state
          if (floatingWindow && !floatingWindow.isDestroyed()) {
            floatingWindow.webContents.send('text-selected', selectedText);
          }
          
          // For global shortcut, DO open chat automatically
          if (chatWindow && !chatWindow.isDestroyed()) {
            chatWindow.show();
            chatWindow.focus();
            chatWindow.webContents.send('load-selected-text', selectedText);
          }
        } else {
          console.log('Global shortcut detected code/HTML, skipping');
        }
      } else {
        console.log('No text in clipboard for global shortcut');
      }
    } catch (error) {
      console.log('Global shortcut error:', error.message);
    }
  });
  
  // Register global shortcut for translation
  globalShortcut.register('Ctrl+Shift+T', async () => {
    try {
        const text = clipboard.readText();
        
        if (text && text.trim() && text.trim().split(/\s+/).length <= 5) {
            const translations = await translateText(text, SUPPORTED_LANGUAGES);
            
            if (translations.length > 0) {
                if (chatWindow && !chatWindow.isDestroyed()) {
                    chatWindow.show();
                    chatWindow.focus();
                    chatWindow.webContents.send('show-translations', {
                        original: text.trim(),
                        translations
                    });
                }
            }
        } else {
            console.log('Text too long or empty for translation');
        }
    } catch (error) {
        console.log('Translation shortcut error:', error.message);
    }
  });
});

// IPC handlers
ipcMain.handle('get-selected-text', () => {
  return selectedText;
});

ipcMain.handle('show-chat', () => {
  try {
    // Always get the latest selection when showing chat
    // First try PRIMARY selection (auto-updated on text selection)
    let freshText = clipboard.readText('selection');
    let freshHTML = clipboard.readHTML('selection');
    
    // Fallback to clipboard if PRIMARY selection is empty
    if (!freshText || freshText.trim().length === 0) {
      freshText = clipboard.readText();
      freshHTML = clipboard.readHTML();
    }
    
    let cleanText = '';
    
    if (freshText && freshText.trim().length > 0) {
      if (!freshText.includes('<') || freshText.length < 100) {
        cleanText = freshText.trim();
      } else if (freshHTML) {
        cleanText = stripHtmlToText(freshHTML);
      } else {
        cleanText = freshText.trim();
      }
      
      // Only use if it's not code/HTML
      if (!isCodeOrHTML(cleanText)) {
        selectedText = cleanText;
        console.log('Fresh clean text on chat open:', selectedText.substring(0, 100) + '...');
      }
    }
    
    if (chatWindow && !chatWindow.isDestroyed()) {
      chatWindow.show();
      chatWindow.focus();
      chatWindow.webContents.send('load-selected-text', selectedText);
    }
  } catch (error) {
    console.log('Show chat error:', error.message);
  }
});

ipcMain.handle('refresh-text', () => {
  return refreshSelectedText();
});

ipcMain.handle('force-get-clipboard', () => {
  try {
    // First try PRIMARY selection
    let freshText = clipboard.readText('selection');
    let freshHTML = clipboard.readHTML('selection');
    
    // Fallback to clipboard
    if (!freshText || freshText.trim().length === 0) {
      freshText = clipboard.readText();
      freshHTML = clipboard.readHTML();
    }
    
    let cleanText = '';
    
    if (freshText && freshText.trim().length > 0) {
      if (!freshText.includes('<') || freshText.length < 100) {
        cleanText = freshText.trim();
      } else if (freshHTML) {
        cleanText = stripHtmlToText(freshHTML);
      } else {
        cleanText = freshText.trim();
      }
      
      // Only return if it's not code/HTML
      if (!isCodeOrHTML(cleanText)) {
        selectedText = cleanText;
        return selectedText;
      }
    }
    
    return '';
  } catch (error) {
    console.log('Force get clipboard error:', error.message);
    return '';
  }
});

ipcMain.handle('get-raw-clipboard', () => {
  try {
    // Try PRIMARY selection first, fallback to clipboard
    let rawText = clipboard.readText('selection');
    if (!rawText || rawText.trim().length === 0) {
      rawText = clipboard.readText();
    }
    return rawText;
  } catch (error) {
    console.log('Get raw clipboard error:', error.message);
    return '';
  }
});

ipcMain.handle('hide-chat', () => {
  if (chatWindow) {
    chatWindow.hide();
  }
});

ipcMain.handle('get-message-history', () => {
  return messageHistory;
});

ipcMain.handle('add-message', (event, message) => {
  messageHistory.push(message);
  
  // Keep only last 10 messages
  if (messageHistory.length > 10) {
    messageHistory = messageHistory.slice(-10);
  }
  
  return messageHistory;
});

ipcMain.handle('clear-selected-text', () => {
  selectedText = '';
  if (floatingWindow) {
    floatingWindow.webContents.send('clear-selection');
  }
});

ipcMain.handle('get-env-vars', () => {
  return {
    MyKey: process.env.MyKey,
    MyGroqURL: process.env.MyGroqURL,
    defaultModel: process.env.defaultModel,
  };
});

// Translate text IPC handler
ipcMain.handle('translate-text', async (event, text) => {
    return await translateText(text, SUPPORTED_LANGUAGES);
});

// Add these IPC handlers
ipcMain.handle('close-translation-popup', () => {
    if (translationPopup && !translationPopup.isDestroyed()) {
        translationPopup.destroy();
    }
});

ipcMain.handle('get-translation', async (event, text) => {
    return await translateToUrdu(text);
});

// Quit app
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Clean up intervals before quitting
    if (app.monitoringInterval) {
      clearInterval(app.monitoringInterval);
    }
    app.quit();
  }
});

app.on('will-quit', () => {
    // Clean up intervals and shortcuts
    if (app.monitoringInterval) {
        clearInterval(app.monitoringInterval);
    }
    globalShortcut.unregisterAll();
    if (translationTimer) {
        clearTimeout(translationTimer);
    }
    if (translationPopup && !translationPopup.isDestroyed()) {
        translationPopup.destroy();
    }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createFloatingWindow();
    createChatWindow();
  }
});

// Handle app termination gracefully
process.on('SIGINT', () => {
  if (app.monitoringInterval) {
    clearInterval(app.monitoringInterval);
  }
  app.quit();
});

process.on('SIGTERM', () => {
  if (app.monitoringInterval) {
    clearInterval(app.monitoringInterval);
  }
  app.quit();
});
