'use client'
import { useState } from 'react'
import StatsPage from './StatsPage'
import LeaderboardPage from './LeaderboardPage'
import FeedPage from './FeedPage'

export default function ExplorePage() {
  const [view, setView] = useState('stats') // 'stats' | 'leaderboard' | 'feed'

  const tabs = [
    { k: 'stats',        l: '📊 Stats' },
    { k: 'leaderboard',  l: '🏆 Top' },
    { k: 'feed',         l: '👥 Feed' },
  ]

  return (
    <div>
      {/* Switcher compact */}
      <div style={{display:'flex',background:'var(--s2)',borderRadius:12,padding:3,gap:2,marginBottom:20}}>
        {tabs.map(t=>(
          <button key={t.k} onClick={()=>setView(t.k)} style={{
            flex:1,padding:'8px 4px',borderRadius:9,border:'none',cursor:'pointer',
            background:view===t.k?'var(--s1)':'transparent',
            color:view===t.k?'var(--text)':'var(--text3)',
            fontFamily:'var(--fb)',fontWeight:700,fontSize:12,
            transition:'all .15s',
            boxShadow:view===t.k?'0 1px 4px rgba(0,0,0,0.3)':'none',
          }}>{t.l}</button>
        ))}
      </div>

      {view === 'stats' && <StatsPage />}
      {view === 'leaderboard' && <LeaderboardPage />}
      {view === 'feed' && <FeedPage />}
    </div>
  )
}
