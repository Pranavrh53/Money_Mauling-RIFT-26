import React, { useState, useRef, useEffect } from 'react';
import API_BASE from '../config';
import './ChatBot.css';

function ChatBot({ isOpen, onToggle, theme }) {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: "Hello! I'm your **Fraud Detection AI Assistant**. Upload a dataset and run fraud detection, then ask me anything about the results!\n\nType **help** to see what I can answer.",
      category: 'greeting',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const sendMessage = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg = { role: 'user', text: q, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/chat?question=${encodeURIComponent(q)}`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: data.answer || "I couldn't process that question.",
          category: data.category || 'unknown',
          time: new Date()
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'bot',
          text: "Sorry, I couldn't reach the server. Make sure the backend is running.",
          category: 'error',
          time: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickActions = [
    { label: '📋 Summary', query: 'Give me an overview' },
    { label: '⚠️ Suspicious', query: 'List suspicious accounts' },
    { label: '🔄 Rings', query: 'How many fraud rings?' },
    { label: '📈 Scores', query: 'Risk score analysis' },
  ];

  // Simple markdown-like renderer
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      // Bold
      let rendered = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      // Italic
      rendered = rendered.replace(/\*(.+?)\*/g, '<em>$1</em>');
      return (
        <span key={i}>
          <span dangerouslySetInnerHTML={{ __html: rendered }} />
          {i < text.split('\n').length - 1 && <br />}
        </span>
      );
    });
  };

  const getCategoryIcon = (category) => {
    const icons = {
      greeting: '👋', help: '📖', dataset: '📊', count: '🔢',
      rings: '🔄', suspicious: '⚠️', patterns: '🔍', scores: '📈',
      graph: '🌐', account: '👤', ring: '🔄', amounts: '💰',
      dates: '📅', top: '🏆', summary: '📋', error: '❌',
      fallback: '💡', no_data: '📭', no_detection: '⏳', not_found: '🔎'
    };
    return icons[category] || '🤖';
  };

  if (!isOpen) {
    return (
      <button className="chatbot-fab" onClick={onToggle} title="AI Assistant">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="fab-badge">AI</span>
      </button>
    );
  }

  return (
    <div className={`chatbot-panel ${theme}`}>
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="chatbot-avatar">🤖</div>
          <div>
            <h3>Fraud Detection AI</h3>
            <span className="chatbot-status">
              <span className="status-dot"></span>
              Online
            </span>
          </div>
        </div>
        <button className="chatbot-close" onClick={onToggle}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="chatbot-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.role === 'bot' && (
              <div className="msg-avatar">{getCategoryIcon(msg.category)}</div>
            )}
            <div className={`msg-bubble ${msg.role}`}>
              <div className="msg-text">{renderText(msg.text)}</div>
              <div className="msg-time">
                {msg.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message bot">
            <div className="msg-avatar">🤖</div>
            <div className="msg-bubble bot">
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chatbot-quick-actions">
        {quickActions.map((action, i) => (
          <button
            key={i}
            className="quick-action-btn"
            onClick={() => { setInput(action.query); }}
            disabled={loading}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="chatbot-input-area">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about accounts, rings, scores..."
          disabled={loading}
          className="chatbot-input"
        />
        <button
          className="chatbot-send"
          onClick={sendMessage}
          disabled={loading || !input.trim()}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default ChatBot;
