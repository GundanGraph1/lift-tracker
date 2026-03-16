'use client'
import { useEffect, useState } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { applyTheme, getThemeFromUser } from '../../lib/themes'
import { LogoIcon } from './Logo'
import Toast from './Toast'
import EditProfile from './EditProfile'
import SaisiePage from './pages/SaisiePage'
import HistoriquePage from './pages/HistoriquePage'
import StatsPage from './pages/StatsPage'
import FeedPage from './pages/FeedPage'
import CalendrierPage from './pages/CalendrierPage'
import LeaderboardPage from './pages/LeaderboardPage'
import SantePage from './pages/SantePage'
import UpdateBanner from './UpdateBanner'

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
      const [sessRes, exRes, presRes, prRes, badgeRes, cardioRes] = await Promise.all([
        db.from('sessions').select('*').eq('user_id', currentUser.id).order('session_date', { ascending: false }),
        db.from('custom_exercises').select('*').eq('user_id', currentUser.id),
        db.from('presets').select('*').eq('user_id', currentUser.id),
        db.from('prs').select('*').eq('user_id', currentUser.id),
        db.from('badges').select('*').eq('user_id', currentUser.id),
        db.from('cardio_sessions').select('*').eq('user_id', currentUser.id).order('session_date', { ascending: false }),
      ])
      const sessions = (sessRes.data||[]).map(s=>({...s, exercises: typeof s.exercises==='string' ? JSON.parse(s.exercises) : (s.exercises||[])}))
      actions.setSessions(sessions)
      actions.setCustomExercises(exRes.data||[])
      actions.setPresets((presRes.data||[]).map(p=>({...p, exercises: typeof p.exercises==='string' ? JSON.parse(p.exercises) : (p.exercises||[])})))
      actions.setUserPRs(prRes.data||[])
      actions.setUserBadges(badgeRes.data||[])
      actions.setCardioSessions(cardioRes.data||[])
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
    { key:'sante', icon:'❤️', label:'Santé' },
  ]

  const isImg = currentUser?.avatar?.startsWith('http') || currentUser?.avatar?.startsWith('data:')

  return (
    <div>
      <Toast />

      {/* Header */}
      <div className="app-header">
        <div className="header-logo" style={{display:'flex',alignItems:'center'}}>
          <LogoIcon size={52} />
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
        {currentPage==='sante' && <SantePage />}
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

      {/* Update Banner — shown once per user per version */}
      <UpdateBanner />
    </div>
  )
}
