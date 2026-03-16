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

  useEffect(() => {
    const savedId = localStorage.getItem('lt_user_id')
    if (savedId) {
      db.from('users').select('*').eq('id', savedId).single().then(({ data }) => {
        if (data) actions.setCurrentUser(data)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  if (loading) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100vh', background: 'var(--bg)'
    }}>
      <style>{`
        @keyframes lt-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lt-pulse-soft {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        .lt-logo-loading {
          animation: lt-fadein 0.8s ease forwards;
        }
        .lt-logo-loading svg {
          animation: lt-pulse-soft 2.5s ease-in-out infinite;
          animation-delay: 0.8s;
        }
      `}</style>
      <div className="lt-logo-loading">
        <LogoWelcome size={160} />
      </div>
    </div>
  )

  return currentUser ? <AppShell /> : <LoginScreen />
}

