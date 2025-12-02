import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Database, Settings, Activity, Server, 
  Menu, X, Search, Zap, BookOpen, PenTool, CheckCircle, AlertCircle, Loader2, Sparkles, Lock, LogOut
} from 'lucide-react';

// --- CONFIGURATION ---
const API_BASE = "http://localhost:3000"; 
// TODO: Replace with your actual Google Client ID.
// If this string contains "YOUR_CLIENT_ID", the app enables "Guest Mode" automatically.
const GOOGLE_CLIENT_ID = "YOUR_CLIENT_ID_HERE"; 

// --- 1. AUTH GATEKEEPER ---
const AuthGate = ({ onLogin }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Enable Guest Mode if ID is missing
    if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes("YOUR_CLIENT_ID")) {
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
        callback: (response) => verifyToken(response.credential)
      });
      const btn = document.getElementById("google-btn");
      if (btn) {
        window.google.accounts.id.renderButton(
          btn,
          { theme: "filled_black", size: "large", shape: "pill", width: "250" }
        );
      }
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
      if (data.success) onLogin(data.user);
      else alert("Login Failed");
    } catch (e) {
      console.error(e);
      alert("Backend Error: Is FastAPI running?");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fadeIn">
      <div className="p-10 border border-orange-500/30 rounded-2xl bg-slate-950/90 flex flex-col items-center gap-6 shadow-2xl max-w-md w-full relative overflow-hidden">
        {/* Mystical Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full pointer-events-none"></div>
        
        <div className="text-6xl text-orange-500 animate-pulse relative z-10">ॐ</div>
        
        <div className="text-center relative z-10">
          <h2 className="text-3xl font-bold text-white font-serif">Chanda Viveka</h2>
          <p className="text-slate-400 text-sm mt-2 uppercase tracking-widest">Identity Verification</p>
        </div>
        
        <div className="w-full h-px bg-white/10"></div>
        
        <div id="google-btn" className="min-h-[44px] flex justify-center w-full">
          {isDemoMode && (
            <button 
              onClick={() => onLogin("Guest Poet")}
              className="px-6 py-2 bg-white text-black font-semibold rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Enter as Guest
            </button>
          )}
        </div>
        
        <div className="text-xs text-slate-600 mt-2 flex items-center gap-2">
          <Lock size={12} /> Secure Gateway Access
        </div>
      </div>
    </div>
  );
};

// --- 2. FLOATING PARTICLES ---
const FloatingScripts = () => {
  const chars = ['अ', 'आ', 'इ', 'ई', 'उ', 'ऊ', 'ऋ', 'ए', 'ऐ', 'ओ', 'औ', 'ॐ', 'श्री', 'क', 'ख', 'ग'];
  const particles = useMemo(() => Array.from({ length: 40 }).map((_, i) => ({
    id: i,
    char: chars[Math.floor(Math.random() * chars.length)],
    left: Math.random() * 100 + '%',
    duration: 15 + Math.random() * 20 + 's',
    delay: -Math.random() * 20 + 's',
    size: 1 + Math.random() * 2 + 'rem',
    opacity: 0.05 + Math.random() * 0.15
  })), []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black"></div>
      {particles.map(p => (
        <div key={p.id} className="absolute text-orange-200/30 font-serif animate-float"
             style={{
               left: p.left, fontSize: p.size, opacity: p.opacity,
               animationDuration: p.duration, animationDelay: p.delay,
               bottom: '-10vh', textShadow: '0 0 15px rgba(255,165,0,0.4)'
             }}>
          {p.char}
        </div>
      ))}
      <style>{`
        @keyframes float { 
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: var(--op); }
          90% { opacity: var(--op); }
          100% { transform: translateY(-120vh) rotate(45deg); opacity: 0; }
        }
        .animate-float { animation-name: float; animation-timing-function: linear; animation-iteration-count: infinite; --op: 0.3; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

// --- 3. API HELPER ---
const fetchAPI = async (endpoint, method='GET', body=null) => {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_BASE}${endpoint}`, opts);
    return { status: res.status, data: await res.json() };
  } catch (e) {
    throw new Error("Connection Refused");
  }
};

// --- 4. DASHBOARD VIEWS ---
const Dashboard = () => {
  const [health, setHealth] = useState('Checking...');
  useEffect(() => {
    fetchAPI('/health').then(r => setHealth(r.status === 200 ? 'Online' : 'Error'))
      .catch(() => setHealth('Offline'));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {['System Status', 'Meter Library', 'AI Engine'].map((title, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-xl backdrop-blur-md hover:border-orange-500/30 transition-colors">
            <p className="text-xs text-slate-400 uppercase tracking-widest">{title}</p>
            <h3 className={`text-2xl font-bold mt-2 ${i===0 && health==='Online' ? 'text-green-400' : 'text-white'}`}>
              {i===0 ? health : (i===1 ? 'Loaded' : 'Active')}
            </h3>
          </div>
        ))}
      </div>
      <div className="bg-gradient-to-br from-orange-500/10 to-transparent p-10 rounded-2xl border border-orange-500/20 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-full"></div>
        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-500 mb-2 font-serif relative z-10">Project Veda</h2>
        <p className="text-slate-400 relative z-10">Computational Sanskrit Prosody Engine</p>
      </div>
    </div>
  );
};

const Analyzer = () => {
  const [input, setInput] = useState('');
  const [res, setRes] = useState(null);
  const [loading, setLoading] = useState(false);

  const analyze = () => {
    setLoading(true); setRes(null);
    fetchAPI('/chandas/analyze', 'POST', { shloka: input })
      .then(r => setRes(r.data.success ? r.data.analysis : null))
      .catch(e => alert(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="grid md:grid-cols-2 gap-6 h-full animate-fadeIn">
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col shadow-lg">
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><Search size={18} className="text-orange-500"/> Input Shloka</h3>
        <textarea 
          value={input} onChange={e => setInput(e.target.value)}
          className="flex-1 bg-slate-900/60 border border-white/10 rounded-lg p-4 text-slate-200 resize-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none font-serif text-lg leading-relaxed shadow-inner transition-all"
          placeholder="Paste Sanskrit text here..."
        />
        <button onClick={analyze} disabled={loading || !input}
          className="mt-4 w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-orange-500/20 disabled:opacity-50 flex justify-center items-center gap-2">
          {loading ? <><Loader2 className="animate-spin" size={18}/> Analyzing...</> : <><Zap size={18}/> Analyze Meter</>}
        </button>
      </div>
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 overflow-y-auto shadow-lg relative">
        {res ? (
          <div className="space-y-6">
            <div className="bg-green-900/20 border border-green-500/20 p-6 rounded-lg text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-2 opacity-20"><CheckCircle size={48} className="text-green-500"/></div>
              <span className="text-xs text-green-400 uppercase tracking-widest font-bold">Identified Meter</span>
              <div className="text-3xl text-white font-serif mt-2">{res.identifiedChandas}</div>
            </div>
            <div className="bg-slate-900/50 p-5 rounded-lg border border-white/5">
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Standardized Text</div>
              <div className="text-white font-serif text-lg mb-4">{res.input.devanagari}</div>
              <div className="h-px bg-white/10 mb-4"></div>
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Laghu / Guru Pattern</div>
              <div className="text-orange-400 font-mono text-lg tracking-widest break-all">{res.pattern.combined}</div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600">
            <Search size={48} className="mb-4 opacity-20"/>
            <p>Analysis results will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Generator = () => {
  const [ctx, setCtx] = useState('');
  const [chandas, setChandas] = useState('Anushtup');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);

  const generate = () => {
    setLoading(true); setOut(null);
    fetchAPI('/generate-and-verify', 'POST', { chandas, context: ctx, language: 'devanagari' })
      .then(r => setOut(r.data))
      .catch(e => alert(e.message))
      .finally(() => setLoading(false));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fadeIn">
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2 relative z-10 font-serif">
          <PenTool size={24} className="text-orange-500"/> AI Shloka Generator
        </h2>
        <div className="grid md:grid-cols-2 gap-6 mb-6 relative z-10">
          <div className="space-y-2">
            <label className="text-xs text-slate-400 uppercase tracking-wider">Meter</label>
            <input value={chandas} onChange={e => setChandas(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-400 uppercase tracking-wider">Context</label>
            <input value={ctx} onChange={e => setCtx(e.target.value)}
              className="w-full bg-slate-900/60 border border-white/10 p-3 rounded-lg text-white outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all" placeholder="e.g. Praise of the Sun" />
          </div>
        </div>
        <button onClick={generate} disabled={loading || !ctx}
          className="w-full py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white font-bold rounded-lg relative z-10 hover:shadow-lg hover:shadow-orange-500/30 transition-all disabled:opacity-50 transform active:scale-[0.99]">
          {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin"/> Consulting the scriptures...</span> : 'Generate Verse'}
        </button>
      </div>

      {out && (
        <div className="bg-black/60 border border-orange-500/30 p-10 rounded-xl text-center relative shadow-2xl animate-fadeIn">
          <Sparkles className="absolute top-4 right-4 text-orange-400" size={20}/>
          <div className="relative inline-block">
            <span className="absolute -top-6 -left-4 text-6xl text-white/10 font-serif">“</span>
            <div className="font-serif text-3xl text-white whitespace-pre-wrap leading-loose drop-shadow-lg">
              {out.final?.shloka || "Generation Failed"}
            </div>
            <span className="absolute -bottom-10 -right-4 text-6xl text-white/10 font-serif">”</span>
          </div>
          {out.final?.analysis && (
            <div className="mt-10 pt-6 border-t border-white/10 flex justify-between text-xs text-slate-400">
              <span className="font-mono">Detected: {out.final.analysis.identifiedChandas}</span>
              <span className="text-green-400 font-bold flex items-center gap-1"><CheckCircle size={12}/> Verified Match</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// --- 5. MAIN LAYOUT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');

  if (!user) return <div className="min-h-screen bg-slate-950 text-white font-sans"><FloatingScripts /><AuthGate onLogin={setUser} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      <FloatingScripts />
      <aside className="w-72 bg-slate-900/80 backdrop-blur-xl border-r border-white/10 z-20 flex flex-col shadow-2xl">
        <div className="p-8 border-b border-white/10 flex items-center gap-3">
          <span className="text-3xl text-orange-500 filter drop-shadow-lg">ॐ</span>
          <div className="flex flex-col">
            <span className="font-bold text-white tracking-wide text-lg">PROJECT</span>
            <span className="text-xs text-orange-400 tracking-[0.3em]">VEDA</span>
          </div>
        </div>
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', icon: Home, label: 'Dashboard' },
            { id: 'analyze', icon: Search, label: 'Analyzer' },
            { id: 'generate', icon: PenTool, label: 'Generator' },
          ].map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${tab === item.id ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'hover:bg-white/5 text-slate-400 border border-transparent'}`}>
              <item.icon size={20} /> <span className="font-medium tracking-wide">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                {user.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-white font-medium">{user}</span>
                <span className="text-[10px] text-green-400">Connected</span>
              </div>
            </div>
            <button onClick={() => setUser(null)} className="text-slate-500 hover:text-white transition-colors"><LogOut size={18}/></button>
          </div>
        </div>
      </aside>
      <main className="flex-1 relative z-10 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-3xl font-bold text-white tracking-tight font-serif">{tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
          <div className="text-xs px-4 py-1.5 bg-white/5 rounded-full border border-white/10 text-slate-400 font-mono">v1.0.4 Beta</div>
        </header>
        <div className="max-w-7xl mx-auto h-full pb-10">
          {tab === 'dashboard' && <Dashboard />}
          {tab === 'analyze' && <Analyzer />}
          {tab === 'generate' && <Generator />}
        </div>
      </main>
    </div>
  );
}