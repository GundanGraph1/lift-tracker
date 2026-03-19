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
            {isImg
              ? <div style={{width:30,height:30,borderRadius:'50%',backgroundImage:`url(${currentUser.avatar})`,backgroundSize:'cover',backgroundPosition:'center',border:'2px solid var(--border2)',flexShrink:0}} />
              : <div style={{width:30,height:30,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,border:'2px solid var(--border2)',flexShrink:0}}>{currentUser?.avatar||'💪'}</div>
            }
            <span style={{fontSize:13,fontWeight:600,color:'var(--text2)'}}>{currentUser?.username}</span>
            <svg width="13" height="13" viewBox="0 0 1024 1024" style={{flexShrink:0,opacity:0.4,color:'var(--text3)'}}>
              <path d="M902.948571 369.371429l82.358858 19.456a21.942857 21.942857 0 0 1 16.896 21.357714v187.465143a21.942857 21.942857 0 0 1-17.554286 21.504l-80.749714 16.310857a21.942857 21.942857 0 0 0-13.750858 33.792l43.154286 64a21.942857 21.942857 0 0 1-2.779428 27.940571l-135.753143 132.681143a21.942857 21.942857 0 0 1-26.989715 2.925714l-78.555428-49.298285a21.942857 21.942857 0 0 0-33.133714 14.043428l-16.822858 78.774857a21.942857 21.942857 0 0 1-21.357714 17.334858h-191.634286a21.942857 21.942857 0 0 1-21.211428-16.530286l-20.845714-81.481143a21.942857 21.942857 0 0 0-33.133715-13.019429l-69.924571 45.202286a21.942857 21.942857 0 0 1-27.355429-2.779428l-135.533714-133.266286a21.942857 21.942857 0 0 1-2.925714-27.721143l48.859428-74.459429a21.942857 21.942857 0 0 0-13.897143-33.499428L68.900571 603.136a21.942857 21.942857 0 0 1-17.481142-21.504v-186.514286a21.942857 21.942857 0 0 1 17.408-21.430857l86.820571-18.578286a21.942857 21.942857 0 0 0 13.750857-33.645714l-43.008-64.804571a21.942857 21.942857 0 0 1 2.779429-27.648l135.021714-134.436572a21.942857 21.942857 0 0 1 26.843429-3.218285l72.630857 44.178285a21.942857 21.942857 0 0 0 32.694857-13.458285L415.158857 46.372571a21.942857 21.942857 0 0 1 21.284572-16.603428l191.634285 0.438857a21.942857 21.942857 0 0 1 21.430857 17.773714l16.603429 84.553143a21.942857 21.942857 0 0 0 33.206857 14.409143l71.533714-45.056a21.942857 21.942857 0 0 1 26.916572 2.779429l136.923428 131.803428a21.942857 21.942857 0 0 1 2.925715 28.013714l-47.835429 71.314286a21.942857 21.942857 0 0 0 13.165714 33.645714zM526.774857 294.765714a198.729143 198.729143 0 0 1 194.121143 241.298286 31.524571 31.524571 0 0 1-61.659429-13.458286 135.899429 135.899429 0 0 0-132.388571-164.790857 135.606857 135.606857 0 1 0 54.930286 259.657143 31.524571 31.524571 0 1 1 25.6 57.636571 198.729143 198.729143 0 1 1-80.603429-380.342857z" fill="currentColor"/>
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
