import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';
import api from '../api/client';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { path: '/events', label: 'Events', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
  { path: '/messages', label: 'Messages', icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  { path: '/alerts', label: 'Alerts', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0' },
  { path: '/distress', label: 'Distress', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01' },
  { path: '/live-chat', label: 'Live Chat', icon: 'M12 20h9 M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { path: '/hotlines', label: 'Hotlines', icon: 'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z' },
  { path: '/admin', label: 'Admin', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', adminOnly: true },
];

function getInitials(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

export default function Sidebar({ collapsed, onToggle, theme, onThemeToggle, themeLoaded }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sosLoading, setSosLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);

  const handleSOS = async () => {
    if (!user || user.role !== 'victim') return;
    if (!window.confirm('Send an SOS emergency signal? Help will be notified immediately.')) return;
    setSosLoading(true);
    try {
      await api.post('/distress', {
        title: 'SOS EMERGENCY - I need immediate help!',
        description: 'Urgent emergency situation. Immediate assistance required.',
        location: '',
        event_id: null,
      });
      setSosSent(true);
      setTimeout(() => setSosSent(false), 5000);
    } catch {
    } finally {
      setSosLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  if (!themeLoaded) return null;

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-header">
          <img src="/Logo.png" alt="EMS Logo" className="sidebar-logo" />
          <span className="sidebar-title">EMS</span>
          <button className="sidebar-toggle" onClick={onToggle} title="Toggle Sidebar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: collapsed ? 'none' : 'block' }}>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: collapsed ? 'block' : 'none' }}>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            if (item.adminOnly && user?.role !== 'admin') return null;
            return (
              <button
                key={item.path}
                className={`side-link${isActive(item.path) ? ' active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {user?.role === 'victim' && (
            <button
              className={`btn-sos${sosSent ? ' sos-active' : ''}`}
              onClick={handleSOS}
              disabled={sosLoading}
            >
              {sosSent ? 'SOS SENT!' : 'SOS'}
            </button>
          )}

          <div className="sidebar-user">
            <div className="user-badge">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" />
              ) : (
                getInitials(user?.display_name)
              )}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.display_name || ''}</span>
              <span className="sidebar-user-role">{user?.role || ''}</span>
            </div>
          </div>

          <div className="sidebar-actions">
            <button className="side-action" onClick={onThemeToggle} title="Toggle Theme">
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button className="side-action" onClick={handleLogout} title="Sign Out">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
