import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import './DashboardPage.css';

export default function DashboardPage() {
  const { showToast } = useOutletContext();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ critical: 0, active: 0, alerts: 0, users: 0 });
  const [events, setEvents] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const evRes = await api.get('/events');
      const evs = (evRes.data.events || []).filter((e) => e.title !== 'Live Chat');
      setEvents(evs);
      setStats((prev) => ({
        ...prev,
        critical: evs.filter((e) => e.severity === 'critical' && e.status === 'active').length,
        active: evs.filter((e) => e.status === 'active').length,
      }));
      try {
        const alertRes = await api.get('/alerts');
        setStats((prev) => ({
          ...prev,
          alerts: (alertRes.data.alerts || []).filter((a) => !a.is_acknowledged).length,
        }));
      } catch {}
      try {
        const userRes = await api.get('/users');
        setStats((prev) => ({ ...prev, users: (userRes.data.users || []).length }));
      } catch {}
    } catch (err) {
      showToast?.('Failed to load dashboard: ' + err.message, 'error');
    }
  };

  const getSeverityClass = (severity) => {
    switch (severity) {
      case 'critical': return 'event-severity critical';
      case 'high': return 'event-severity high';
      case 'medium': return 'event-severity medium';
      case 'low': return 'event-severity low';
      default: return 'event-severity low';
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'active': return 'event-status active';
      case 'resolved': return 'event-status resolved';
      case 'archived': return 'event-status archived';
      default: return 'event-status';
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
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-critical">
          <div className="stat-value">{stats.critical}</div>
          <div className="stat-label">Critical Events</div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active Events</div>
        </div>
        <div className="stat-card stat-alerts">
          <div className="stat-value">{stats.alerts}</div>
          <div className="stat-label">Unacknowledged Alerts</div>
        </div>
        <div className="stat-card stat-users">
          <div className="stat-value">{stats.users}</div>
          <div className="stat-label">Active Users</div>
        </div>
      </div>

      <div className="section">
        <h2>Active Events</h2>
        {events.filter((e) => e.status === 'active').length === 0 ? (
          <p className="empty-state">No active events</p>
        ) : (
          <div className="events-list">
            {events.filter((e) => e.status === 'active').map((event) => (
              <div
                key={event.id}
                className="event-card"
                onClick={() => navigate('/events')}
              >
                <div className="event-card-header">
                  <span className={getSeverityClass(event.severity)}>
                    {event.severity}
                  </span>
                  <span className="event-card-title">{event.title}</span>
                  <span className={getStatusClass(event.status)}>{event.status}</span>
                </div>
                <div className="event-card-meta">
                  <span>Location: {event.location || 'N/A'}</span>
                  <span>Created: {formatDate(event.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
