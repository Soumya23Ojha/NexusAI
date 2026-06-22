'use strict';

  //  1. CONFIGURATION & STATE

/** App-wide config */
const CONFIG = {
  /** Simulated AI response delay range in ms */
  AI_RESPONSE_DELAY_MIN: 800,
  AI_RESPONSE_DELAY_MAX: 2000,

  /** Local-storage key for theme preference */
  THEME_STORAGE_KEY: 'nexusai_theme',

  /**
   * ─── API INTEGRATION POINT ───────────────────────────────
   * When connecting to the FastAPI + Gemini backend:
   *   1. Set USE_REAL_API = true
   *   2. Set API_ENDPOINT to your FastAPI URL
   *   3. Implement fetchAIResponse() below
   * ─────────────────────────────────────────────────────────
   */
  USE_REAL_API: false,
  API_ENDPOINT: 'http://localhost:8000/api/chat',
};

/** Mutable application state */
const state = {
  /** 'dark' | 'light' */
  theme: 'dark',

  /** Whether the AI is currently responding */
  isLoading: false,

  /** Full conversation history (for multi-turn API calls) */
  messages: [],
};

/* ═══════════════════════════════════════════════════
   2. DOM REFERENCES
═══════════════════════════════════════════════════ */

const DOM = {
  // Layout
  sidebar:          document.getElementById('sidebar'),
  sidebarOverlay:   document.getElementById('sidebarOverlay'),
  sidebarOpenBtn:   document.getElementById('sidebarOpenBtn'),
  sidebarCloseBtn:  document.getElementById('sidebarCloseBtn'),

  // Header
  themeToggleBtn:   document.getElementById('themeToggleBtn'),
  themeIcon:        document.getElementById('themeIcon'),
  themeLabel:       document.getElementById('themeLabel'),

  // Chat
  chatContainer:    document.getElementById('chatContainer'),
  welcomeScreen:    document.getElementById('welcomeScreen'),
  messagesContainer: document.getElementById('messagesContainer'),

  // Input
  messageInput:     document.getElementById('messageInput'),
  sendBtn:          document.getElementById('sendBtn'),

  // Sidebar actions
  newChatBtn:       document.getElementById('newChatBtn'),
  aboutBtn:         document.getElementById('aboutBtn'),

  // Modal
  aboutModal:       document.getElementById('aboutModal'),
  aboutModalClose:  document.getElementById('aboutModalClose'),
};

/* ═══════════════════════════════════════════════════
   3. THEME MANAGEMENT
═══════════════════════════════════════════════════ */

/**
 * Apply a theme ('dark' | 'light') to the document.
 * Updates state, DOM attribute, LocalStorage, and button UI.
 */
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(CONFIG.THEME_STORAGE_KEY, theme);
  updateThemeButton(theme);
}

