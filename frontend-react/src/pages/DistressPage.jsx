import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import './DistressPage.css';

export default function DistressPage() {
  const { showToast } = useOutletContext();
  const { user } = useAuth();
  const [signals, setSignals] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    location: '',
    event_id: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSignals();
  }, []);

  const loadSignals = async () => {
    try {
      const res = await api.get('/distress');
      setSignals(res.data.signals || []);
    } catch (err) {
      showToast?.('Failed to load distress signals: ' + err.message, 'error');
    }
  };

  const openModal = async () => {
    try {
      const evRes = await api.get('/events');
      setEvents(evRes.data.events || []);
    } catch {}
    setShowModal(true);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.title) {
      showToast?.('Please describe what you need help with', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/distress', {
        title: form.title,
        description: form.description,
        location: form.location,
        event_id: form.event_id ? parseInt(form.event_id) : null,
      });
      setShowModal(false);
      setForm({ title: '', description: '', location: '', event_id: '' });
      showToast?.('Distress signal sent! Help is on the way.', 'success');
      loadSignals();
    } catch (err) {
      showToast?.('Failed to send distress signal: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespond = async (signalId) => {
    try {
      await api.put('/distress/' + signalId, { status: 'responded' });
      showToast?.('You have responded to this distress signal', 'success');
      loadSignals();
    } catch (err) {
      showToast?.('Failed to respond: ' + err.message, 'error');
    }
  };

  const handleResolve = async (signalId) => {
    try {
      await api.put('/distress/' + signalId, { status: 'resolved' });
      showToast?.('Distress signal resolved', 'success');
      loadSignals();
    } catch (err) {
      showToast?.('Failed to resolve: ' + err.message, 'error');
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

  const isVictim = user?.role === 'victim';
  const canRespond = user?.role === 'admin' || user?.role === 'responder' || user?.role === 'operator';

  return (
    <div>
      <div className="page-header">
        <h1>Distress Signals</h1>
        {isVictim && (
          <button className="btn btn-danger" onClick={openModal}>Send Distress Signal</button>
        )}
      </div>

      <div className="section">
        {signals.length === 0 ? (
          <p className="empty-state">No distress signals</p>
        ) : (
          <div className="distress-list">
            {signals.map((s) => (
              <div key={s.id} className={`distress-card ${s.status}`}>
                <div className="distress-card-header">
                  <span className={`distress-status ${s.status}`}>{s.status}</span>
                  <span className="distress-card-title">{s.title}</span>
                </div>
                {s.description && (
                  <div className="distress-card-desc">{s.description}</div>
                )}
                <div className="distress-card-meta">
                  <span>From: {s.victim_name || 'Unknown'}</span>
                  {s.location && <span>Location: {s.location}</span>}
                  <span>Time: {formatDate(s.created_at)}</span>
                </div>
                {s.status === 'active' && canRespond && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-small btn-primary" onClick={() => handleRespond(s.id)}>
                      Respond
                    </button>
                    <button className="btn btn-small btn-outline" onClick={() => handleResolve(s.id)}>
                      Resolve
                    </button>
                  </div>
                )}
                {s.status === 'responded' && canRespond && (
                  <div style={{ marginTop: 10 }}>
                    <button className="btn btn-small btn-success" onClick={() => handleResolve(s.id)}>
                      Resolve
                    </button>
                  </div>
                )}
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
              <h2>Send Distress Signal</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSend}>
              <div className="modal-body">
                <div className="form-group">
                  <label>What do you need help with?</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Need medical assistance"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (optional)</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Describe your situation..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Your Location (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Building 3, Floor 2"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Related Emergency Event (optional)</label>
                  <select
                    className="form-input"
                    value={form.event_id}
                    onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                  >
                    <option value="">Not related to a specific event</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        [{ev.severity.toUpperCase()}] {ev.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-danger" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send Signal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
