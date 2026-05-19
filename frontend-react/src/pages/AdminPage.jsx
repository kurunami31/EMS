import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import './AdminPage.css';

export default function AdminPage() {
  const { showToast } = useOutletContext();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [logs, setLogs] = useState([]);
  const [events, setEvents] = useState([]);
  const [xmlInput, setXmlInput] = useState('');
  const [xmlResult, setXmlResult] = useState('');
  const [xmlExportEvent, setXmlExportEvent] = useState('');
  const [systemOutput, setSystemOutput] = useState('');

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'logs') loadLogs();
    if (activeTab === 'xml') loadEventsForXml();
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      const params = userSearch ? '?search=' + encodeURIComponent(userSearch) : '';
      const res = await api.get('/users' + params);
      setUsers(res.data.users || []);
    } catch (err) {
      showToast?.('Failed to load users: ' + err.message, 'error');
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await api.put('/users/' + userId, { role });
      showToast?.('User role updated', 'success');
      loadUsers();
    } catch (err) {
      showToast?.('Failed to update role: ' + err.message, 'error');
    }
  };

  const loadLogs = async () => {
    try {
      const res = await api.get('/system/logs', { params: { limit: 100 } });
      setLogs(res.data.logs || []);
    } catch (err) {
      showToast?.('Failed to load logs: ' + err.message, 'error');
    }
  };

  const loadEventsForXml = async () => {
    try {
      const res = await api.get('/events');
      setEvents(res.data.events || []);
    } catch {}
  };

  const exportXML = async () => {
    if (!xmlExportEvent) {
      showToast?.('Select an event to export', 'error');
      return;
    }
    try {
      const res = await api.get('/system/export-xml', {
        params: { event_id: xmlExportEvent },
        headers: { Accept: 'application/xml' },
      });
      const xml = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      const blob = new Blob([xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'event_' + xmlExportEvent + '_export.xml';
      a.click();
      URL.revokeObjectURL(url);
      showToast?.('XML exported successfully', 'success');
    } catch (err) {
      showToast?.('Export failed: ' + err.message, 'error');
    }
  };

  const importXML = async () => {
    if (!xmlInput.trim()) {
      showToast?.('Paste XML data to import', 'error');
      return;
    }
    try {
      const res = await api.post('/system/import-xml', xmlInput, {
        headers: { 'Content-Type': 'application/xml' },
      });
      setXmlResult('Imported ' + (res.data.imported_count || 0) + ' messages successfully.');
      showToast?.('XML imported: ' + (res.data.imported_count || 0) + ' messages', 'success');
    } catch (err) {
      setXmlResult('Import failed: ' + (err.response?.data?.error || err.message));
      showToast?.('Import failed: ' + err.message, 'error');
    }
  };

  const runSystemAction = async (action) => {
    setSystemOutput('Running ' + action + '...');
    try {
      let endpoint, params = {}, method = 'get';
      if (action.includes('&')) {
        const [act, ...pairs] = action.split('&');
        endpoint = act;
        pairs.forEach(p => {
          const [k, v] = p.split('=');
          params[k] = v;
        });
      } else {
        endpoint = action;
      }
      let res;
      if (endpoint === 'archive' || endpoint === 'escalate' || endpoint === 'retry-dead-letter') {
        res = await api.post('/system/' + endpoint, null, { params });
      } else {
        res = await api.get('/system/' + endpoint, { params });
      }
      setSystemOutput(JSON.stringify(res.data, null, 2));
    } catch (err) {
      setSystemOutput('Error: ' + err.message);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.charAt(0).toUpperCase();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const permissions = [
    { name: 'View Events', roles: ['admin', 'responder', 'operator', 'viewer', 'victim'] },
    { name: 'Create Events', roles: ['admin', 'responder', 'operator'] },
    { name: 'Resolve Events', roles: ['admin', 'responder', 'operator'] },
    { name: 'View Alerts', roles: ['admin', 'responder', 'operator', 'viewer', 'victim'] },
    { name: 'Dispatch Alerts', roles: ['admin', 'responder'] },
    { name: 'Acknowledge Alerts', roles: ['admin', 'responder', 'operator'] },
    { name: 'Send Messages', roles: ['admin', 'responder', 'operator', 'viewer', 'victim'] },
    { name: 'View Distress Signals', roles: ['admin', 'responder', 'operator'] },
    { name: 'Respond to Distress', roles: ['admin', 'responder', 'operator'] },
    { name: 'Send SOS/Distress', roles: ['victim'] },
    { name: 'View Users', roles: ['admin', 'responder', 'operator'] },
    { name: 'Manage Users', roles: ['admin'] },
    { name: 'System Automation', roles: ['admin'] },
    { name: 'XML Tools', roles: ['admin'] },
    { name: 'View Audit Logs', roles: ['admin'] },
    { name: 'Admin Panel', roles: ['admin'] },
  ];

  const allRoles = ['admin', 'responder', 'operator', 'viewer', 'victim'];

  return (
    <div>
      <div className="page-header">
        <h1>Administration</h1>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab${activeTab === 'users' ? ' active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`admin-tab${activeTab === 'system' ? ' active' : ''}`}
          onClick={() => setActiveTab('system')}
        >
          System
        </button>
        <button
          className={`admin-tab${activeTab === 'logs' ? ' active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Audit Log
        </button>
        <button
          className={`admin-tab${activeTab === 'xml' ? ' active' : ''}`}
          onClick={() => setActiveTab('xml')}
        >
          XML Tools
        </button>
        <button
          className={`admin-tab${activeTab === 'permissions' ? ' active' : ''}`}
          onClick={() => setActiveTab('permissions')}
        >
          Permissions
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="admin-panel active">
          <h2>User Management</h2>
          <div className="filter-bar">
            <form
              onSubmit={(e) => { e.preventDefault(); loadUsers(); }}
              style={{ display: 'flex', gap: 8, width: '100%' }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="Search users..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ flex: 1 }}
              />
              <button type="submit" className="btn btn-outline">Search</button>
            </form>
          </div>
          <div className="users-list">
            {users.length === 0 ? (
              <p className="empty-state">No users found</p>
            ) : (
              users.map((u) => (
                <div key={u.id} className="user-card">
                  <div className="user-card-avatar">{getInitials(u.display_name)}</div>
                  <div className="user-card-info">
                    <div className="user-card-name">{u.display_name}</div>
                    <div className="user-card-email">{u.email}</div>
                  </div>
                  <select
                    className="user-card-role-select"
                    value={u.role}
                    onChange={(e) => updateUserRole(u.id, e.target.value)}
                  >
                    <option value="victim">Victim</option>
                    <option value="viewer">Viewer</option>
                    <option value="operator">Operator</option>
                    <option value="responder">Responder</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'system' && (
        <div className="admin-panel active">
          <h2>System Automation</h2>
          <div className="system-actions">
            <div className="action-card" onClick={() => runSystemAction('health')}>
              <h3>Health Check</h3>
              <p>Run system diagnostics</p>
            </div>
            <div className="action-card" onClick={() => runSystemAction('report')}>
              <h3>Daily Report</h3>
              <p>Generate activity report</p>
            </div>
            <div className="action-card" onClick={() => runSystemAction('archive&days=7')}>
              <h3>Archive Events</h3>
              <p>Archive old resolved events</p>
            </div>
            <div className="action-card" onClick={() => runSystemAction('escalate&minutes=30')}>
              <h3>Escalate Alerts</h3>
              <p>Escalate unattended alerts</p>
            </div>
            <div className="action-card" onClick={() => runSystemAction('retry-dead-letter')}>
              <h3>Retry Dead Letters</h3>
              <p>Retry failed messages</p>
            </div>
          </div>
          {systemOutput && (
            <div className="system-output">{systemOutput}</div>
          )}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="admin-panel active">
          <h2>Audit Log</h2>
          <div className="logs-list">
            {logs.length === 0 ? (
              <p className="empty-state">No audit log entries found</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="log-entry">
                  <div>
                    <span className="log-entry-time">{formatDate(log.created_at)}</span>
                    {' - '}
                    <span className="log-entry-user">{log.user_name || 'System'}</span>
                    {' - '}
                    <span className="log-entry-action">{log.action}</span>
                  </div>
                  {log.details && <div className="log-entry-details">{log.details}</div>}
                  {log.ip_address && <div className="log-entry-details">IP: {log.ip_address}</div>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'xml' && (
        <div className="admin-panel active">
          <h2>XML Data Transformation</h2>
          <div className="xml-tools">
            <div className="xml-section">
              <h3>Export Messages to XML</h3>
              <div className="filter-bar">
                <select
                  value={xmlExportEvent}
                  onChange={(e) => setXmlExportEvent(e.target.value)}
                >
                  <option value="">Select event to export</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      [{ev.severity.toUpperCase()}] {ev.title}
                    </option>
                  ))}
                </select>
                <button className="btn btn-primary" onClick={exportXML}>Export as XML</button>
              </div>
            </div>
            <div className="xml-section">
              <h3>Import Messages from XML</h3>
              <textarea
                rows="8"
                className="form-input"
                placeholder="Paste XML data here..."
                value={xmlInput}
                onChange={(e) => setXmlInput(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
              />
              <button className="btn btn-primary" onClick={importXML} style={{ marginTop: 8 }}>
                Import from XML
              </button>
              {xmlResult && (
                <div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--bg-secondary)', fontSize: 13 }}>
                  {xmlResult}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'permissions' && (
        <div className="admin-panel active">
          <h2>Permissions Matrix</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px' }}>Permission</th>
                  {allRoles.map((role) => (
                    <th key={role} style={{ textAlign: 'center', padding: '10px 12px', textTransform: 'capitalize' }}>
                      {role}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {permissions.map((perm, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 500 }}>{perm.name}</td>
                    {allRoles.map((role) => {
                      const has = perm.roles.includes(role);
                      return (
                        <td key={role} style={{ textAlign: 'center', padding: '10px 12px' }}>
                          {has ? (
                            <span style={{ color: 'var(--color-success)', fontWeight: 700 }}>&#10003;</span>
                          ) : (
                            <span style={{ color: 'var(--text-light)' }}>&#8212;</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
