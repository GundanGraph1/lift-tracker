'use client'
import { useEffect, useState } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { applyTheme, getThemeFromUser } from '../../lib/themes'
import Toast from './Toast'
import EditProfile from './EditProfile'
import SaisiePage from './pages/SaisiePage'
import HistoriquePage from './pages/HistoriquePage'
import StatsPage from './pages/StatsPage'
import FeedPage from './pages/FeedPage'
import CalendrierPage from './pages/CalendrierPage'
import LeaderboardPage from './pages/LeaderboardPage'

export default function AppShell() {
  const currentUser = useStore(s => s.currentUser)
  const currentPage = useStore(s => s.currentPage)
  const [syncStatus, setSyncStatus] = useState('syncing')
  const [syncMsg, setSyncMsg] = useState('Connexion...')
  const [isOnline, setIsOnline] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const { themeKey, fontKey } = getThemeFromUser(currentUser)
    applyTheme(themeKey, fontKey)
    loadAll()
    const handleOnline = () => { setIsOnline(true); syncOffline() }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', () => setIsOnline(false))
    return () => window.removeEventListener('online', handleOnline)
  }, [currentUser?.id])

  async function loadAll() {
    if (!currentUser) return
    try {
      setSyncStatus('syncing'); setSyncMsg('Synchronisation...')
      const [sessRes, exRes, presRes, prRes, badgeRes] = await Promise.all([
        db.from('sessions').select('*').eq('user_id', currentUser.id).order('session_date', { ascending: false }),
        db.from('custom_exercises').select('*').eq('user_id', currentUser.id),
        db.from('presets').select('*').eq('user_id', currentUser.id),
        db.from('prs').select('*').eq('user_id', currentUser.id),
        db.from('badges').select('*').eq('user_id', currentUser.id),
      ])
      const sessions = (sessRes.data||[]).map(s=>({...s, exercises: typeof s.exercises==='string' ? JSON.parse(s.exercises) : (s.exercises||[])}))
      actions.setSessions(sessions)
      actions.setCustomExercises(exRes.data||[])
      actions.setPresets((presRes.data||[]).map(p=>({...p, exercises: typeof p.exercises==='string' ? JSON.parse(p.exercises) : (p.exercises||[])})))
      actions.setUserPRs(prRes.data||[])
      actions.setUserBadges(badgeRes.data||[])
      const pending = getOfflineSessions().length
      setSyncStatus('ok')
      setSyncMsg(`✓ Synchronisé — ${sessions.length} séances${pending > 0 ? ` · ${pending} en attente` : ''}`)
    } catch(e) {
      setSyncStatus('err'); setSyncMsg('Erreur de synchronisation')
    }
  }

  function getOfflineSessions() {
    try { return JSON.parse(localStorage.getItem('lt_offline_sessions')||'[]') } catch { return [] }
  }
  function saveOfflineSession(s) {
    const arr = getOfflineSessions(); arr.push({...s, _offlineId: Date.now()})
    localStorage.setItem('lt_offline_sessions', JSON.stringify(arr))
  }
  function clearOfflineSession(id) {
    localStorage.setItem('lt_offline_sessions', JSON.stringify(getOfflineSessions().filter(s=>s._offlineId!==id)))
  }
  async function syncOffline() {
    const arr = getOfflineSessions(); if (!arr.length) return
    let synced = 0
    for (const s of arr) {
      try {
        const { error } = await db.from('sessions').insert([{user_id:currentUser.id,session_date:s.date,session_time:s.time||'',muscle:s.muscle,notes:s.notes||'',exercises:JSON.stringify(s.exercises),total_volume:s.totalVolume}])
        if (!error) { clearOfflineSession(s._offlineId); synced++ }
      } catch(e) {}
    }
    if (synced > 0) loadAll()
  }

  function logout() {
    applyTheme('red', 'barlow')
    localStorage.removeItem('lt_user_id')
    localStorage.removeItem('lt_page')
    actions.setCurrentUser(null)
  }

  const pages = [
    { key:'saisie', icon:'✏️', label:'Saisie' },
    { key:'historique', icon:'📋', label:'Historique' },
    { key:'stats', icon:'📊', label:'Stats' },
    { key:'feed', icon:'👥', label:'Feed' },
    { key:'calendrier', icon:'📅', label:'Calendrier' },
    { key:'leaderboard', icon:'🏆', label:'Top' },
  ]

  const isImg = currentUser?.avatar?.startsWith('http') || currentUser?.avatar?.startsWith('data:')

  return (
    <div>
      <Toast />

      {/* Header */}
      <div className="app-header">
        <div className="header-logo" style={{display:'flex',alignItems:'center'}}>
          <svg viewBox="0 0 671.61 400" xmlns="http://www.w3.org/2000/svg" style={{height:28,width:'auto'}}>
            {/* Icône FITRA jaune */}
            <rect x="595.5" y="0" width="76.11" height="76.11" rx="9.38" ry="9.38" fill="var(--red)"/>
            <path d="M647.22,31.49l-10.63-.02h0s-.76,0-.76,0c-.87,0-1.66-.35-2.22-.92-.57-.57-.92-1.36-.92-2.22,0-1.63,1.25-2.96,2.85-3.11l8.61-.04c1.08,0,1.89-.96,1.89-1.94l1.89-7.06c0-1.16-.92-2.01-2.09-2.01h-11.89c-.74,0-1.93.59-2.44,1.11l-12.79,15.89c-.68.67-1,1.86-1,2.85v1.61h0v18.58h.02c-.01.12-.02.24-.02.37v6.54h0c0,.47.38.85.85.85.18,0,.34-.05.47-.15l9.24-7.14c.96-.65,1.53-1.73,1.53-2.89v-13.28c0-.98.71-1.75,1.57-1.94.64-.13,1.45.18,1.92.76.05.06.09.12.13.18l.83,1.15.05.06,3.03,4.06c.28.38.54.79.81,1.18.62.91,1.64,1.38,2.92,1.38h6.03c1.1,0,2.15-.75,2.15-1.94l.13-9.87c0-1.21-1-2.04-2.17-2.05z" fill="white"/>
            {/* Texte LIFT TRACKER */}
            <g fill="var(--text)" transform="translate(0, -330)">
              <polygon points="33 787.77 38.96 787.77 38.96 777.53 48.07 777.53 48.07 772.54 38.96 772.54 38.96 766.43 49.62 766.43 49.62 761.44 33 761.44 33 787.77"/>
              <rect x="54.18" y="761.44" width="5.95" height="26.33"/>
              <polygon points="64.24 766.43 71.49 766.43 71.49 787.77 77.45 787.77 77.45 766.43 84.69 766.43 84.69 761.44 64.24 761.44 64.24 766.43"/>
              <polygon points="94.76 776.71 103.74 776.71 103.74 771.72 94.76 771.72 94.76 766.43 105.31 766.43 105.31 761.44 88.81 761.44 88.81 787.77 105.71 787.77 105.71 782.78 94.76 782.78 94.76 776.71"/>
              <path d="M130.6,769.64c0-6.26-4.58-8.2-10.16-8.2h-9.48v26.33h5.95v-9.48h3.27l5.03,9.48h6.66l-5.96-10.54c2.81-1.27,4.69-3.73,4.69-7.6ZM116.9,766.17h3.05c3.13,0,4.81.87,4.81,3.47s-1.68,3.93-4.81,3.93h-3.05v-7.4Z"/>
              <path d="M149.39,787.77h6.3l-8.27-26.33h-7.12l-8.27,26.33h6.09l1.63-6.27h8.03l1.62,6.27ZM140.94,776.87l.63-2.44c.73-2.63,1.44-5.71,2.07-8.49h.16c.7,2.75,1.41,5.86,2.14,8.49l.63,2.44h-5.63Z"/>
            </g>
          </svg>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          {/* Avatar cliquable → ouvre EditProfile */}
          <div onClick={() => setShowEdit(true)} style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',padding:'4px 8px',borderRadius:10,transition:'background .15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='var(--s2)'}
            onMouseLeave={e=>e.currentTarget.style.background='transparent'}
          >
            {isImg
              ? <div style={{width:30,height:30,borderRadius:'50%',backgroundImage:`url(${currentUser.avatar})`,backgroundSize:'cover',backgroundPosition:'center',border:'2px solid var(--border2)',flexShrink:0}} />
              : <div style={{width:30,height:30,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,border:'2px solid var(--border2)',flexShrink:0}}>{currentUser?.avatar||'💪'}</div>
            }
            <span style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}>{currentUser?.username}</span>
            <span style={{fontSize:11,color:'var(--text3)'}}>⚙️</span>
          </div>
          {/* Logout */}
          <button onClick={logout} title="Changer de profil" style={{background:'none',border:'none',color:'var(--text3)',fontSize:18,cursor:'pointer',padding:'4px 6px',lineHeight:1}}>↩</button>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{background:'rgba(255,150,0,.12)',border:'1px solid rgba(255,150,0,.3)',borderRadius:10,padding:'8px 14px',margin:'8px 16px',display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--orange)'}}>
          <span>📵</span><span>Mode hors ligne — ta séance sera synchronisée au retour du réseau</span>
        </div>
      )}

      {/* Page content */}
      <div className="page-container">
        <div className="sync-bar">
          <div className={`sync-dot ${syncStatus}`} />
          <span style={{color:'var(--text2)',fontSize:12}}>{syncMsg}</span>
        </div>
        {currentPage==='saisie' && <SaisiePage onSaved={loadAll} saveOffline={saveOfflineSession} isOnline={isOnline} />}
        {currentPage==='historique' && <HistoriquePage onChanged={loadAll} />}
        {currentPage==='stats' && <StatsPage />}
        {currentPage==='feed' && <FeedPage />}
        {currentPage==='calendrier' && <CalendrierPage />}
        {currentPage==='leaderboard' && <LeaderboardPage />}
      </div>

      {/* Bottom nav */}
      <nav className="nav-bar">
        <div className="nav-bar-inner">
          {pages.map(p => (
            <button key={p.key} className={`nav-btn${currentPage===p.key?' active':''}`}
              onClick={() => { actions.setCurrentPage(p.key); localStorage.setItem('lt_page', p.key) }}>
              <span className="icon">{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Edit Profile Modal */}
      {showEdit && <EditProfile onClose={() => setShowEdit(false)} />}
    </div>
  )
}
