'use client'
import { useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { useStore, actions } from '../lib/store'
import LoginScreen from './components/LoginScreen'
import AppShell from './components/AppShell'
import { LogoWelcome } from './components/Logo'

export default function Home() {
  const currentUser = useStore(s => s.currentUser)
  const [loading, setLoading] = useState(true)
  const [phase, setPhase] = useState(0) // 0=fade in, 1=pulse, 2=fade out

  useEffect(() => {
    // Animation : fade in → pulse → fade out
    const t1 = setTimeout(() => setPhase(1), 400)
    const t2 = setTimeout(() => setPhase(2), 1200)

    const savedId = localStorage.getItem('lt_user_id')
    if (savedId) {
      db.from('users').select('*').eq('id', savedId).single().then(({ data }) => {
        if (data) actions.setCurrentUser(data)
        setTimeout(() => setLoading(false), 1400)
      })
    } else {
      setTimeout(() => setLoading(false), 1400)
    }
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)', gap: 24
    }}>
      <style>{`
        @keyframes lt-breathe {
          0%, 100% { opacity: 0.25; transform: scale(0.92); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes lt-fadein {
          from { opacity: 0; transform: scale(0.88); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes lt-fadeout {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(1.06); }
        }
        .lt-logo-phase0 { animation: lt-fadein 0.4s ease forwards; }
        .lt-logo-phase1 { animation: lt-breathe 0.8s ease-in-out infinite; }
        .lt-logo-phase2 { animation: lt-fadeout 0.25s ease forwards; }
        .lt-dots span {
          display: inline-block;
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--red); opacity: 0.3;
          animation: lt-breathe 1s ease-in-out infinite;
        }
        .lt-dots span:nth-child(2) { animation-delay: 0.2s; }
        .lt-dots span:nth-child(3) { animation-delay: 0.4s; }
      `}</style>
      <div className={`lt-logo-phase${phase}`}>
        <LogoWelcome size={180} />
      </div>
      <div className="lt-dots" style={{ display: 'flex', gap: 8 }}>
        <span /><span /><span />
      </div>
    </div>
  )

  return currentUser ? <AppShell /> : <LoginScreen />
}

