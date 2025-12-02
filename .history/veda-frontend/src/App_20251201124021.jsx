import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Search, PenTool, BookOpen, Settings, LogOut, CheckCircle, AlertCircle, Loader2, Sparkles, Lock, Server
} from 'lucide-react';
import './App.css'; // Imports the Dark Ancient Theme

// --- CONFIGURATION ---
const API_BASE = "http://localhost:3000"; 
// Replace this with your ID from Google Cloud Console. 
// If invalid/placeholder, the app will enable "Guest Mode" for you.
const GOOGLE_CLIENT_ID = "713483559597-f8tt5257alpri9ftb7hfrv2bu2tj5naq.apps.googleusercontent.com"; 

// --- 1. AUTH COMPONENT ---
const AuthGate = ({ onLogin }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check for missing ID
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_")) {
      setIsDemoMode(true);
      return;
    }
    // Load Google Script
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; 
    script.defer = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => verifyToken(res.credential)
      });
      const btn = document.getElementById("google-btn");
      if(btn) window.google.accounts.id.renderButton(btn, { theme: "filled_black", size: "large", shape: "pill", width: "250" });
    };
  }, []);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if(data.success) onLogin(data.user);
      else alert("Login Failed: " + data.detail);
    } catch(e) { console.error(e); alert("Connection Error"); }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-logo">ॐ</div>
        <h2 style={{ fontFamily: 'var(--font-ancient)', fontSize: '2rem', color: 'white', marginBottom: '0.5rem' }}>
          Chanda Viveka
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.8rem', letterSpacing: '2px' }}>
          IDENTITY VERIFICATION REQUIRED
        </p>
        
        <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)', width: '100%', marginBottom: '2rem' }}></div>

        <div id="google-btn" style={{ minHeight: '44px', display: 'flex', justifyContent: 'center' }}>
          {isDemoMode && (
            <button 
              onClick={() => onLogin("Guest Poet")} 
              className="btn-primary" 
              style={{ width: 'auto', padding: '0.8rem 2rem', background: 'white', color: 'black', fontFamily: 'var(--font-body)' }}
            >
              <div style={{ width: 8, height: 8, background: '#4ade80', borderRadius: '50%' }}></div>
              Enter as Guest
            </button>
          )}
        </div>
        
        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <Lock size={12}/> Secure Gateway Access
        </div>
      </div>
    </div>
  );
};

// --- 2. PARTICLES ---
 */
const Particles = () => {
  const chars = ['अ', 'आ', 'इ', 'ई', 'ॐ', 'श्री', 'क', 'ख', 'ग', 'घ', 'च', 'छ'];
  const particles = useMemo(() => Array.from({ length: 34 }).map((_, i) => ({
    id: i,
    char: chars[Math.floor(Math.random() * chars.length)],
    left: Math.random() * 100 + '%',
    duration: 12 + Math.random() * 18 + 's',
    delay: -Math.random() * 20 + 's',
    size: 0.9 + Math.random() * 2.4 + 'rem',
    rotate: (Math.random() * 40 - 20) + 'deg'
  })), []);

  const node = (
    <div
      className="floating-particles"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1,           // low but above page background; below overlays
        overflow: 'hidden'
      }}
      aria-hidden="true"
    >
      {particles.map(p => (
        <div
          key={p.id}
          className="floating-char"
          style={{
            position: 'absolute',
            left: p.left,
            top: Math.random() * 120 + '%', // start varied vertically to avoid clustering
            fontSize: p.size,
            transform: `rotate(${p.rotate})`,
            animation: `float ${p.duration} linear infinite`,
            animationDelay: p.delay,
            fontFamily: 'var(--font-script)',
            color: 'rgba(245, 158, 11, 0.22)', // stronger alpha
            textShadow: '0 0 12px rgba(245,158,11,0.18)',
            mixBlendMode: 'screen' // helps visibility on dark / glass backgrounds
          }}
        >
          {p.char}
        </div>
      ))}
    </div>
  );

  // render outside normal stacking context so z-index works predictably
  if (typeof document !== 'undefined') {
    return createPortal(node, document.body);
  }
  return null;
};

