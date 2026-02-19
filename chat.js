// ─── AGENT METADATA ───
const AGENTS = {
  'AGT-001': { name: 'Finisher', role: 'Task Execution Lead', avatar: '🎯', accent: '#b4f576' },
  'AGT-002': { name: 'Edge Lord', role: 'Quality & Edge Case Specialist', avatar: '🔬', accent: '#f5c542' },
  'AGT-003': { name: 'Narrator', role: 'Documentation & Comms', avatar: '🎭', accent: '#42d4f5' },
  'AGT-004': { name: 'Haiku', role: 'Incident Response', avatar: '🌿', accent: '#f55d42' },
  'AGT-005': { name: 'Rabbit Hole', role: 'Research & Architecture', avatar: '🕳️', accent: '#b07cf5' },
};

// ─── STATE ───
let currentAgent = null;
let sending = false;

function loadHistory(agentId) {
  try {
    const data = JSON.parse(localStorage.getItem('mait_chat') || '{}');
    return data[agentId]?.messages || [];
  } catch { return []; }
}

function saveHistory(agentId, messages) {
  try {
    const data = JSON.parse(localStorage.getItem('mait_chat') || '{}');
    data[agentId] = { messages, lastOpen: Date.now() };
    localStorage.setItem('mait_chat', JSON.stringify(data));
  } catch { /* localStorage full or unavailable */ }
}

function clearHistory(agentId) {
  try {
    const data = JSON.parse(localStorage.getItem('mait_chat') || '{}');
    delete data[agentId];
    localStorage.setItem('mait_chat', JSON.stringify(data));
  } catch {}
}

// ─── MODAL INJECTION ───
function createModal() {
  const div = document.createElement('div');
  div.id = 'chat-modal';
  div.className = 'chat-modal';
  div.setAttribute('aria-hidden', 'true');
  div.innerHTML = `
    <div class="chat-panel" role="dialog" aria-label="Chat with agent">
      <header class="chat-header">
        <div class="chat-header-avatar" id="chat-avatar"></div>
        <div class="chat-header-info">
          <div class="chat-header-name" id="chat-name"></div>
          <div class="chat-header-role" id="chat-role"></div>
        </div>
        <button class="chat-clear" id="chat-clear" title="Clear history">Clear</button>
        <button class="chat-close" id="chat-close" aria-label="Close chat">&times;</button>
      </header>
      <div class="chat-messages" id="chat-messages">
        <div class="chat-empty" id="chat-empty">Click to begin transmission</div>
      </div>
      <div class="chat-typing" id="chat-typing">
        <span></span><span></span><span></span>
      </div>
      <form class="chat-input-row" id="chat-form">
        <textarea class="chat-input" id="chat-input" rows="1" placeholder="Send a message..." autocomplete="off"></textarea>
        <button type="submit" class="chat-send" id="chat-send" title="Send">↑</button>
      </form>
    </div>
  `;
  document.body.appendChild(div);

  // Event listeners
  div.addEventListener('click', (e) => {
    if (e.target === div) closeChat();
  });
  document.getElementById('chat-close').addEventListener('click', closeChat);
  document.getElementById('chat-clear').addEventListener('click', handleClear);
  document.getElementById('chat-form').addEventListener('submit', handleSubmit);

  // Auto-resize textarea
  const input = document.getElementById('chat-input');
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Enter to send (shift+enter for newline)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('chat-form').requestSubmit();
    }
  });

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentAgent) closeChat();
  });
}

// ─── OPEN / CLOSE ───
function openChat(agentId) {
  const agent = AGENTS[agentId];
  if (!agent) return;

  currentAgent = agentId;
  const modal = document.getElementById('chat-modal');
  const panel = modal.querySelector('.chat-panel');

  // Set accent color
  panel.style.setProperty('--agent-accent', agent.accent);

  // Set header
  document.getElementById('chat-avatar').textContent = agent.avatar;
  document.getElementById('chat-name').textContent = agent.name;
  document.getElementById('chat-role').textContent = agent.role;

  // Render history
  renderMessages(agentId);

  // Show modal
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Focus input
  setTimeout(() => document.getElementById('chat-input').focus(), 100);
}

function closeChat() {
  const modal = document.getElementById('chat-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentAgent = null;
}

// ─── RENDER ───
function renderMessages(agentId) {
  const container = document.getElementById('chat-messages');
  const empty = document.getElementById('chat-empty');
  const messages = loadHistory(agentId);

  // Clear existing bubbles (keep empty indicator and typing)
  container.querySelectorAll('.bubble').forEach(b => b.remove());

  if (messages.length === 0) {
    empty.style.display = 'flex';
  } else {
    empty.style.display = 'none';
    messages.forEach(m => appendBubble(m.role, m.content));
  }

  scrollToBottom();
}

function appendBubble(role, content) {
  const container = document.getElementById('chat-messages');
  const empty = document.getElementById('chat-empty');
  empty.style.display = 'none';

  const bubble = document.createElement('div');
  bubble.className = `bubble ${role}`;
  bubble.textContent = content;
  container.appendChild(bubble);
  scrollToBottom();
}

function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  requestAnimationFrame(() => {
    container.scrollTop = container.scrollHeight;
  });
}

function setTyping(active) {
  document.getElementById('chat-typing').classList.toggle('active', active);
  if (active) scrollToBottom();
}

// ─── API CALL ───
async function callChatAPI(agentId, messages) {
  const resp = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, messages }),
  });

  const data = await resp.json();
  if (!resp.ok || data.error) {
    throw new Error(data.error || `API error (${resp.status})`);
  }
  return data.reply;
}

// ─── HANDLERS ───
async function handleSubmit(e) {
  e.preventDefault();
  if (sending || !currentAgent) return;

  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  // Add user message
  const messages = loadHistory(currentAgent);
  messages.push({ role: 'user', content: text });
  saveHistory(currentAgent, messages);
  appendBubble('user', text);

  // Clear input
  input.value = '';
  input.style.height = 'auto';

  // Disable send, show typing
  sending = true;
  document.getElementById('chat-send').disabled = true;
  setTyping(true);

  try {
    const reply = await callChatAPI(currentAgent, messages);
    messages.push({ role: 'assistant', content: reply });
    saveHistory(currentAgent, messages);
    setTyping(false);
    appendBubble('assistant', reply);
  } catch (err) {
    setTyping(false);
    appendBubble('assistant', `⚠ Error: ${err.message}`);
  } finally {
    sending = false;
    document.getElementById('chat-send').disabled = false;
    input.focus();
  }
}

function handleClear() {
  if (!currentAgent) return;
  clearHistory(currentAgent);
  renderMessages(currentAgent);
}

// ─── INIT ───
document.addEventListener('DOMContentLoaded', () => {
  createModal();

  // Wire agent cards
  document.querySelectorAll('.agent[data-id]').forEach(card => {
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.addEventListener('click', () => openChat(card.dataset.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openChat(card.dataset.id);
      }
    });
  });
});
