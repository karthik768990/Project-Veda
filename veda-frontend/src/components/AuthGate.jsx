import React, { useState, useEffect } from 'react';

export const AuthGate = ({ onLogin, googleClientId, apiBase }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    if (!googleClientId || googleClientId.includes("YOUR_")) {
      setIsDemoMode(true); return;
    }
    const script = document.createElement('script');
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true; script.defer = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (!window.google) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (res) => verifyToken(res.credential)
      });
      const btn = document.getElementById("google-btn");
      if(btn) window.google.accounts.id.renderButton(btn, { theme: "filled_black", size: "large", shape: "pill", width: "250" });
    };
  }, [googleClientId, apiBase]);

  const verifyToken = async (token) => {
    try {
      const res = await fetch(`${apiBase}/auth/google`, {
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
          Project Veda
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