/** Sync theme toggle button icon + label to current theme. */
function updateThemeButton(theme) {
  const isDark = theme === 'dark';

  // In dark mode → show "Light Mode" option; in light mode → "Dark Mode"
  DOM.themeLabel.textContent = isDark ? 'Light Mode' : 'Dark Mode';

  // Swap the SVG icon
  DOM.themeIcon.innerHTML = isDark
    ? /* Sun icon */
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
         <circle cx="8" cy="8" r="3" stroke="currentColor" stroke-width="1.5"/>
         <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41"
               stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
       </svg>`
    : /* Moon icon */
      `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
         <path d="M13.5 10.5A6 6 0 015.5 2.5a6 6 0 108 8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
       </svg>`;
}

/** Read saved preference from LocalStorage (defaults to 'dark'). */
function loadSavedTheme() {
  const saved = localStorage.getItem(CONFIG.THEME_STORAGE_KEY);
  applyTheme(saved === 'light' ? 'light' : 'dark');
}

/* ═══════════════════════════════════════════════════
   4. SIDEBAR MANAGEMENT
═══════════════════════════════════════════════════ */

/** Open the mobile sidebar drawer. */
function openSidebar() {
  DOM.sidebar.classList.add('is-open');
  DOM.sidebarOverlay.classList.add('is-visible');
  DOM.sidebarOverlay.removeAttribute('aria-hidden');
  DOM.sidebarOpenBtn.setAttribute('aria-expanded', 'true');
  // Trap focus loosely: move focus to the close button
  DOM.sidebarCloseBtn.focus();
}

/** Close the mobile sidebar drawer. */
function closeSidebar() {
  DOM.sidebar.classList.remove('is-open');
  DOM.sidebarOverlay.classList.remove('is-visible');
  DOM.sidebarOverlay.setAttribute('aria-hidden', 'true');
  DOM.sidebarOpenBtn.setAttribute('aria-expanded', 'false');
  DOM.sidebarOpenBtn.focus();
}

/* ═══════════════════════════════════════════════════
   5. MODAL MANAGEMENT
═══════════════════════════════════════════════════ */

/** Open the about modal. */
function openAboutModal() {
  DOM.aboutModal.removeAttribute('hidden');
  DOM.aboutModalClose.focus();
  // Block background scroll
  document.body.style.overflow = 'hidden';
}

/** Close the about modal. */
function closeAboutModal() {
  DOM.aboutModal.setAttribute('hidden', '');
  document.body.style.overflow = '';
  DOM.aboutBtn.focus();
}

/* ═══════════════════════════════════════════════════
   6. MESSAGE RENDERING
═══════════════════════════════════════════════════ */

/**
 * Create and append a message element to the messages container.
 *
 * @param {'user'|'ai'} role - Who sent the message.
 * @param {string}      text - The message text content.
 * @returns {HTMLElement} The message element (useful for typing indicator replacement).
 */
function renderMessage(role, text) {
  const isUser = role === 'user';
  const timestamp = formatTimestamp(new Date());

  /* ── Build message element ── */
  const messageEl = document.createElement('div');
  messageEl.className = `message message--${isUser ? 'user' : 'ai'}`;
  messageEl.setAttribute('role', 'article');
  messageEl.setAttribute('aria-label', `${isUser ? 'You' : 'NexusAI'} said: ${text}`);

  /* ── Avatar ── */
  const avatarEl = document.createElement('div');
  avatarEl.className = `message__avatar message__avatar--${isUser ? 'user' : 'ai'}`;
  avatarEl.setAttribute('aria-hidden', 'true');
  avatarEl.innerHTML = isUser
    ? 'U'
    : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
         <path d="M4 8 L8 4 L12 8 L8 12 Z" fill="white"/>
       </svg>`;

  /* ── Body (bubble + meta) ── */
  const bodyEl = document.createElement('div');
  bodyEl.className = 'message__body';

  /* ── Bubble ── */
  const bubbleEl = document.createElement('div');
  bubbleEl.className = `message__bubble message__bubble--${isUser ? 'user' : 'ai'}`;
  // Render newlines as <br> and escape HTML
  bubbleEl.innerHTML = escapeHtml(text).replace(/\n/g, '<br>');

  /* ── Meta (timestamp + copy button) ── */
  const metaEl = document.createElement('div');
  metaEl.className = 'message__meta';

  const timestampEl = document.createElement('span');
  timestampEl.className = 'message__timestamp';
  timestampEl.textContent = timestamp;

  const copyBtn = document.createElement('button');
  copyBtn.className = 'message__copy-btn';
  copyBtn.setAttribute('aria-label', 'Copy message');
  copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <rect x="1" y="3" width="7" height="8" rx="1.2" stroke="currentColor" stroke-width="1.2"/>
    <path d="M4 1h6a1 1 0 011 1v7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
  </svg> Copy`;

  // Copy button handler
  copyBtn.addEventListener('click', () => copyMessageText(text, copyBtn));

  metaEl.appendChild(timestampEl);
  metaEl.appendChild(copyBtn);

  /* ── Assemble ── */
  bodyEl.appendChild(bubbleEl);
  bodyEl.appendChild(metaEl);

  if (isUser) {
    messageEl.appendChild(bodyEl);
    messageEl.appendChild(avatarEl);
  } else {
    messageEl.appendChild(avatarEl);
    messageEl.appendChild(bodyEl);
  }

  DOM.messagesContainer.appendChild(messageEl);
  scrollToBottom();

  return messageEl;
}

/**
 * Copy message text to the clipboard.
 * Temporarily changes the button label to confirm success.
 */
async function copyMessageText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const original = btn.innerHTML;
    btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 6l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg> Copied!`;
    btn.classList.add('copied');
    setTimeout(() => {
      btn.innerHTML = original;
      btn.classList.remove('copied');
    }, 2000);
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'absolute';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

/* ═══════════════════════════════════════════════════
   7. TYPING INDICATOR
═══════════════════════════════════════════════════ */

/** Show an animated typing indicator (AI is "thinking"). */
function showTypingIndicator() {
  // Wrap the indicator in a message row for consistent alignment
  const messageEl = document.createElement('div');
  messageEl.className = 'message message--ai';
  messageEl.id = 'typingIndicatorRow';
  messageEl.setAttribute('aria-live', 'polite');
  messageEl.setAttribute('aria-label', 'NexusAI is typing');

  const avatarEl = document.createElement('div');
  avatarEl.className = 'message__avatar message__avatar--ai';
  avatarEl.setAttribute('aria-hidden', 'true');
  avatarEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 8 L8 4 L12 8 L8 12 Z" fill="white"/>
  </svg>`;

  const bodyEl = document.createElement('div');
  bodyEl.className = 'message__body';

  const indicatorEl = document.createElement('div');
  indicatorEl.className = 'typing-indicator';
  indicatorEl.innerHTML = `
    <span class="typing-indicator__dot" aria-hidden="true"></span>
    <span class="typing-indicator__dot" aria-hidden="true"></span>
    <span class="typing-indicator__dot" aria-hidden="true"></span>
  `;

  bodyEl.appendChild(indicatorEl);
  messageEl.appendChild(avatarEl);
  messageEl.appendChild(bodyEl);

  DOM.messagesContainer.appendChild(messageEl);
  scrollToBottom();

  return messageEl;
}

/** Remove the typing indicator element. */
function removeTypingIndicator() {
  const indicator = document.getElementById('typingIndicatorRow');
  if (indicator) indicator.remove();
}

/* ═══════════════════════════════════════════════════
   8. CHAT LOGIC
═══════════════════════════════════════════════════ */

/**
 * Main send handler.
 * Reads the textarea, renders the user message, calls the AI.
 */
async function handleSend() {
  const text = DOM.messageInput.value.trim();
  if (!text || state.isLoading) return;

  // Hide welcome screen on first message
  if (DOM.welcomeScreen) {
    DOM.welcomeScreen.style.display = 'none';
  }

  // Clear + reset textarea
  DOM.messageInput.value = '';
  autoResizeTextarea();
  setInputDisabled(true);

  // Add to history and render
  state.messages.push({ role: 'user', content: text });
  renderMessage('user', text);

  // Show typing indicator
  showTypingIndicator();
  state.isLoading = true;

  try {
    let aiReply;

    if (CONFIG.USE_REAL_API) {
      // ─── REAL API CALL ───────────────────────────────────────
      // Replace dummy response with actual API call.
      // The conversation history is already in state.messages.
      aiReply = await fetchAIResponse(state.messages);
    } else {
      // ─── DUMMY RESPONSE (development / demo mode) ────────────
      aiReply = await getDummyAIResponse(text);
    }

    removeTypingIndicator();
    state.messages.push({ role: 'assistant', content: aiReply });
    renderMessage('ai', aiReply);

  } catch (error) {
    removeTypingIndicator();
    const errMessage = 'Sorry, something went wrong. Please try again.';
    renderMessage('ai', errMessage);
    console.error('[NexusAI] Error fetching AI response:', error);
  } finally {
    state.isLoading = false;
    setInputDisabled(false);
    DOM.messageInput.focus();
  }
}

/**
 * ─── API INTEGRATION POINT ───────────────────────────────────────
 * Replace this stub when the FastAPI backend is ready.
 *
 * @param {Array<{role: string, content: string}>} messages
 * @returns {Promise<string>} The AI's reply text.
 */
async function fetchAIResponse(messages) {
  const response = await fetch(CONFIG.API_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // Adjust the key below to match your FastAPI response schema
  return data.reply ?? data.message ?? data.text ?? 'No response from server.';
}

/**
 * Generate a contextual dummy AI response for demo mode.
 * Simulates network delay for realism.
 *
 * @param {string} userText
 * @returns {Promise<string>}
 */
function getDummyAIResponse(userText) {
  const delay = randomInt(CONFIG.AI_RESPONSE_DELAY_MIN, CONFIG.AI_RESPONSE_DELAY_MAX);
  const lower = userText.toLowerCase();

  // Pick a canned response based on keywords
  let reply;

  if (lower.includes('javascript') || lower.includes('closure')) {
    reply = `A closure in JavaScript is a function that retains access to variables from its outer (enclosing) scope even after that scope has finished executing.

Here's a practical example:

function makeCounter() {
  let count = 0;          // outer variable
  return function() {     // inner function — the closure
    count++;
    return count;
  };
}

const counter = makeCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3

Each call to counter() increments the same count variable because the inner function "closed over" it. This makes closures ideal for data privacy, factory functions, and event handlers.`;

  } else if (lower.includes('python')) {
    reply = `Here's a clean Python function to read a CSV and calculate column statistics:

import csv
from statistics import mean, median, stdev

def column_stats(filepath: str) -> dict:
    """
    Read a CSV file and return descriptive stats
    for each numeric column.
    """
    with open(filepath, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        columns = {}
        for row in reader:
            for key, value in row.items():
                try:
                    columns.setdefault(key, []).append(float(value))
                except (ValueError, TypeError):
                    pass  # skip non-numeric values

    return {
        col: {
            'count':  len(vals),
            'mean':   round(mean(vals), 4),
            'median': round(median(vals), 4),
            'stdev':  round(stdev(vals), 4) if len(vals) > 1 else 0,
            'min':    min(vals),
            'max':    max(vals),
        }
        for col, vals in columns.items()
    }

# Usage
stats = column_stats('data.csv')
for col, s in stats.items():
    print(f"{col}: {s}")`;

  } else if (lower.includes('sql')) {
    reply = `Here's an optimised SQL query to find the top 10 customers by total purchase amount:

SELECT
    c.customer_id,
    c.first_name || ' ' || c.last_name AS full_name,
    c.email,
    COUNT(o.order_id)                  AS total_orders,
    SUM(o.amount)                      AS total_spent,
    MAX(o.created_at)                  AS last_order_date
FROM
    customers c
    INNER JOIN orders o ON o.customer_id = c.customer_id
WHERE
    o.status = 'completed'
GROUP BY
    c.customer_id, c.first_name, c.last_name, c.email
ORDER BY
    total_spent DESC
LIMIT 10;

Tips:
• Add an index on orders(customer_id, status) for large tables.
• Use INNER JOIN to exclude customers with no orders.
• Filter by status to count only completed purchases.`;

  } else if (lower.includes('summar')) {
    reply = `To summarise text effectively, I focus on:

1. **Core argument** — the single most important claim.
2. **Supporting evidence** — 2–3 key facts or examples.
3. **Conclusion** — what the author wants you to take away.

Please paste or type the text you'd like me to summarise and I'll extract the essential points concisely.`;

  } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    reply = `Hello! I'm NexusAI, your intelligent assistant. I can help you with:

• Writing and debugging code (Python, JavaScript, SQL, and more)
• Explaining technical concepts clearly
• Summarising and analysing text
• Answering questions on a wide range of topics

What would you like to explore today?`;

  } else {
    const generic = [
      `That's an interesting question. Let me think through it carefully.\n\nThe key aspects to consider here are the underlying assumptions, the available evidence, and the practical implications. Based on what you've shared, I can outline a structured approach:\n\n1. Start by defining the core problem clearly.\n2. Break it into smaller, manageable sub-problems.\n3. Apply the most relevant methods or frameworks.\n4. Validate the result against your original goal.\n\nWould you like me to go deeper on any of these steps?`,
      `Great question! Here's how I'd approach it:\n\nFirst, it helps to understand the context — the specific constraints and goals shape the best solution. Generally speaking, the most effective strategies balance simplicity with robustness.\n\nI'd recommend starting small, iterating quickly, and measuring outcomes. Let me know if you'd like a more detailed breakdown or concrete examples.`,
      `I can definitely help with that. The short answer is: it depends on your specific requirements, but here are the most important factors to consider:\n\n• **Clarity of goal** — the clearer the target, the better the solution.\n• **Available resources** — time, tools, and expertise all shape the approach.\n• **Acceptable trade-offs** — speed vs. accuracy, simplicity vs. flexibility.\n\nFeel free to share more context and I'll tailor my advice accordingly.`,
    ];
    reply = generic[randomInt(0, generic.length - 1)];
  }

  return new Promise((resolve) => setTimeout(() => resolve(reply), delay));
}

