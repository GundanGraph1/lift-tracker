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
import NavEditor from './NavEditor'

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

  const [showNavEdit, setShowNavEdit] = useState(false)
  const [navPage, setNavPage] = useState(0) // page courante du carousel nav
  const navSwipeRef = { startX: null, startY: null }

  // Toutes les pages disponibles
  const ALL_PAGES = [
    { key:'saisie',      icon:'✏️',  label:'Saisie' },
    { key:'historique',  icon:'📋',  label:'Historique' },
    { key:'stats',       icon:'📊',  label:'Stats' },
    { key:'feed',        icon:'👥',  label:'Feed' },
    { key:'sante',       icon:'❤️',  label:'Santé' },
    { key:'calendrier',  icon:'📅',  label:'Calendrier' },
    { key:'leaderboard', icon:'🏆',  label:'Classement' },
  ]

  // Nav order sauvegardée par user (4 onglets visibles)
  const DEFAULT_NAV = ['saisie','historique','stats','feed']
  const getNavOrder = () => {
    try {
      const saved = localStorage.getItem(`lt_nav_${currentUser?.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed.slice(0,4)
      }
    } catch {}
    return DEFAULT_NAV
  }
  const [navOrder, setNavOrder] = useState(DEFAULT_NAV)
  useEffect(() => { setNavOrder(getNavOrder()) }, [currentUser?.id])

  // Auto-sync groupe nav si la page active n'est pas visible
  useEffect(() => {
    const allNav = [...navOrder.map(k => ALL_PAGES.find(p => p.key === k)).filter(Boolean),
                    ...ALL_PAGES.filter(p => !navOrder.includes(p.key))]
    const idx = allNav.findIndex(p => p.key === currentPage)
    if (idx >= 0) setNavPage(Math.floor(idx / 4))
  }, [currentPage])

  const saveNavOrder = (order) => {
    setNavOrder(order)
    localStorage.setItem(`lt_nav_${currentUser?.id}`, JSON.stringify(order))
    setNavPage(0)
    setShowNavEdit(false)
  }

  // Pages préférées (dans l'ordre choisi) + les autres à la suite
  const favPages = navOrder.map(k => ALL_PAGES.find(p => p.key === k)).filter(Boolean)
  const extraPages = ALL_PAGES.filter(p => !navOrder.includes(p.key))
  const allNavPages = [...favPages, ...extraPages]
  // Groupes de 4 pour le carousel
  const NAV_GROUP_SIZE = 4
  const navGroups = []
  for (let i = 0; i < allNavPages.length; i += NAV_GROUP_SIZE) {
    navGroups.push(allNavPages.slice(i, i + NAV_GROUP_SIZE))
  }
  const currentNavGroup = navGroups[navPage] || navGroups[0] || []
  const totalNavGroups = navGroups.length

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

      {/* Bottom nav — carousel swipeable */}
      <nav className="nav-bar"
        onTouchStart={e => { navSwipeRef.startX = e.touches[0].clientX; navSwipeRef.startY = e.touches[0].clientY }}
        onTouchEnd={e => {
          if (navSwipeRef.startX === null) return
          const dx = e.changedTouches[0].clientX - navSwipeRef.startX
          const dy = Math.abs(e.changedTouches[0].clientY - navSwipeRef.startY)
          if (Math.abs(dx) > 40 && dy < 30) {
            if (dx < 0 && navPage < totalNavGroups - 1) setNavPage(p => p + 1)
            if (dx > 0 && navPage > 0) setNavPage(p => p - 1)
          }
          navSwipeRef.startX = null
        }}>
        <div className="nav-bar-inner">
          {currentNavGroup.map(p => (
            <button key={p.key}
              className={`nav-btn${currentPage===p.key?' active':''}`}
              onClick={() => { actions.setCurrentPage(p.key); localStorage.setItem('lt_page', p.key) }}
              onContextMenu={e => { e.preventDefault(); setShowNavEdit(true) }}
              onTouchStart={e => { e.currentTarget._lt = setTimeout(() => setShowNavEdit(true), 500) }}
              onTouchEnd={e => clearTimeout(e.currentTarget._lt)}
              onTouchMove={e => clearTimeout(e.currentTarget._lt)}>
              <span className="icon">{p.icon}</span>{p.label}
            </button>
          ))}
        </div>
        {/* Dots pagination — visibles seulement si >1 groupe */}
        {totalNavGroups > 1 && (
          <div style={{display:'flex',justifyContent:'center',gap:5,paddingBottom:'max(6px,env(safe-area-inset-bottom))',paddingTop:3}}>
            {navGroups.map((_,i) => (
              <div key={i} onClick={() => setNavPage(i)} style={{
                width: i===navPage ? 16 : 5,
                height:5, borderRadius:3,
                background: i===navPage ? 'var(--red)' : 'var(--border2)',
                transition:'all .25s cubic-bezier(.34,1.56,.64,1)',
                cursor:'pointer',
                boxShadow: i===navPage ? 'var(--accent-glow,none)' : 'none',
              }} />
            ))}
          </div>
        )}
      </nav>

      {/* Modal personnalisation nav */}
      {showNavEdit && (
        <NavEditor
          allPages={ALL_PAGES}
          navOrder={navOrder}
          onSave={saveNavOrder}
          onClose={() => setShowNavEdit(false)}
        />
      )}

      {/* Edit Profile Modal */}
      {showEdit && <EditProfile onClose={() => setShowEdit(false)} />}

      {/* Update Banner — shown once per user per version */}
      <UpdateBanner />
    </div>
  )
}
