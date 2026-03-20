'use client'
import { useState } from 'react'
import HistoriquePage from './HistoriquePage'
import CalendrierPage from './CalendrierPage'

export default function JournalPage({ onChanged }) {
  const [view, setView] = useState('historique') // 'historique' | 'calendrier'

  return (
    <div>
      {/* Switcher compact en haut */}
      <div style={{display:'flex',background:'var(--s2)',borderRadius:12,padding:3,gap:2,marginBottom:20}}>
        <button onClick={()=>setView('historique')} style={{
          flex:1,padding:'8px',borderRadius:9,border:'none',cursor:'pointer',
          background:view==='historique'?'var(--s1)':'transparent',
          color:view==='historique'?'var(--text)':'var(--text3)',
          fontFamily:'var(--fb)',fontWeight:700,fontSize:13,
          transition:'all .15s',
          boxShadow:view==='historique'?'0 1px 4px rgba(0,0,0,0.3)':'none',
        }}>📋 Historique</button>
        <button onClick={()=>setView('calendrier')} style={{
          flex:1,padding:'8px',borderRadius:9,border:'none',cursor:'pointer',
          background:view==='calendrier'?'var(--s1)':'transparent',
          color:view==='calendrier'?'var(--text)':'var(--text3)',
          fontFamily:'var(--fb)',fontWeight:700,fontSize:13,
          transition:'all .15s',
          boxShadow:view==='calendrier'?'0 1px 4px rgba(0,0,0,0.3)':'none',
        }}>📅 Calendrier</button>
      </div>

      {view === 'historique' && <HistoriquePage onChanged={onChanged} />}
      {view === 'calendrier' && <CalendrierPage />}
    </div>
  )
}