/* ═══════════════════════════════════════════════════
   9. INPUT / TEXTAREA HANDLING
═══════════════════════════════════════════════════ */

/**
 * Auto-resize the textarea to fit its content,
 * up to the CSS max-height of 160px.
 */
function autoResizeTextarea() {
  const el = DOM.messageInput;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

/** Enable or disable the input controls. */
function setInputDisabled(disabled) {
  DOM.messageInput.disabled = disabled;
  DOM.sendBtn.disabled = disabled || DOM.messageInput.value.trim() === '';
}

/** Update send button state based on whether input has content. */
function updateSendButton() {
  DOM.sendBtn.disabled = DOM.messageInput.value.trim() === '' || state.isLoading;
}

/* ═══════════════════════════════════════════════════
   10. SUGGESTION CARDS
═══════════════════════════════════════════════════ */

/** Wire up all suggestion card clicks to fill the textarea and send. */
function initSuggestionCards() {
  const cards = document.querySelectorAll('.suggestion-card');
  cards.forEach((card) => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (!prompt) return;
      DOM.messageInput.value = prompt;
      autoResizeTextarea();
      updateSendButton();
      handleSend();
    });
  });
}

/* ═══════════════════════════════════════════════════
   11. NEW CHAT
═══════════════════════════════════════════════════ */

