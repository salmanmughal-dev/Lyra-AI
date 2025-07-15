const { ipcRenderer } = require("electron");
const axios = require("axios");
require("dotenv").config();

// DOM elements
const closeBtn = document.getElementById("closeBtn");
const selectedTextDisplay = document.getElementById("selectedTextDisplay");
const selectedTextContent = document.getElementById("selectedTextContent");
const refreshTextBtn = document.getElementById("refreshTextBtn");
const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");

// Groq API configuration

let GROQ_API_KEY;
let GROQ_API_URL;
let MODEL_NAME;

ipcRenderer.invoke('get-env-vars').then((env) => {
  GROQ_API_KEY = env.MyKey;
  GROQ_API_URL = env.MyGroqURL;
  MODEL_NAME = env.defaultModel;
  console.log('Env vars loaded:', { GROQ_API_KEY: GROQ_API_KEY ? '****' : 'N/A', GROQ_API_URL, MODEL_NAME });
});

let currentSelectedText = "";
let isProcessing = false;
// console.log(`Database Host: ${DB_HOST}`);
// Event listeners
closeBtn.addEventListener("click", () => {
  ipcRenderer.invoke("hide-chat");
  ipcRenderer.invoke("clear-selected-text");
});

refreshTextBtn.addEventListener("click", async () => {
  console.log("Manual refresh clicked");
  const freshText = await ipcRenderer.invoke("force-get-clipboard");
  if (freshText && freshText.trim()) {
    currentSelectedText = freshText.trim();
    selectedTextContent.textContent = currentSelectedText;
    selectedTextDisplay.style.display = "block";

    // Check if the text looks like it was cleaned from HTML
    const rawClipboard = await ipcRenderer.invoke("get-raw-clipboard");
    let refreshMessage = `📋 Refreshed with new text: "${currentSelectedText.substring(
      0,
      100
    )}${currentSelectedText.length > 100 ? "..." : ""}"`;

    if (
      rawClipboard &&
      rawClipboard.includes("<") &&
      !currentSelectedText.includes("<")
    ) {
      refreshMessage += " (HTML cleaned to plain text)";
    }

    // Show user message about refresh
    addMessage(refreshMessage, true);

    // Auto-process the new text
    await processSelectedText(currentSelectedText);
  } else {
    addMessage(
      "❌ No readable text found in clipboard. Please select and copy some text first. (Note: Code and HTML are filtered out)",
      false
    );
  }
});

sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + "px";
});

// Listen for selected text from main process
ipcRenderer.on("load-selected-text", async (event, text) => {
  // Always get the freshest clipboard content
  const freshText = await ipcRenderer.invoke("force-get-clipboard");
  const rawClipboard = await ipcRenderer.invoke("get-raw-clipboard");
  const textToUse = freshText || text || "";

  console.log("Loading text in chat:", textToUse.substring(0, 100) + "...");

  if (textToUse && textToUse.trim()) {
    currentSelectedText = textToUse.trim();
    selectedTextContent.textContent = currentSelectedText;
    selectedTextDisplay.style.display = "block";

    // Show helpful message if HTML was cleaned
    if (
      rawClipboard &&
      rawClipboard.includes("<") &&
      !currentSelectedText.includes("<")
    ) {
      addMessage(
        "🧹 Cleaned HTML formatting from selected text to extract readable content.",
        false
      );
    }

    // Auto-process the selected text
    await processSelectedText(currentSelectedText);
  } else {
    selectedTextDisplay.style.display = "none";

    // Check if there was content but it was filtered
    if (rawClipboard && rawClipboard.trim().length > 0) {
      addMessage(
        "ℹ️ The selected content appears to be code or HTML markup, which has been filtered out. Please select readable text instead.",
        false
      );
    }
  }

  messageInput.focus();
});

// Function to convert markdown-like formatting to HTML
function formatText(text) {
  // Convert markdown-style formatting to HTML
  let formatted = text
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.*?)__/g, "<strong>$1</strong>")
    // Italic text
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    // Code blocks
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    // Headers
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    // Line breaks
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  // Handle bullet points - both * and - formats
  formatted = formatted.replace(/^[\s]*[-\*\+]\s+(.+)$/gm, "<li>$1</li>");

  // Wrap consecutive <li> items in <ul>
  formatted = formatted.replace(/(<li>.*<\/li>)/gs, function (match) {
    return "<ul>" + match + "</ul>";
  });

  // Handle numbered lists
  formatted = formatted.replace(/^[\s]*\d+\.\s+(.+)$/gm, "<li>$1</li>");
  formatted = formatted.replace(/(<li>.*<\/li>)/gs, function (match) {
    // Only wrap if not already wrapped
    if (!match.includes("<ul>") && !match.includes("<ol>")) {
      return "<ol>" + match + "</ol>";
    }
    return match;
  });

  // Wrap in paragraphs if not already formatted
  if (
    !formatted.includes("<p>") &&
    !formatted.includes("<h") &&
    !formatted.includes("<ul>") &&
    !formatted.includes("<ol>")
  ) {
    formatted = "<p>" + formatted + "</p>";
  }

  return formatted;
}

