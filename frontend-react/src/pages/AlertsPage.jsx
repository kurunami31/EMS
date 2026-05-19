import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import './AlertsPage.css';

export default function AlertsPage() {
  const { showToast } = useOutletContext();
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    event_id: '',
    type: 'evacuation',
    target_role: 'all',
    title: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [filter]);

  const loadAlerts = async () => {
    try {
      const params = filter !== 'all' ? '?status=' + filter : '';
      const res = await api.get('/alerts' + params);
      setAlerts(res.data.alerts || []);
    } catch (err) {
      showToast?.('Failed to load alerts: ' + err.message, 'error');
    }
  };

  const openModal = async () => {
    try {
      const evRes = await api.get('/events');
      setEvents(evRes.data.events || []);
    } catch {}
    setShowModal(true);
  };

  const handleDispatch = async (e) => {
    e.preventDefault();
    if (!form.event_id || !form.title || !form.message) {
      showToast?.('Event, title, and message are required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/alerts', {
        event_id: parseInt(form.event_id),
        type: form.type,
        target_role: form.target_role,
        title: form.title,
        message: form.message,
      });
      setShowModal(false);
      setForm({ event_id: '', type: 'evacuation', target_role: 'all', title: '', message: '' });
      showToast?.('Alert dispatched', 'success');
      loadAlerts();
    } catch (err) {
      showToast?.('Failed to dispatch alert: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.put('/alerts/' + alertId);
      showToast?.('Alert acknowledged', 'success');
      loadAlerts();
    } catch (err) {
      showToast?.('Failed to acknowledge: ' + err.message, 'error');
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
        <h1>Alerts</h1>
        <div className="header-actions">
          <button className="btn btn-danger" onClick={openModal}>Dispatch Alert</button>
        </div>
      </div>

      <div className="section">
        <div className="filter-bar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">Active Alerts</option>
            <option value="all">All Alerts</option>
          </select>
        </div>

        {alerts.length === 0 ? (
          <p className="empty-state">No alerts found</p>
        ) : (
          <div className="alerts-list">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-card${alert.is_acknowledged ? ' acknowledged' : ' unacknowledged'}`}
              >
                <div className="alert-card-header">
                  <span className="alert-type-badge">{alert.type}</span>
                  <span className="alert-card-title">{alert.title}</span>
                  {!alert.is_acknowledged && (
                    <button className="btn btn-small btn-primary" onClick={() => handleAcknowledge(alert.id)}>
                      Acknowledge
                    </button>
                  )}
                  {alert.is_acknowledged && (
                    <span className="event-status active">Acknowledged</span>
                  )}
                </div>
                <div className="alert-card-message">{alert.message}</div>
                <div className="alert-card-meta">
                  <span>Target: {alert.target_role || 'all'}</span>
                  <span>By: {alert.dispatcher_name || 'System'}</span>
                  <span>Time: {formatDate(alert.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal">
          <div className="modal-backdrop" onClick={() => setShowModal(false)} />
          <div className="modal-content">
            <div className="modal-header">
              <h2>Dispatch Alert</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleDispatch}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Event</label>
                  <select
                    className="form-input"
                    value={form.event_id}
                    onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  >
                    <option value="">Select event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        [{ev.severity.toUpperCase()}] {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Alert Type</label>
                  <select className="form-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="evacuation">Evacuation</option>
                    <option value="lockdown">Lockdown</option>
                    <option value="medical">Medical</option>
                    <option value="fire">Fire</option>
                    <option value="weather">Weather</option>
                    <option value="security">Security</option>
                    <option value="test">Test</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Role</label>
                  <select className="form-input" value={form.target_role} onChange={(e) => setForm({ ...form, target_role: e.target.value })}>
                    <option value="all">All Personnel</option>
                    <option value="admin">Administrators</option>
                    <option value="responder">Responders</option>
                    <option value="operator">Operators</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Alert Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Alert title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Alert Message</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Alert message content"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? 'Dispatching...' : 'Dispatch Alert'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