// --- 3. VIEWS ---
const Dashboard = () => (
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
      <h2 style={{ fontFamily: 'var(--font-ancient)', fontSize: '2.5rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Project Veda</h2>
      <p style={{ color: 'var(--text-muted)' }}>Computational Sanskrit Prosody Engine</p>
    </div>
  </div>
);

const Generator = () => {
  const [ctx, setCtx] = useState('');
  const [chandas, setChandas] = useState('Anushtup');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);

  const generate = async () => {
    setLoading(true); setOut(null);
    try {
      const res = await fetch(`${API_BASE}/generate-and-verify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chandas, context: ctx, language: 'devanagari' })
      });
      const data = await res.json();
      setOut(data);
    } catch(e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }} className="animate-fadeIn">
      <div className="glass-panel" style={{ padding: '2.5rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontSize: '1.5rem' }}>
          <PenTool color="var(--gold)"/> AI Generator
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div className="input-group">
            <label>Target Meter</label>
            <input value={chandas} onChange={e => setChandas(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Context / Theme</label>
            <input value={ctx} onChange={e => setCtx(e.target.value)} placeholder="e.g. Praise of Shiva" />
          </div>
        </div>
        <button className="btn-primary" onClick={generate} disabled={loading || !ctx}>
          {loading ? <><Loader2 className="spin"/> Consulting Sages...</> : 'Generate Verse'}
        </button>
      </div>

      {out && (
        <div className="result-card glass-panel animate-fadeIn">
          <div className="shloka-text">{out.final?.shloka || "Generation Failed"}</div>
          
          <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ fontFamily: 'monospace' }}>Detected: {out.final?.analysis?.identifiedChandas || '-'}</span>
            <div className="verified-badge">
              <CheckCircle size={14}/> Verified Match
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Analyzer = () => {
  const [input, setInput] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const analyze = async () => {
    setLoading(true); setRes(null);
    try {
      const r = await fetch(`${API_BASE}/chandas/analyze`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({shloka:input})});
      const d = await r.json();
      if(d.success) setRes(d.analysis);
    } catch(e) { alert("Error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', height: '100%' }} className="animate-fadeIn">
      <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
        <h3 style={{ marginBottom: '1rem', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Search size={20} color="var(--gold)"/> Input
        </h3>
        <textarea 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          placeholder="Paste Sanskrit text here..." 
          style={{ flex: 1, marginBottom: '1.5rem' }}
        ></textarea>
        <button className="btn-primary" onClick={analyze} disabled={loading || !input}>
          {loading ? <Loader2 className="spin"/> : 'Analyze Meter'}
        </button>
      </div>
      
      <div className="glass-panel" style={{ padding: '2rem', overflowY: 'auto' }}>
        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Results</h3>
        {res ? (
          <div className="animate-fadeIn">
            <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '1.5rem', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(74, 222, 128, 0.2)', marginBottom: '1.5rem' }}>
              <div style={{ color: '#4ade80', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold' }}>Identified Meter</div>
              <div style={{ fontSize: '2rem', fontFamily: 'var(--font-ancient)', marginTop: '0.5rem', color: 'white' }}>{res.identifiedChandas}</div>
            </div>
            
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>LG Pattern</div>
              <div style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px', wordBreak: 'break-all' }}>
                {res.pattern.combined}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Search size={48} style={{ opacity: 0.2, marginBottom: '1rem' }}/>
            <p>Analysis results will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- 4. MAIN LAYOUT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');

  if (!user) return <div className="app-layout"><Particles /><AuthGate onLogin={setUser} /></div>;

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
            v2.0 Native
          </div>
        </header>
        
        <div className="view-container">
          <div style={{ maxWidth: '1200px', margin: '0 auto', height: '100%' }}>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'analyze' && <Analyzer />}
            {tab === 'generate' && <Generator />}
          </div>
        </div>
      </main>
    </div>
  );
}