// Function to add message to chat
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user" : "assistant"}`;

  const bubbleDiv = document.createElement("div");
  bubbleDiv.className = "message-bubble";

  if (isUser) {
    bubbleDiv.textContent = content;
  } else {
    // Format AI responses with HTML
    bubbleDiv.innerHTML = formatText(content);
  }

  messageDiv.appendChild(bubbleDiv);
  messagesContainer.appendChild(messageDiv);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Save to history
  ipcRenderer.invoke("add-message", {
    content: content,
    isUser: isUser,
    timestamp: new Date().toISOString(),
  });
}

// Function to show typing indicator
function showTypingIndicator() {
  typingIndicator.classList.add("show");
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Function to hide typing indicator
function hideTypingIndicator() {
  typingIndicator.classList.remove("show");
}

// Function to process selected text automatically
async function processSelectedText(text) {
  if (!text || isProcessing) return;

  console.log("Processing text:", text.substring(0, 100) + "...");

  let prompt;
  const words = text.trim().split(/\s+/);

  if (words.length === 1) {
    // Single word - provide definition and examples
    prompt = `Please provide a comprehensive explanation of the word "${text}" with the following format:

**Definition:** Clear, concise definition

**Key Points:**
• Main meaning and context
• Part of speech and pronunciation (if relevant)
• Common usage scenarios

**Examples:**
• Example sentence 1 with context
• Example sentence 2 showing different usage
• Example sentence 3 (if helpful)

**Additional Notes:**
• Etymology or origin (if interesting)
• Related words or synonyms
• Any important nuances or variations

Please use bullet points and bold formatting to make the response clear and easy to read.`;
  } else {
    // Multiple words - provide summary
    prompt = `Please provide a well-structured summary of the following text using bullet points and bold formatting:

"${text}"

Format your response as:

**Main Topic:** Brief description

**Key Points:**
• Primary point or argument
• Supporting details or evidence
• Important implications or conclusions

**Summary:**
• Concise overview of the main ideas
• What the reader should take away
• Any actionable insights (if applicable)

Use bullet points, bold text for headings, and make it descriptive and easy to scan.`;
  }

  await sendToGroq(prompt, false);
}

// Function to send message
async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message || isProcessing) return;

  // Add user message
  addMessage(message, true);
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Prepare prompt with context
  let fullPrompt = message;
  if (currentSelectedText) {
    fullPrompt = `Context: "${currentSelectedText}"\n\nQuestion: ${message}`;
  }

  await sendToGroq(fullPrompt, true);
}

// Function to send request to Groq API
async function sendToGroq(prompt, showUserMessage = true) {
  if (isProcessing) return;

  isProcessing = true;
  sendBtn.disabled = true;
  showTypingIndicator();

  try {
    // Get message history
    const history = await ipcRenderer.invoke("get-message-history");

    // Prepare messages for API
    const messages = [
      {
        role: "system",
        content: `You are Lyra, a helpful AI assistant for Linux Mint users. You provide clear, well-formatted, and descriptive responses. 

FORMATTING GUIDELINES:
- Use **bold text** for headings and important terms
- Use bullet points (•) for lists and key points
- Structure responses with clear sections when appropriate
- Be descriptive and thorough while remaining helpful
- Use proper formatting with headers, bullet points, and emphasis
- Make responses scannable and easy to read

When explaining technical concepts, use simple language but be comprehensive. When providing definitions, include practical examples and context. Format your responses to be visually appealing and easy to understand.`,
      },
    ];

    // Add recent conversation history (last 6 messages to stay within token limits)
    const recentHistory = history.slice(-6);
    recentHistory.forEach((msg) => {
      messages.push({
        role: msg.isUser ? "user" : "assistant",
        content: msg.content,
      });
    });

    // Add current prompt
    messages.push({
      role: "user",
      content: prompt,
    });

    const response = await axios.post(
      GROQ_API_URL,
      {
        model: MODEL_NAME,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
        top_p: 1,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = response.data.choices[0].message.content;

    // Hide typing indicator and add AI response
    hideTypingIndicator();
    addMessage(aiResponse, false);
  } catch (error) {
    console.error("Error calling Groq API:", error);
    hideTypingIndicator();

    let errorMessage =
      "Sorry, I encountered an error while processing your request. ";

    if (error.response) {
      switch (error.response.status) {
        case 401:
          errorMessage += "API key authentication failed.";
          break;
        case 429:
          errorMessage += "Rate limit exceeded. Please try again in a moment.";
          break;
        case 500:
          errorMessage += "Server error. Please try again later.";
          break;
        default:
          errorMessage +=
            "Please check your internet connection and try again.";
      }
    } else if (error.request) {
      errorMessage +=
        "Unable to connect to the AI service. Please check your internet connection.";
    } else {
      errorMessage += "An unexpected error occurred.";
    }

    addMessage(errorMessage, false);
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// Load message history on startup
async function loadMessageHistory() {
  const history = await ipcRenderer.invoke("get-message-history");

  // Clear existing messages except welcome message
  const welcomeMessage = messagesContainer.querySelector(".message");
  messagesContainer.innerHTML = "";
  messagesContainer.appendChild(welcomeMessage);

  // Add history messages
  history.forEach((msg) => {
    addMessage(msg.content, msg.isUser);
  });
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadMessageHistory();
  messageInput.focus();
});

// Prevent context menu
document.addEventListener("contextmenu", (e) => {
  e.preventDefault();
});
