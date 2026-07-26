import React, { useState, useEffect } from 'react';
import { PenTool, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ChandasReference } from './ChandasReference';

export const Generator = ({ apiBase }) => {
  const [ctx, setCtx] = useState('');
  const [chandas, setChandas] = useState(''); 
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState(null);
  const [error, setError] = useState(null);
  const [chandasList, setChandasList] = useState([]);

  useEffect(() => {
    fetch(`${apiBase}/chandas`)
      .then(res => res.json())
      .then(data => {
        if(data.success && data.data.length > 0) {
          setChandasList(data.data);
          setChandas(data.data[0].name);
        }
      })
      .catch(err => console.error("Failed to load options", err));
  }, [apiBase]);

  const generate = async () => {
    setLoading(true); 
    setOut(null);
    setError(null);
    try {
      const res = await fetch(`${apiBase}/generate-and-verify`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ chandas, context: ctx, language: 'devanagari' })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Server Error");
      } else if (!data.success) {
        // AI failed after max attempts, but we still want to show the final attempt
        setError("AI failed to perfectly match the requested meter after multiple attempts.");
        setOut(data);
      } else {
        setOut(data);
      }
    } catch(e) { 
      setError("Network Error: " + e.message); 
    }
    finally { 
      setLoading(false); 
    }
  };

  const getDisplayShloka = () => {
    if (!out) return "";
    const finalData = out.final || {};
    if (finalData.parsed_shloka) return finalData.parsed_shloka;
    if (finalData.shloka) return finalData.shloka;
    if (out.attempts && Array.isArray(out.attempts) && out.attempts.length > 0) {
      const last = out.attempts[out.attempts.length - 1];
      return last?.parsed_shloka || last?.shloka || "Generation Error (No Text)";
    }
    return "Generation Failed (No Data)";
  };

  const getAnalysisStatus = () => {
    if (!out) return null;
    const finalData = out.final || (out.attempts && out.attempts.length > 0 ? out.attempts[out.attempts.length - 1] : {});
    const matchData = finalData?.match || finalData?.analysis || {};
    const detected = matchData?.identifiedChandas || "Unknown";

    if (out.success) {
        return { text: "Verified Match", color: "#4ade80", icon: <CheckCircle size={14}/> };
    }
    return { text: `Mismatch: Detected ${detected}`, color: "#f87171", icon: <AlertCircle size={14}/> };
  };

  const status = getAnalysisStatus();

  return (
    <div className="workbench-grid animate-fadeIn">
      {/* LEFT: TOOLS */}
      <div className="tool-panel">
        <div className="glass-panel">
          <h3 style={{ marginBottom: '1.5rem', color: 'white', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <PenTool className="text-gold"/> Generator Settings
          </h3>
          
          {error && (
             <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(248,113,113,0.3)' }}>
               {error}
             </div>
          )}
          
          <div className="input-group">
            <label>Target Meter</label>
            <select value={chandas} onChange={e => setChandas(e.target.value)}>
              {chandasList.length === 0 && <option value="Anuṣṭubh">Anuṣṭubh</option>}
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
            {loading ? <><Loader2 className="spin" style={{marginRight: 8}}/> Consulting Sages...</> : 'Generate Verse'}
          </button>
        </div>

        {out && (
          <div className="result-card glass-panel animate-fadeIn">
            <div className="shloka-text">{getDisplayShloka()}</div>
            <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span style={{ fontFamily: 'monospace' }}>Target: {chandas}</span>
              <div className="verified-badge" style={{ color: status?.color, borderColor: status?.color, background: status?.color + '20', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {status?.icon} {status?.text}
              </div>
            </div>
            {out.final?.meta && (
              <div style={{marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', fontSize: '0.85rem', color: 'var(--text-muted)'}}>
                <strong>Poet's Explanation:</strong> {out.final.meta}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT: REFERENCE */}
      <ChandasReference apiBase={apiBase} />
    </div>
  );
};
