import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../api/client';
import './HotlinesPage.css';

export default function HotlinesPage() {
  const { showToast } = useOutletContext();
  const [hotlines, setHotlines] = useState([]);

  useEffect(() => {
    loadHotlines();
  }, []);

  const loadHotlines = async () => {
    try {
      const res = await api.get('/hotlines');
      setHotlines(res.data.hotlines || []);
    } catch (err) {
      showToast?.('Failed to load hotlines: ' + err.message, 'error');
    }
  };

  const grouped = hotlines.reduce((acc, h) => {
    const cat = h.category || 'Other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(h);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <h1>Emergency Hotlines</h1>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>City Government of Mati City</span>
      </div>

      <div className="section">
        <div className="hotlines-note">
          In case of emergency, please call the numbers below.
        </div>

        {hotlines.length === 0 ? (
          <p className="empty-state">Loading hotlines...</p>
        ) : (
          <div className="hotlines-grid">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {category}
                </h3>
                {items.map((h) => (
                  <div key={h.id} className="hotline-card">
                    <div className="hotline-card-header">
                      <span className="hotline-category">{category}</span>
                      <span className="hotline-agency">{h.agency || h.name}</span>
                    </div>
                    <div className="hotline-numbers">
                      {h.numbers.map((phone, i) => {
                        const phoneStr = phone.phone || phone.number || phone;
                        return (
                          <a key={i} href={`tel:${phoneStr}`} className="hotline-number">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>
                            {phoneStr}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
