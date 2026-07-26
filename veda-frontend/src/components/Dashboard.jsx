import React from 'react';

export const Dashboard = () => (
  <div className="animate-fadeIn">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
      {['System Status', 'Meter Library', 'AI Engine'].map((t, i) => (
        <div key={i} className="glass-panel" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{t}</p>
          <h3 style={{ fontSize: '1.5rem', marginTop: '0.5rem', color: i===0 ? '#4ade80' : 'white' }}>
            {i===0 ? 'Online' : 'Active'}
          </h3>
        </div>
      ))}
    </div>
    <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), transparent)' }}>
      <h2 style={{ fontFamily: 'var(--font-ancient)', fontSize: '3rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Project Veda</h2>
      <p style={{ color: 'var(--text-muted)' }}>Computational Sanskrit Prosody Engine</p>
    </div>
  </div>
);
