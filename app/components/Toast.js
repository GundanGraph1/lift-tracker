'use client'
import { useEffect, useState } from 'react'

let _show = null
export function showToast(msg, color = 'var(--text)') {
  if (_show) _show(msg, color)
}

export default function Toast() {
  const [msg, setMsg] = useState('')
  const [color, setColor] = useState('var(--text)')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    _show = (m, c) => {
      setMsg(m); setColor(c || 'var(--text)'); setVisible(true)
      setTimeout(() => setVisible(false), 2800)
    }
  }, [])

  return (
    <div className={`toast-wrap${visible ? ' show' : ''}`} style={{ color }}>
      {msg}
    </div>
  )
}
