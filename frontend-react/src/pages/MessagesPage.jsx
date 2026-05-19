import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import './MessagesPage.css';

const quickReplies = [
  { text: 'I need help, please respond', label: 'Need Help' },
  { text: 'I am safe and accounted for', label: 'I am Safe' },
  { text: 'I need medical assistance', label: 'Need Medical' },
  { text: 'I need food and water supplies', label: 'Need Supplies' },
  { text: 'There are injured people here', label: 'Injured Here' },
  { text: 'What is the current status?', label: 'Status?' },
  { text: 'I am trapped, need rescue', label: 'Trapped' },
];

export default function MessagesPage() {
  const { showToast } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [file, setFile] = useState(null);
  const boardRef = useRef(null);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollTop = boardRef.current.scrollHeight;
    }
  }, [messages]);

  const loadEvents = async () => {
    try {
      const res = await api.get('/events?status=active');
      setEvents(res.data.events || []);
    } catch {}
  };

  const loadMessages = async () => {
    if (!selectedEventId) return;
    try {
      const res = await api.get('/messages?event_id=' + selectedEventId);
      setMessages(res.data.messages || []);
    } catch (err) {
      showToast?.('Failed to load messages: ' + err.message, 'error');
    }
  };

  const sendMessage = async (quickText) => {
    const msgContent = quickText || content;
    if (!selectedEventId) {
      showToast?.('Select an event first', 'error');
      return;
    }
    if (!msgContent && !file) {
      showToast?.('Message content or file is required', 'error');
      return;
    }

    try {
      if (file) {
        const formData = new FormData();
        formData.append('content', msgContent || '');
        formData.append('priority', priority);
        formData.append('attachment', file);
        const token = localStorage.getItem('ems_token');
        await fetch('http://localhost:8000/api/messages?event_id=' + selectedEventId, {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
          body: formData,
        });
      } else {
        await api.post('/messages?event_id=' + selectedEventId, { content: msgContent, priority });
      }
      setContent('');
      setFile(null);
      loadMessages();
    } catch (err) {
      showToast?.('Failed to send message: ' + err.message, 'error');
    }
  };

  const getPriorityClass = (p) => {
    switch (p) {
      case 'urgent': return 'message-item urgent';
      case 'high': return 'message-item high';
      case 'system': return 'message-item system';
      case 'command': return 'message-item command';
      default: return 'message-item';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Active Event Messages</h1>
      </div>

      <div className="section">
        <div className="filter-bar">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
          >
            <option value="">Select an event to view messages</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                [{ev.severity.toUpperCase()}] {ev.title}
              </option>
            ))}
          </select>
        </div>

        <div className="message-board" ref={boardRef}>
          {!selectedEventId ? (
            <div className="message-board-placeholder">
              <p>Select an event above to view its message thread.</p>
            </div>
          ) : messages.length === 0 ? (
            <p className="empty-state">No messages yet</p>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={getPriorityClass(msg.priority)}>
                <div className="message-meta">
                  <span className="message-sender">{msg.sender_name || msg.user_name || 'Unknown'}</span>
                  <span className="message-time">{formatDate(msg.created_at)}</span>
                  {msg.priority && msg.priority !== 'normal' && (
                    <span className={`message-badge ${msg.priority}`}>{msg.priority}</span>
                  )}
                </div>
                <div className="message-content">{msg.content}</div>
                {msg.attachment_url && (
                  <div style={{ marginTop: 8 }}>
                    <a href={msg.attachment_url} target="_blank" rel="noopener noreferrer" className="btn btn-small btn-outline">
                      View Attachment
                    </a>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {selectedEventId && (
          <div className="message-input-area">
            <div className="quick-replies">
              {quickReplies.map((qr, i) => (
                <button
                  key={i}
                  className="btn btn-quick"
                  onClick={() => sendMessage(qr.text)}
                >
                  {qr.label}
                </button>
              ))}
            </div>

            <textarea
              rows="3"
              placeholder="Type your message here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />

            <div className="message-input-controls">
              <input
                type="file"
                id="msg-file-input"
                style={{ display: 'none' }}
                onChange={(e) => setFile(e.target.files[0])}
              />
              <button
                className="btn btn-small btn-outline"
                onClick={() => document.getElementById('msg-file-input').click()}
              >
                {file ? file.name : 'Attach File'}
              </button>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <button className="btn btn-primary" onClick={() => sendMessage()}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
