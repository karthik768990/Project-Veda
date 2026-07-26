import React, { useMemo } from 'react';

export const Particles = () => {
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
