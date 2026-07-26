import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';

export const ChandasReference = ({ apiBase }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${apiBase}/chandas`)
      .then(res => res.json())
      .then(data => {
        if(data.success) setList(data.data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [apiBase]);

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
        ) : list.length === 0 ? (
          <div style={{padding:'2rem', textAlign:'center', color:'#f87171', fontSize:'0.8rem'}}>
            Database Unavailable
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
