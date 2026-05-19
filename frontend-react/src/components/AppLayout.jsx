import { useState, useEffect, useCallback } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from './Sidebar';
import './AppLayout.css';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('ems_sidebar') === 'collapsed';
  });
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('ems_theme') || 'light';
  });
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ems_theme') || 'light';
    const userTheme = user?.theme_preference;
    const activeTheme = userTheme || savedTheme;
    setTheme(activeTheme);
    document.documentElement.classList.toggle('dark-mode', activeTheme === 'dark');
    document.documentElement.classList.toggle('light-mode', activeTheme === 'light');
    setThemeLoaded(true);
  }, [user]);

  useEffect(() => {
    if (!themeLoaded) return;
    document.documentElement.classList.toggle('dark-mode', theme === 'dark');
    document.documentElement.classList.toggle('light-mode', theme === 'light');
    localStorage.setItem('ems_theme', theme);
  }, [theme, themeLoaded]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('ems_sidebar', next ? 'collapsed' : 'expanded');
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const showToast = useCallback((message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
        theme={theme}
        onThemeToggle={toggleTheme}
        themeLoaded={themeLoaded}
      />
      <div className="main-content">
        <div className="top-bar">
          <button className="top-bar-toggle" onClick={toggleSidebar}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div className="top-bar-title">
            <span className="status-indicator status-live">System Live</span>
          </div>
          <div className="top-bar-actions">
            <span className="top-bar-user">{user?.display_name}</span>
            <div className="user-badge" style={{ width: 32, height: 32, fontSize: 13 }}>
              {user?.display_name?.charAt(0).toUpperCase() || '?'}
            </div>
          </div>
        </div>
        <div className="content-area">
          <Outlet context={{ showToast }} />
        </div>
      </div>

      {toast && (
        <div className={`toast ${toast.type || ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
