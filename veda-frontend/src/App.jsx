import React, { useState } from 'react';
import { Home, Search, PenTool, LogOut } from 'lucide-react';
import './App.css'; 

import { AuthGate } from './components/AuthGate';
import { Particles } from './components/Particles';
import { Dashboard } from './components/Dashboard';
import { Analyzer } from './components/Analyzer';
import { Generator } from './components/Generator';

// --- CONFIGURATION ---
const API_BASE = import.meta.env.VITE_BASE_URL || "http://localhost:3000"; 
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID_HERE"; 

export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');

  if (!user) {
    return (
      <div className="app-layout">
        <Particles />
        <AuthGate onLogin={setUser} googleClientId={GOOGLE_CLIENT_ID} apiBase={API_BASE} />
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Particles />
      
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="brand-section">
          <div style={{ fontSize: '2.5rem', color: 'var(--gold)', lineHeight: 1 }}>ॐ</div>
          <div>
            <div className="brand-title">PROJECT</div>
            <span className="brand-subtitle">VEDA</span>
          </div>
        </div>
        
        <nav className="nav-menu">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'analyze', icon: Search, label: 'Analyzer' },
            { id: 'generate', icon: PenTool, label: 'Generator' },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setTab(item.id)}
              className={`nav-item ${tab === item.id ? 'active' : ''}`}
            >
              <item.icon size={18} /> {item.label}
            </button>
          ))}
        </nav>
        
        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border-glass)', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--gold), #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'black' }}>
                {user.charAt(0)}
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>{user}</div>
                <div style={{ fontSize: '0.7rem', color: '#4ade80' }}>Connected</div>
              </div>
            </div>
            <button onClick={() => setUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <LogOut size={18}/>
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT AREA */}
      <main className="main-content">
        <header className="top-header">
          <h1 style={{ fontFamily: 'var(--font-ancient)', fontSize: '1.8rem', color: 'white' }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </h1>
          <div style={{ fontSize: '0.75rem', padding: '4px 12px', border: '1px solid var(--border-glass)', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
            v2.1 UI
          </div>
        </header>
        
        <div className="view-container">
          <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'analyze' && <Analyzer apiBase={API_BASE} />}
            {tab === 'generate' && <Generator apiBase={API_BASE} />}
          </div>
        </div>
      </main>
    </div>
  );
}