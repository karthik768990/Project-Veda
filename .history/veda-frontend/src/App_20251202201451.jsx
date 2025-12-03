import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Search, PenTool, BookOpen, Settings, LogOut, CheckCircle, AlertCircle, Loader2, Sparkles, Lock, Server
} from 'lucide-react';
import './App.css'; 

// --- CONFIGURATION ---
const API_BASE = "http://localhost:3000"; 
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID_HERE"; 

// --- 1. NEW COMPONENT: CHANDAS REFERENCE SIDEBAR ---
const ChandasReference = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/chandas`)
      .then(res => res.json())
      .then(data => {
        if(data.success) setList(data.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="ref-panel animate-fadeIn">
      <div className="ref-header">
        <BookOpen size={16} style={{display:'inline', marginRight:8}}/> 
        Chandas Reference
      </div>
      <div className="ref-list custom-scrollbar">
        {loading ? (
          <div style={{padding:'2rem', textAlign:'center', color:'#666', fontSize:'0.8rem'}}>
            <Loader2 className="spin" size={20} style={{margin:'0 auto 10px'}}/>
            Loading Library...
          </div>
        ) : list.map((item, idx) => (
          <div key={idx} className="ref-item">
            <div className="ref-name">{item.name}</div>
            <div className="ref-pattern">
              {item.pattern || item.pattern_regex || "Complex"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- 2. AUTH COMPONENT ---
const AuthGate = ({ onLogin }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_")) {
      setIsDemoMode(true); return;
    }
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
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
      else alert("Login Failed");
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
            <button onClick={() => onLogin("Guest Poet")} className="btn-primary" style={{ width: 'auto', padding: '0.8rem 2rem', background: 'white', color: 'black', textShadow:'none' }}>
              Enter as Guest
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// --- 3. PARTICLES ---
const Particles = () => {
  const chars = ['अ', 'आ', 'इ', 'ई', 'ॐ', 'श्री', 'क', 'ख', 'ग', 'घ'];
  const particles = useMemo(() => Array.from({ length: 35 }).map((_, i) => ({
    id: i,
    char: chars[Math.floor(Math.random() * chars.length)],
    left: Math.random() * 100 + '%',
    duration: 15 + Math.random() * 20 + 's',
    delay: -Math.random() * 20 + 's',
    size: 1 + Math.random() * 2 + 'rem'
  })), []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute', color: 'rgba(245, 158, 11, 0.15)',
          fontFamily: 'var(--font-script)',
          animation: `float ${p.duration} linear infinite`,
          animationDelay: p.delay,
          left: p.left, fontSize: p.size,
          textShadow: '0 0 10px rgba(245, 158, 11, 0.2)'
        }}>{p.char}</div>
      ))}
      <style>{`@keyframes float { 0% { transform: translateY(100vh) rotate(0deg); opacity: 0; } 50% { opacity: 0.5; } 100% { transform: translateY(-20vh) rotate(20deg); opacity: 0; } }`}</style>
    </div>
  );
};

// --- 4. VIEWS ---

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
      <h2 style={{ fontFamily: 'var(--font-ancient)', fontSize: '3rem', color: 'var(--gold)', marginBottom: '0.5rem' }}>Project Veda</h2>
      <p style={{ color: 'var(--text-muted)' }}>Computational Sanskrit Prosody Engine</p>
    </div>
  </div>
);

const Generator = () => {
  const [ctx, setCtx] = useState('');
  const [chandas, setChandas] = useState('Anuṣṭubh');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  
  // New state for dropdown
  const [chandasList, setChandasList] = useState([]);

  // Fetch Chandas list on mount
  useEffect(() => {
    fetch(`${API_BASE}/chandas`)
      .then(res => res.json())
      .then(data => {
        if(data.success && data.data.length > 0) {
          setChandasList(data.data);
        }
      })
      .catch(err => console.error("Failed to load options", err));
  }, []);

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
    <div className="workbench-grid animate-fadeIn">
      {/* LEFT: TOOLS */}
      <div className="tool-panel">
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', color: 'white', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <PenTool className="text-gold"/> Generator Settings
          </h3>
          
          <div className="input-group">
            <label>Target Meter</label>
            {/* Switched to SELECT */}
            <select 
              value={chandas} 
              onChange={e => setChandas(e.target.value)}
            >
              {chandasList.length === 0 && <option value="Anuṣṭubh">Anuṣṭubh (Default)</option>}
              {chandasList.map((c, i) => (
                <option key={i} value={c.name} style={{color: '#222'}}>
                  {c.name} ({c.syllables_per_pada} syl)
                </option>
              ))}
            </select>
            <div className="input-highlight"></div>
          </div>

          <div className="input-group">
            <label>Context / Theme</label>
            <input value={ctx} onChange={e => setCtx(e.target.value)} placeholder="e.g. Praise of Shiva" />
            <div className="input-highlight"></div>
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
              <div className="verified-badge"><CheckCircle size={14}/> Verified Match</div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: REFERENCE */}
      <ChandasReference />
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
    <div className="workbench-grid animate-fadeIn">
      {/* LEFT: TOOL */}
      <div className="tool-panel">
        <div className="glass-panel" style={{display:'flex', flexDirection:'column', height:'100%'}}>
          <h3 style={{ marginBottom: '1.5rem', color: 'white', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Search className="text-gold"/> Input Shloka
          </h3>
          <div className="input-group" style={{flex:1}}>
            <textarea 
              value={input} 
              onChange={e => setInput(e.target.value)} 
              placeholder="Paste Sanskrit text here..." 
              style={{height:'100%', minHeight:'150px'}}
            ></textarea>
            <div className="input-highlight"></div>
          </div>
          <button className="btn-primary" onClick={analyze} disabled={loading || !input} style={{marginTop:'1.5rem'}}>
            {loading ? <Loader2 className="spin"/> : 'Analyze Meter'}
          </button>
        </div>

        {res && (
          <div className="glass-panel animate-fadeIn">
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
        )}
      </div>

      {/* RIGHT: REFERENCE */}
      <ChandasReference />
    </div>
  );
};

// --- 5. MAIN LAYOUT ---
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
            v2.1 UI
          </div>
        </header>
        
        <div className="view-container">
          <div style={{ maxWidth: '1400px', margin: '0 auto', height: '100%' }}>
            {tab === 'dashboard' && <Dashboard />}
            {tab === 'analyze' && <Analyzer />}
            {tab === 'generate' && <Generator />}
          </div>
        </div>
      </main>
    </div>
  );
}