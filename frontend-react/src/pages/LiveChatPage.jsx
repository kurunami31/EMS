import { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import './LiveChatPage.css';

export default function LiveChatPage() {
  const { showToast } = useOutletContext();
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [search, setSearch] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    loadUsers();
    startPolling();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadMessages(selectedUser.id);
    }
  }, [selectedUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startPolling = useCallback(() => {
    pollingRef.current = setInterval(() => {
      if (selectedUser) {
        loadMessages(selectedUser.id, true);
      }
    }, 3000);
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const res = await api.get('/users');
      const allUsers = (res.data.users || []).filter((u) => u.id !== user?.id);
      setUsers(allUsers);
    } catch (err) {
      showToast?.('Failed to load users: ' + err.message, 'error');
    }
  };

  const loadMessages = async (userId, silent) => {
    try {
      const res = await api.get('/direct-messages', { params: { user_id: userId } });
      const msgs = res.data.messages || [];
      setMessages(msgs);
      if (!silent) {
        setUnreadCounts((prev) => ({ ...prev, [userId]: 0 }));
      }
    } catch {
    }
  };

  const sendChatMessage = async () => {
    if (!selectedUser || !chatInput.trim()) return;
    try {
      await api.post('/direct-messages', {
        recipient_id: selectedUser.id,
        content: chatInput.trim(),
      });
      setChatInput('');
      loadMessages(selectedUser.id);
    } catch (err) {
      showToast?.('Failed to send message: ' + err.message, 'error');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString();
    } catch {
      return dateStr;
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Live Chat</h1>
      </div>

      <div className="chat-container">
        <div className="chat-user-list">
          <div className="chat-user-search">
            <input
              type="text"
              className="form-input"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="chat-user-items">
            {filteredUsers.length === 0 ? (
              <p className="empty-state" style={{ padding: 12, fontSize: 12 }}>No users found</p>
            ) : (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  className={`chat-user-item${selectedUser?.id === u.id ? ' active' : ''}`}
                  onClick={() => setSelectedUser(u)}
                >
                  <div className="chat-user-avatar">{getInitials(u.display_name)}</div>
                  <div className="chat-user-info">
                    <div className="chat-user-name">
                      {u.display_name}
                      <span className="chat-user-role-tag">{u.role}</span>
                    </div>
                  </div>
                  {unreadCounts[u.id] > 0 && (
                    <span className="chat-user-unread">{unreadCounts[u.id]}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="chat-main">
          <div className="chat-conversation-header">
            <span className="chat-conversation-name">
              {selectedUser ? selectedUser.display_name : 'Select a user to chat with'}
            </span>
          </div>

          <div className="chat-messages">
            {!selectedUser ? (
              <p className="empty-state">Select a user from the sidebar to start chatting.</p>
            ) : messages.length === 0 ? (
              <p className="empty-state">No messages yet. Say hello!</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`dm-msg${isMine ? ' dm-msg-mine' : ''}`}>
                    <div className="dm-msg-header">
                      <span className="dm-msg-sender">
                        {isMine ? 'You' : (msg.sender_name || 'Unknown')}
                      </span>
                      <span className="dm-msg-time">{formatTime(msg.created_at)}</span>
                    </div>
                    <div className="dm-msg-content">{msg.content}</div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {selectedUser && (
            <div className="chat-input-area">
              <textarea
                className="chat-input"
                rows="2"
                placeholder="Type your message here..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn btn-primary" onClick={sendChatMessage}>Send</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
