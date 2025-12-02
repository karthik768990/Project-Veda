// src/App.jsx
import React, { useState, useEffect, useMemo } from "react";
import { 
  Home, Database, Settings, Activity, Server, 
  Menu, X, Search, Zap, BookOpen, PenTool, CheckCircle, AlertCircle, Loader2, Sparkles, Lock, LogOut
} from "lucide-react";

// Use Vite env vars (set in .env at project root)
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Auth Gate Component (unchanged except uses GOOGLE_CLIENT_ID variable)
const AuthGate = ({ onLogin }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      console.warn("Google Client ID not configured. Enabling Guest Mode.");
      setIsDemoMode(true);
      return;
    }

    // load Google Identity Services script if not already present
    if (!window.google) {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      script.onload = initGoogle;
      return () => {
        // do not remove the script on unmount - let browser cache it
      };
    }
    // if already present, initialize
    initGoogle();
  }, []);

  const initGoogle = () => {
    if (!window.google || !GOOGLE_CLIENT_ID) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          verifyToken(response.credential);
        },
      });

      const btnParent = document.getElementById("google-btn");
      if (btnParent) {
        // remove existing children if any
        btnParent.innerHTML = "";
        window.google.accounts.id.renderButton(
          btnParent,
          { theme: "filled_black", size: "large", shape: "pill", width: "250" }
        );
      }
    } catch (e) {
      console.warn("Google ID init error", e);
    }
  };

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) onLogin(data.user || "Google User");
      else alert(`Verification failed: ${data.message || data.detail || "Unknown"}`);
    } catch (err) {
      console.error("verifyToken error:", err);
      alert("Backend connection failed. Is the backend running on port 3000?");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="p-10 border border-orange-500/30 rounded-2xl bg-slate-950/90 flex flex-col items-center gap-6 shadow-2xl max-w-md w-full relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-orange-500/20 blur-3xl rounded-full pointer-events-none"></div>
        <div className="text-6xl text-orange-500 animate-pulse relative z-10">ॐ</div>
        <div className="text-center relative z-10">
          <h2 className="text-3xl font-bold text-white font-serif tracking-wide">Chanda Viveka</h2>
          <p className="text-slate-400 text-sm mt-3 tracking-widest uppercase">Identity Verification Required</p>
        </div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

        <div id="google-btn" className="flex justify-center min-h-[44px]">
          {(!GOOGLE_CLIENT_ID) && (
            <button 
              onClick={() => onLogin("Guest Poet")}
              className="px-6 py-2 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Continue as Guest
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

// fetch utility: defensive JSON parsing
const fetchAPI = async (endpoint, method = "GET", body = null) => {
  const options = { method, headers: { "Content-Type": "application/json" } };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${endpoint}`, options);
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : {};
    return { status: res.status, data: json };
  } catch (e) {
    return { status: res.status, data: text };
  }
};

// --- 4. VIEW COMPONENTS ---

// -- Dashboard --
const DashboardView = () => {
  const [health, setHealth] = useState({ status: 'Checking...', color: 'text-slate-400' });
  const [stats, setStats] = useState({ chandas: 0, loading: true });

  useEffect(() => {
    fetchAPI('/health')
      .then(res => {
        if(res.data.status === 'ok') setHealth({ status: 'Online', color: 'text-green-400' });
        else setHealth({ status: 'Error', color: 'text-red-400' });
      })
      .catch(() => setHealth({ status: 'Offline', color: 'text-red-500' }));

    fetchAPI('/chandas')
      .then(res => {
        if(res.data.success && Array.isArray(res.data.data)) {
          setStats({ chandas: res.data.data.length, loading: false });
        }
      })
      .catch(() => setStats({ chandas: 0, loading: false }));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="group bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all hover:border-orange-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">System Status</p>
              <h3 className={`text-3xl font-bold mt-2 ${health.color} flex items-center gap-2`}>
                {health.status}
              </h3>
            </div>
            <div className={`p-3 rounded-lg bg-slate-800/50 ${health.color}`}>
              <Server size={24} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 font-mono">
            {API_BASE}
          </div>
        </div>

        {/* Database Card */}
        <div className="group bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all hover:border-orange-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">Meter Library</p>
              <h3 className="text-3xl font-bold text-white mt-2">
                {stats.loading ? '...' : stats.chandas}
              </h3>
            </div>
            <div className="p-3 bg-orange-500/20 rounded-lg text-orange-400">
              <BookOpen size={24} />
            </div>
          </div>
          <div className="mt-4 text-xs text-orange-400 flex items-center gap-1">
            <CheckCircle size={12} /> Database Loaded
          </div>
        </div>

        {/* AI Card */}
        <div className="group bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-all hover:border-orange-500/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">AI Generator</p>
              <h3 className="text-3xl font-bold text-blue-400 mt-2">Active</h3>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-lg text-blue-400">
              <Sparkles size={24} />
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500">
            Powered by Gemini Model
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-white/5 to-transparent border border-white/10 rounded-xl p-8 text-center min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute inset-0 bg-orange-500/5 blur-3xl rounded-full transform scale-150 animate-pulse"></div>
         <div className="relative z-10">
            <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-200 to-amber-500 mb-4">
              Project Veda
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto text-lg leading-relaxed">
              Computational linguistics for Sanskrit Prosody. <br/>
              Analyze ancient meters or generate new ones using modern AI.
            </p>
         </div>
      </div>
    </div>
  );
};

// -- Analyzer --
const AnalyzerView = () => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await fetchAPI('/chandas/analyze', 'POST', { shloka: input });
      if (data.success) {
        setResult(data.analysis);
      } else {
        throw new Error(data.message || 'Analysis failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn h-full">
      {/* Input Side */}
      <div className="flex flex-col h-full bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Search size={20} className="text-orange-500" />
          Input Shloka
        </h2>
        
        <textarea
          className="flex-1 w-full bg-slate-900/80 border border-slate-700/50 rounded-lg p-5 text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 resize-none font-serif text-xl leading-loose tracking-wide placeholder:text-slate-600 shadow-inner"
          placeholder="Paste Sanskrit or IAST text here...&#10;Ex: वागर्थाविव सम्पृक्तौ वागर्थप्रतिपत्तये..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck="false"
        />
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={loading || !input}
            className="px-8 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg flex items-center transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : <Zap size={20} className="mr-2" />}
            Analyze Meter
          </button>
        </div>
      </div>

      {/* Output Side */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 overflow-y-auto shadow-2xl">
        <h2 className="text-xl font-semibold text-white mb-4">Results</h2>
        
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 animate-pulse">
            <div className="w-16 h-16 border-4 border-orange-500/30 border-t-orange-500 rounded-full animate-spin mb-4"></div>
            <p>Deconstructing syllables...</p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-300 flex items-center gap-3">
            <AlertCircle size={20} />
            {error}
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6 animate-fadeIn">
            {/* Main Result */}
            <div className="p-6 bg-gradient-to-r from-green-900/20 to-emerald-900/10 border border-green-500/20 rounded-lg text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2 opacity-20"><CheckCircle size={64} className="text-green-500"/></div>
              <span className="text-xs uppercase tracking-[0.2em] text-green-400 font-bold">Identified Meter</span>
              <h3 className="text-4xl text-white font-bold mt-2 font-serif tracking-wide">
                {result.identifiedChandas || "Unknown / Mixed"}
              </h3>
            </div>

            {/* Matrix View */}
            <div>
              <h4 className="text-slate-400 text-xs font-bold mb-3 uppercase tracking-widest">Syllabic Decomposition</h4>
              <div className="p-5 bg-slate-900/80 rounded-lg border border-slate-700/50 space-y-4">
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Standardized Input</span>
                  <p className="text-white font-serif text-lg">{result.input.devanagari}</p>
                </div>
                <div className="h-px bg-slate-800"></div>
                <div>
                  <span className="text-xs text-slate-500 block mb-1">Laghu (I) - Guru (S) Pattern</span>
                  <p className="text-orange-400 font-mono text-xl tracking-[0.2em] break-all">
                    {result.pattern.combined}
                  </p>
                </div>
              </div>
            </div>

            {/* Explanation */}
            {result.explanation && (
              <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-lg">
                <p className="text-blue-100 text-sm leading-relaxed">
                  {result.explanation}
                </p>
              </div>
            )}
          </div>
        )}

        {!result && !loading && !error && (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 border-2 border-dashed border-slate-700/50 rounded-lg">
            <Search size={48} className="mb-4 opacity-30" />
            <p className="text-sm">Analysis results will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
};

// -- Generator --
const GeneratorView = () => {
  const [chandas, setChandas] = useState('Anushtup');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(null);

  const handleGenerate = async () => {
    if (!context) return;
    setLoading(true);
    setGenerated(null);

    try {
      const { data } = await fetchAPI('/generate-and-verify', 'POST', {
        chandas,
        context,
        language: 'devanagari',
        max_attempts: 3
      });
      setGenerated(data);
    } catch (err) {
      alert("Generation failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-8 animate-fadeIn shadow-2xl relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

      <h2 className="text-2xl font-bold text-white mb-8 flex items-center relative z-10">
        <PenTool className="mr-3 text-orange-400" />
        <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          AI Shloka Generator
        </span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 relative z-10">
        <div className="space-y-3">
          <label className="text-sm text-slate-300 font-medium">Target Meter (Chandas)</label>
          <input 
            type="text" 
            value={chandas}
            onChange={(e) => setChandas(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
          />
        </div>
        <div className="space-y-3">
          <label className="text-sm text-slate-300 font-medium">Context / Theme</label>
          <input 
            type="text" 
            placeholder="e.g., A prayer to the rising sun for strength"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 transition-all"
          />
        </div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={loading || !context}
        className="w-full relative z-10 py-4 bg-gradient-to-r from-orange-600 to-rose-600 hover:from-orange-500 hover:to-rose-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-orange-900/30 disabled:opacity-50 transition-all transform active:scale-[0.99] border border-white/10"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-3">
            <Loader2 className="animate-spin" /> Consulting the scriptures...
          </span>
        ) : "Generate Verse"}
      </button>

      {generated && (
        <div className="mt-10 p-8 bg-black/40 border border-orange-500/30 rounded-xl relative z-10 animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xs uppercase text-orange-400 font-bold tracking-wider flex items-center gap-2">
              <Sparkles size={14} /> Generated Output
            </span>
            {generated.success && (
              <span className="flex items-center text-green-400 text-xs bg-green-900/20 border border-green-500/30 px-3 py-1 rounded-full">
                <CheckCircle size={12} className="mr-2" /> Meter Verified
              </span>
            )}
          </div>
          
          <div className="relative">
            <span className="absolute -top-4 -left-2 text-6xl text-white/5 font-serif">“</span>
            <pre className="text-2xl md:text-3xl text-white font-serif text-center whitespace-pre-wrap leading-relaxed drop-shadow-lg">
              {generated.final?.shloka || generated.final?.parsed_shloka || "Generation failed."}
            </pre>
            <span className="absolute -bottom-8 -right-2 text-6xl text-white/5 font-serif">”</span>
          </div>
          
          {generated.final?.analysis && (
             <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4 text-xs text-slate-400">
                <div>
                   <span className="block text-slate-500 mb-1">Detected Meter</span>
                   <span className="text-slate-300 font-mono">{JSON.stringify(generated.final.analysis.identifiedChandas)}</span>
                </div>
                <div className="text-right">
                   <span className="block text-slate-500 mb-1">Confidence</span>
                   <span className="text-green-400">High</span>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

// -- Library --
const ChandasListView = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI('/chandas')
      .then(res => {
        if (res.data.success) setList(res.data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl flex flex-col h-[calc(100vh-140px)] animate-fadeIn shadow-xl overflow-hidden">
      <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <BookOpen size={20} className="text-orange-400"/> Chandas Library
        </h2>
        <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-xs font-mono">
          {list.length} Entries
        </span>
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="text-xs uppercase text-slate-400 bg-slate-900/80 sticky top-0 backdrop-blur-md z-10">
            <tr>
              <th className="py-4 px-6 font-semibold tracking-wider">Name</th>
              <th className="py-4 px-6 font-semibold tracking-wider">Pattern (Laghu/Guru)</th>
              <th className="py-4 px-6 font-semibold tracking-wider text-right">Syllables</th>
            </tr>
          </thead>
          <tbody className="text-slate-300 text-sm divide-y divide-white/5">
            {loading ? (
               <tr><td colSpan="3" className="p-12 text-center text-slate-500">
                 <Loader2 className="animate-spin mx-auto mb-2"/> Loading scriptures...
               </td></tr>
            ) : list.map((item, idx) => (
              <tr key={idx} className="hover:bg-white/5 transition-colors group cursor-default">
                <td className="py-4 px-6 font-medium text-orange-200 group-hover:text-white transition-colors">
                  {item.name}
                </td>
                <td className="py-4 px-6 font-mono text-slate-400 text-xs tracking-widest group-hover:text-orange-300">
                  {item.pattern_regex || <span className="italic opacity-50">Complex / Mixed</span>}
                </td>
                <td className="py-4 px-6 text-right font-mono text-slate-500">
                  {item.syllables_per_pada || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// --- 5. MAIN APP COMPONENT ---

export default function App() {
  // Auth State
  const [user, setUser] = useState(null);
  
  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on mobile when tab changes
  useEffect(() => setIsSidebarOpen(false), [activeTab]);

  // --- IF NOT LOGGED IN, SHOW AUTH GATEKEEPER ---
  if (!user) {
    return (
      <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
        <FloatingScripts />
        <AuthGate onLogin={(userData) => setUser(userData)} />
      </div>
    );
  }

  // --- LOGGED IN UI ---
  const NavItem = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 mb-1 group ${
        activeTab === id 
          ? 'bg-gradient-to-r from-orange-600/20 to-orange-600/10 text-orange-200 border border-orange-500/30' 
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'
      }`}
    >
      <Icon size={20} className={activeTab === id ? 'text-orange-400' : 'group-hover:text-slate-200'} />
      <span className="font-medium tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="relative min-h-screen text-slate-200 font-sans selection:bg-orange-500/30 overflow-hidden bg-slate-950">
      
      {/* 1. Background Layer */}
      <FloatingScripts />

      {/* 2. Main UI Layer */}
      <div className="relative z-10 flex h-screen overflow-hidden animate-fadeIn">
        
        {/* Sidebar */}
        <aside 
          className={`fixed md:relative z-30 w-72 h-full bg-slate-950/80 backdrop-blur-xl border-r border-white/10 transition-transform duration-300 ease-in-out shadow-2xl ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="p-8 border-b border-white/10 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-3 text-orange-400">
              <span className="text-3xl filter drop-shadow-lg">ॐ</span>
              <div className="flex flex-col">
                <span className="font-bold text-lg tracking-tight text-white leading-none">PROJECT</span>
                <span className="font-light text-sm tracking-[0.2em] text-orange-200/80 leading-none mt-1">VEDA</span>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <nav className="p-6">
            <div className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">Menu</div>
            <NavItem id="dashboard" icon={Home} label="Dashboard" />
            <NavItem id="analyze" icon={Search} label="Analyze Meter" />
            <NavItem id="generate" icon={PenTool} label="AI Generator" />
            <NavItem id="library" icon={BookOpen} label="Chandas List" />
            
            <div className="mt-8 mb-2 text-xs font-bold text-slate-500 uppercase tracking-widest pl-4">System</div>
            <NavItem id="settings" icon={Settings} label="Settings" />
          </nav>

          <div className="absolute bottom-0 w-full p-6 border-t border-white/5 bg-black/20">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 flex items-center justify-center text-xs font-bold text-white">
                     {user.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                     <span className="text-sm font-medium text-slate-200">{user}</span>
                     <span className="text-[10px] text-green-400">Connected</span>
                  </div>
               </div>
               <button onClick={() => setUser(null)} className="text-slate-500 hover:text-white" title="Logout">
                  <LogOut size={16} />
               </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          
          {/* Header */}
          <header className="h-20 flex items-center justify-between px-8 bg-slate-950/40 backdrop-blur-sm border-b border-white/5 sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-400 p-2 hover:bg-white/10 rounded-lg">
                <Menu size={24} />
              </button>
              <h1 className="text-xl font-medium text-white tracking-wide hidden md:block">
                {activeTab === 'dashboard' && 'Overview'}
                {activeTab === 'analyze' && 'Prosody Analyzer'}
                {activeTab === 'generate' && 'Verse Generator'}
                {activeTab === 'library' && 'Reference Library'}
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-slate-400 font-mono">
                v1.0.4-beta
              </div>
            </div>
          </header>

          {/* Scrollable View Area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto h-full">
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'analyze' && <AnalyzerView />}
              {activeTab === 'generate' && <GeneratorView />}
              {activeTab === 'library' && <ChandasListView />}
              {activeTab === 'settings' && (
                <div className="flex flex-col items-center justify-center h-[400px] text-slate-500 bg-white/5 rounded-xl border border-white/10 border-dashed">
                  <Settings size={48} className="mb-4 opacity-50"/>
                  <p>Configuration is managed via `env` variables on the backend.</p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Mobile Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-20 md:hidden"
            onClick={() => setIsSidebarOpen(false)}
          ></div>
        )}
      </div>
    </div>
  );
}