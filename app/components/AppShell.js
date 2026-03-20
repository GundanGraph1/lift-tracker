'use client'
import { useEffect, useState } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { applyTheme, getThemeFromUser } from '../../lib/themes'
import { LogoIcon } from './Logo'
import Toast from './Toast'
import SaisiePage from './pages/SaisiePage'
import JournalPage from './pages/JournalPage'
import ExplorePage from './pages/ExplorePage'
import ProfilPage from './pages/ProfilPage'
import UpdateBanner from './UpdateBanner'

const NAV = [
  { key: 'saisie',   label: 'Saisie',   icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2.5:2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )},
  { key: 'journal',  label: 'Journal',  icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2.5:2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )},
  { key: 'explore',  label: 'Explorer', icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active?2.5:2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { key: 'profil',   label: 'Moi',      icon: (active) => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active?"currentColor":"none"} stroke="currentColor" strokeWidth={active?0:2} strokeLinecap="round" strokeLinejoin="round">
      {active
        ? <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
        : <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></>
      }
    </svg>
  )},
]

export default function AppShell() {
  const currentUser = useStore(s => s.currentUser)
  const currentPage = useStore(s => s.currentPage)
  const [syncStatus, setSyncStatus] = useState('syncing')
  const [syncMsg, setSyncMsg] = useState('Connexion...')
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    if (!currentUser) return
    const savedPage = localStorage.getItem('lt_page')
    if (savedPage && NAV.find(n => n.key === savedPage)) actions.setCurrentPage(savedPage)
    else actions.setCurrentPage('saisie')
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
    for (const s of arr) {
      try {
        const { error } = await db.from('sessions').insert([{user_id:currentUser.id,session_date:s.date,session_time:s.time||'',muscle:s.muscle,notes:s.notes||'',exercises:JSON.stringify(s.exercises),total_volume:s.totalVolume}])
        if (!error) clearOfflineSession(s._offlineId)
      } catch(e) {}
    }
    loadAll()
  }

  function logout() {
    applyTheme('red', 'barlow')
    localStorage.removeItem('lt_user_id')
    localStorage.removeItem('lt_page')
    actions.setCurrentUser(null)
  }

  function navigate(key) {
    actions.setCurrentPage(key)
    localStorage.setItem('lt_page', key)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh'}}>
      <Toast />

      {/* Header — logo seulement */}
      <div className="app-header">
        <div className="header-logo">
          <LogoIcon size={52} />
        </div>
        {/* Sync status discret */}
        <div className="sync-bar" style={{margin:0}}>
          <div className={`sync-dot ${syncStatus}`} />
          <span style={{color:'var(--text3)',fontSize:11}}>{syncMsg}</span>
        </div>
      </div>

      {/* Offline banner */}
      {!isOnline && (
        <div style={{background:'rgba(255,150,0,.12)',border:'1px solid rgba(255,150,0,.3)',borderRadius:10,padding:'8px 14px',margin:'8px 16px',display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--orange)'}}>
          <span>📵</span><span>Mode hors ligne — séance sauvegardée localement</span>
        </div>
      )}

      {/* Page content */}
      <div className="page-container" style={{flex:1}}>
        {currentPage==='saisie'  && <SaisiePage onSaved={loadAll} saveOffline={saveOfflineSession} isOnline={isOnline} />}
        {currentPage==='journal' && <JournalPage onChanged={loadAll} />}
        {currentPage==='explore' && <ExplorePage />}
        {currentPage==='profil'  && <ProfilPage onLogout={logout} />}
      </div>

      {/* Bottom nav — 4 onglets fixes */}
      <nav style={{
        position:'fixed',bottom:0,left:0,right:0,zIndex:100,
        background:'var(--nav-bg,rgba(10,10,10,0.96))',
        backdropFilter:'var(--nav-blur,blur(20px))',
        WebkitBackdropFilter:'var(--nav-blur,blur(20px))',
        borderTop:'1px solid var(--border)',
        display:'flex',
        paddingBottom:'max(8px,env(safe-area-inset-bottom))',
      }}>
        {NAV.map(p => {
          const active = currentPage === p.key
          return (
            <button key={p.key} onClick={() => navigate(p.key)}
              className={`nav-btn${active?' active':''}`}
              style={{flex:1,position:'relative'}}>
              {active && (
                <span style={{
                  position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',
                  width:32,height:2.5,borderRadius:'0 0 3px 3px',
                  background:'var(--red)',
                  boxShadow:'var(--accent-glow,none)',
                }}/>
              )}
              <span className="icon" style={{color:active?'var(--red)':'var(--text3)'}}>
                {p.icon(active)}
              </span>
              <span style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:active?'var(--red)':'var(--text3)',textTransform:'uppercase'}}>
                {p.label}
              </span>
            </button>
          )
        })}
      </nav>

      <UpdateBanner />
    </div>
  )
}
