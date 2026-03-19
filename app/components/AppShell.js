'use client'
import { useEffect, useState, useRef } from 'react'
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

  // ── Toutes les pages disponibles ──
  const ALL_PAGES = [
    { key:'saisie',      icon:'✏️',  label:'Saisie' },
    { key:'historique',  icon:'📋',  label:'Historique' },
    { key:'stats',       icon:'📊',  label:'Stats' },
    { key:'feed',        icon:'👥',  label:'Feed' },
    { key:'sante',       icon:'❤️',  label:'Santé' },
    { key:'calendrier',  icon:'📅',  label:'Calendrier' },
    { key:'leaderboard', icon:'🏆',  label:'Classement' },
  ]

  // Nav order : 3 onglets principaux configurables
  const DEFAULT_NAV = ['saisie','historique','stats']
  const getNavOrder = () => {
    try {
      const saved = localStorage.getItem(`lt_nav_${currentUser?.id}`)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length >= 2) return parsed.slice(0,3)
      }
    } catch {}
    return DEFAULT_NAV
  }
  const [navOrder, setNavOrder] = useState(DEFAULT_NAV)
  useEffect(() => { setNavOrder(getNavOrder()) }, [currentUser?.id])

  const saveNavOrder = (order) => {
    setNavOrder(order.slice(0,3))
    localStorage.setItem(`lt_nav_${currentUser?.id}`, JSON.stringify(order.slice(0,3)))
    setShowNavEdit(false)
    setNavOffset(0)
    setNavDrag(0)
  }

  // Pages ordonnées : favorites d'abord, reste à la suite
  const favPages = navOrder.map(k => ALL_PAGES.find(p => p.key === k)).filter(Boolean)
  const extraPages = ALL_PAGES.filter(p => !navOrder.includes(p.key))
  const allNavPages = [...favPages, ...extraPages] // 7 pages total

  // ── Détection desktop (pas de touch) ──
  const [isDesktop, setIsDesktop] = useState(false)
  useEffect(() => {
    const check = () => setIsDesktop(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Swipe physique avec inertie (mobile uniquement) ──
  const [navOffset, setNavOffset] = useState(0)
  const [navDrag, setNavDrag] = useState(0)
  const swipe = useRef({ x0: null, y0: null, t0: null, vx: 0 })
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v))
  const getTabW = () => typeof window !== 'undefined' ? Math.floor(window.innerWidth / 3) : 120
  const getMaxOff = (n) => Math.max(0, (n - 3) * getTabW())

  const navTranslateX = clamp(-(navOffset - navDrag), -getMaxOff(allNavPages.length), 0)
  const navActivePage = Math.round(navOffset / getTabW())

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
            <div style={{width:30,height:30,borderRadius:'50%',border:'2px solid var(--border2)',flexShrink:0,overflow:'hidden',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              {isImg
                ? <img src={currentUser.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                : <span style={{fontSize:15}}>{currentUser?.avatar||'💪'}</span>
              }
            </div>
            <span style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}>{currentUser?.username}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:0.45}}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </div>

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
      <nav className="nav-bar"
        onTouchStart={!isDesktop ? e => {
          const t = e.touches[0]
          swipe.current.x0 = t.clientX; swipe.current.y0 = t.clientY
          swipe.current.t0 = Date.now(); swipe.current.vx = 0
        } : undefined}
        onTouchMove={!isDesktop ? e => {
          if (swipe.current.x0 === null) return
          const dx = e.touches[0].clientX - swipe.current.x0
          const dy = Math.abs(e.touches[0].clientY - swipe.current.y0)
          if (dy > Math.abs(dx) + 8) return
          e.preventDefault()
          const now = Date.now()
          swipe.current.vx = (e.touches[0].clientX - swipe.current.x0) / Math.max(1, now - swipe.current.t0)
          setNavDrag(dx)
        } : undefined}
        onTouchEnd={!isDesktop ? () => {
          if (swipe.current.x0 === null) return
          const tabW = getTabW()
          const maxOff = getMaxOff(allNavPages.length)
          let target = navOffset - navDrag
          if (swipe.current.vx < -0.3) target += tabW
          if (swipe.current.vx > 0.3) target -= tabW
          const snapped = Math.round(target / tabW) * tabW
          setNavOffset(clamp(snapped, 0, maxOff))
          setNavDrag(0)
          swipe.current.x0 = null
        } : undefined}
        style={{touchAction: isDesktop ? 'auto' : 'pan-y'}}>

        {isDesktop ? (
          /* ── Desktop : tous les onglets visibles d'un coup ── */
          <div style={{display:'flex',width:'100%',maxWidth:740,margin:'0 auto',padding:'4px 0'}}>
            {allNavPages.map(p => (
              <button key={p.key}
                className={`nav-btn${currentPage===p.key?' active':''}`}
                style={{flex:1}}
                onClick={() => { actions.setCurrentPage(p.key); localStorage.setItem('lt_page', p.key) }}
                onContextMenu={e => { e.preventDefault(); setShowNavEdit(true) }}>
                <span className="icon">{p.icon}</span>{p.label}
              </button>
            ))}
          </div>
        ) : (
          /* ── Mobile : carousel swipeable 3 onglets ── */
          <>
            <div style={{overflow:'hidden',width:'100%',position:'relative'}}>
              <div style={{
                display:'flex',
                width:`${allNavPages.length * 100 / 3}%`,
                transform:`translateX(${navTranslateX}px)`,
                transition: navDrag !== 0 ? 'none' : 'transform .35s cubic-bezier(.25,.46,.45,.94)',
                willChange:'transform',
              }}>
                {allNavPages.map(p => (
                  <button key={p.key}
                    className={`nav-btn${currentPage===p.key?' active':''}`}
                    style={{width:`${100/allNavPages.length}%`,flexShrink:0}}
                    onClick={() => { actions.setCurrentPage(p.key); localStorage.setItem('lt_page', p.key) }}
                    onContextMenu={e => { e.preventDefault(); setShowNavEdit(true) }}
                    onTouchStart={e => { e.currentTarget._lt = setTimeout(() => setShowNavEdit(true), 600) }}
                    onTouchEnd={e => clearTimeout(e.currentTarget._lt)}
                    onTouchMove={e => clearTimeout(e.currentTarget._lt)}>
                    <span className="icon">{p.icon}</span>{p.label}
                  </button>
                ))}
              </div>
            </div>
            {allNavPages.length > 3 && (
              <div style={{display:'flex',justifyContent:'center',alignItems:'center',gap:4,padding:'3px 0 max(6px,env(safe-area-inset-bottom))'}}>
                {allNavPages.map((_,i) => {
                  const isActive = i >= navActivePage && i < navActivePage + 3
                  return (
                    <div key={i} style={{
                      width:isActive?5:3, height:isActive?5:3, borderRadius:'50%',
                      background:isActive?'var(--red)':'var(--border2)',
                      transition:'all .2s ease', opacity:isActive?1:0.5,
                    }} />
                  )
                })}
              </div>
            )}
          </>
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
      {showEdit && <EditProfile onClose={() => setShowEdit(false)} onLogout={() => { logout(); setShowEdit(false); }} />}

      {/* Update Banner — shown once per user per version */}
      <UpdateBanner />
    </div>
  )
}
