'use client'
import { useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { useStore, actions } from '../lib/store'
import LoginScreen from './components/LoginScreen'
import AppShell from './components/AppShell'

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
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'var(--bg)' }}>
      <div style={{ fontFamily:'var(--fm)', fontSize:32, fontWeight:900, color:'var(--red)', letterSpacing:3 }}>LIFT TRACKER</div>
    </div>
  )

  return currentUser ? <AppShell /> : <LoginScreen />
}
