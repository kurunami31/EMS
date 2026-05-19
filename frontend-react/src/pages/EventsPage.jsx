import { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import L from 'leaflet';
import api from '../api/client';
import 'leaflet/dist/leaflet.css';
import './EventsPage.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

export default function EventsPage() {
  const { showToast } = useOutletContext();
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [form, setForm] = useState({ title: '', severity: 'medium', location: '', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    loadEvents();
  }, [filter]);

  useEffect(() => {
    if (showMap && mapRef.current && !mapInstanceRef.current) {
      const map = L.map(mapRef.current).setView([14.5, 121], 10);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const eventsWithLocation = events.filter((e) => e.location);
      eventsWithLocation.forEach((e) => {
        const lat = 14.5 + (Math.random() - 0.5) * 1.5;
        const lng = 121 + (Math.random() - 0.5) * 1.5;
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(
          `<b>${e.title}</b><br>${e.location}<br>Severity: ${e.severity}`
        );
      });

      setTimeout(() => map.invalidateSize(), 300);
      mapInstanceRef.current = map;
    }

    if (!showMap && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMap, events]);

  const loadEvents = async () => {
    try {
      const params = [];
      if (filter !== 'all') params.push('status=' + filter);
      if (search) params.push('search=' + encodeURIComponent(search));
      const qs = params.length ? '?' + params.join('&') : '';
      const res = await api.get('/events' + qs);
      setEvents(res.data.events || []);
    } catch (err) {
      showToast?.('Failed to load events: ' + err.message, 'error');
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadEvents();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title) {
      showToast?.('Event title is required', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/events', form);
      setShowModal(false);
      setForm({ title: '', severity: 'medium', location: '', description: '' });
      showToast?.('Event created successfully', 'success');
      loadEvents();
    } catch (err) {
      showToast?.('Failed to create event: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (eventId) => {
    if (!window.confirm('Resolve this event?')) return;
    try {
      await api.put('/events/' + eventId, { status: 'resolved' });
      showToast?.('Event resolved', 'success');
      loadEvents();
    } catch (err) {
      showToast?.('Failed to resolve event: ' + err.message, 'error');
    }
  };

  const printReport = async () => {
    try {
      const res = await api.get('/events');
      const allEvents = res.data.events || [];
      const w = window.open('', '_blank');
      w.document.write('<html><head><title>Emergency Report</title>');
      w.document.write('<style>');
      w.document.write('body{font-family:Arial;padding:40px;}');
      w.document.write('h1{color:#1e293b;}');
      w.document.write('table{width:100%;border-collapse:collapse;margin-top:20px;}');
      w.document.write('th,td{padding:10px;text-align:left;border-bottom:1px solid #ddd;}');
      w.document.write('th{background:#f1f5f9;}');
      w.document.write('.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;}');
      w.document.write('.critical{background:#dc2626;color:white;}');
      w.document.write('.high{background:#ea580c;color:white;}');
      w.document.write('.medium{background:#ca8a04;color:white;}');
      w.document.write('.low{background:#64748b;color:white;}');
      w.document.write('.active{color:#16a34a;}.resolved{color:#64748b;}');
      w.document.write('</style></head><body>');
      w.document.write('<h1>Emergency Incident Report</h1>');
      w.document.write('<p>Generated: ' + new Date().toLocaleString() + '</p>');
      w.document.write('<p>Total Events: ' + allEvents.length + '</p>');
      w.document.write('<table><thead><tr><th>Title</th><th>Severity</th><th>Status</th><th>Location</th><th>Created</th></tr></thead><tbody>');
      allEvents.forEach((e) => {
        w.document.write(
          '<tr><td>' + (e.title || '') + '</td>' +
          '<td><span class="badge ' + (e.severity || 'low') + '">' + (e.severity || 'low') + '</span></td>' +
          '<td class="' + (e.status || '') + '">' + (e.status || '') + '</td>' +
          '<td>' + (e.location || 'N/A') + '</td>' +
          '<td>' + (e.created_at ? new Date(e.created_at).toLocaleString() : '') + '</td></tr>'
        );
      });
      w.document.write('</tbody></table></body></html>');
      w.document.close();
      setTimeout(() => w.print(), 500);
    } catch (err) {
      showToast?.('Failed to generate report: ' + err.message, 'error');
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
        <h1>Emergency Events</h1>
        <div className="header-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-small btn-outline" onClick={() => setShowMap((p) => !p)}>
            {showMap ? 'Hide Map' : 'Show Map'}
          </button>
          <button className="btn btn-small btn-outline" onClick={printReport}>Print Report</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Create Event</button>
        </div>
      </div>

      {showMap && (
        <div className="section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Incident Map</h2>
          </div>
          <div ref={mapRef} style={{ height: 300, borderRadius: 8 }} />
        </div>
      )}

      <div className="section">
        <div className="filter-bar">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="active">Active Events</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
            <option value="all">All</option>
          </select>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1 }}>
            <input
              type="text"
              className="form-input"
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn btn-outline">Search</button>
          </form>
        </div>

        {events.length === 0 ? (
          <p className="empty-state">No events found</p>
        ) : (
          <div className="events-list">
            {events.map((event) => (
              <div key={event.id} className="event-card">
                <div className="event-card-header">
                  <span className={getSeverityClass(event.severity)}>{event.severity}</span>
                  <span className="event-card-title">{event.title}</span>
                  <span className={getStatusClass(event.status)}>{event.status}</span>
                </div>
                <div className="event-card-meta">
                  <span>Location: {event.location || 'N/A'}</span>
                  <span>Created: {formatDate(event.created_at)}</span>
                </div>
                {event.status === 'active' && (
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button className="btn btn-small btn-outline" onClick={() => handleResolve(event.id)}>
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
              <h2>Create Emergency Event</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Event Title</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter event title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Severity</label>
                  <select
                    className="form-input"
                    value={form.severity}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Location (optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter location"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    className="form-input"
                    rows="4"
                    placeholder="Describe the emergency event"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
