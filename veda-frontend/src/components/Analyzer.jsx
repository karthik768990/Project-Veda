import React, { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { ChandasReference } from './ChandasReference';

export const Analyzer = ({ apiBase }) => {
  const [input, setInput] = useState('');
  const [res, setRes] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const analyze = async () => {
    setLoading(true); 
    setRes(null);
    setError(null);
    try {
      const r = await fetch(`${apiBase}/chandas/analyze`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ shloka: input })
      });
      
      const d = await r.json();
      if (!r.ok) {
        setError(d.detail || "Server Error");
      } else if (d.success) {
        setRes(d.analysis);
      } else {
        setError(d.message || "Analysis failed");
      }
    } catch(e) { 
      setError("Network error: Could not reach the server."); 
    }
    finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="workbench-grid animate-fadeIn">
      {/* LEFT: TOOL */}
      <div className="tool-panel">
        <div className="glass-panel" style={{display:'flex', flexDirection:'column', height:'100%'}}>
          <h3 style={{ marginBottom: '1.5rem', color: 'white', display:'flex', alignItems:'center', gap:'0.5rem' }}>
            <Search className="text-gold"/> Input Shloka
          </h3>
          
          {error && (
             <div style={{ background: 'rgba(248, 113, 113, 0.1)', color: '#f87171', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(248,113,113,0.3)' }}>
               {error}
             </div>
          )}
          
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
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>Confidence: {(res.similarity * 100).toFixed(1)}%</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)', marginBottom: '1rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>LG Pattern (Combined)</div>
              <div style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '2px', wordBreak: 'break-all' }}>
                {res.pattern.combined_compact || res.pattern.combined}
              </div>
            </div>
            {res.pattern.byPada && res.pattern.byPada.length > 0 && (
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Pada Breakdown</div>
                {res.pattern.byPada.map((pada, idx) => (
                  <div key={idx} style={{ color: '#e5e7eb', fontFamily: 'monospace', fontSize: '1rem', letterSpacing: '1px', marginBottom: '4px' }}>
                    Pada {idx + 1}: {pada}
                  </div>
                ))}
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