/** Reset the conversation to a fresh state. */
function startNewChat() {
  // Clear history
  state.messages = [];
  state.isLoading = false;

  // Clear rendered messages
  DOM.messagesContainer.innerHTML = '';

  // Show welcome screen
  if (DOM.welcomeScreen) {
    DOM.welcomeScreen.style.display = '';
  }

  // Clear input
  DOM.messageInput.value = '';
  autoResizeTextarea();
  updateSendButton();

  // Close sidebar on mobile
  closeSidebar();

  DOM.messageInput.focus();
}

/* ═══════════════════════════════════════════════════
   12. UTILITY HELPERS
═══════════════════════════════════════════════════ */

/** Scroll the chat container to the very bottom. */
function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatContainer.scrollTo({
      top: DOM.chatContainer.scrollHeight,
      behavior: 'smooth',
    });
  });
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Format a Date object as a short time string, e.g. "2:34 PM".
 * @param {Date} date
 * @returns {string}
 */
function formatTimestamp(date) {
  return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Return a random integer between min and max (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/* ═══════════════════════════════════════════════════
   13. INITIALISATION
═══════════════════════════════════════════════════ */

/** Attach all event listeners. */
function attachEventListeners() {

  /* ── Theme toggle ── */
  DOM.themeToggleBtn.addEventListener('click', () => {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  /* ── Sidebar (mobile) ── */
  DOM.sidebarOpenBtn.addEventListener('click', openSidebar);
  DOM.sidebarCloseBtn.addEventListener('click', closeSidebar);
  DOM.sidebarOverlay.addEventListener('click', closeSidebar);

  /* ── Close sidebar on Escape ── */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!DOM.aboutModal.hasAttribute('hidden')) {
        closeAboutModal();
      } else {
        closeSidebar();
      }
    }
  });

  /* ── About modal ── */
  DOM.aboutBtn.addEventListener('click', () => {
    closeSidebar();
    openAboutModal();
  });
  DOM.aboutModalClose.addEventListener('click', closeAboutModal);
  DOM.aboutModal.addEventListener('click', (e) => {
    // Close if user clicks the overlay (not the modal box itself)
    if (e.target === DOM.aboutModal) closeAboutModal();
  });

  /* ── New Chat ── */
  DOM.newChatBtn.addEventListener('click', startNewChat);

  /* ── Textarea: auto-resize + button state ── */
  DOM.messageInput.addEventListener('input', () => {
    autoResizeTextarea();
    updateSendButton();
  });

  /* ── Textarea: Enter sends, Shift+Enter newlines ── */
  DOM.messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!DOM.sendBtn.disabled) handleSend();
    }
  });

  /* ── Send button click ── */
  DOM.sendBtn.addEventListener('click', handleSend);
}

/** Bootstrap the application. */
function init() {
  loadSavedTheme();
  initSuggestionCards();
  attachEventListeners();

  // Initial textarea height
  autoResizeTextarea();

  // Set focus to the input on load
  DOM.messageInput.focus();
}

// Run once DOM is ready
document.addEventListener('DOMContentLoaded', init);