'use client'
import { useState, useEffect } from 'react'

let _showBadgeUnlock = null
export function showBadgeUnlock(badge) {
  if (_showBadgeUnlock) _showBadgeUnlock(badge)
}

export default function BadgeUnlock() {
  const [badge, setBadge] = useState(null)
  const [visible, setVisible] = useState(false)
  const [phase, setPhase] = useState('in') // 'in' | 'stay' | 'out'

  useEffect(() => {
    _showBadgeUnlock = (b) => {
      setBadge(b)
      setPhase('in')
      setVisible(true)
      // Séquence : entrée 0.5s → stay 2.5s → sortie 0.5s
      setTimeout(() => setPhase('stay'), 500)
      setTimeout(() => setPhase('out'), 3000)
      setTimeout(() => setVisible(false), 3500)
    }
    return () => { _showBadgeUnlock = null }
  }, [])

  if (!visible || !badge) return null

  const color = badge.color || '#fbbf24'

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: `translate(-50%, -50%) scale(${phase === 'in' ? 0.5 : phase === 'out' ? 0.8 : 1})`,
      opacity: phase === 'in' ? 0 : phase === 'out' ? 0 : 1,
      transition: phase === 'in'
        ? 'all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        : 'all 0.4s ease-in',
      zIndex: 9999,
      pointerEvents: 'none',
    }}>
      {/* Fond flouté */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: -1,
        opacity: phase === 'stay' ? 1 : 0,
        transition: 'opacity 0.3s',
      }}/>

      {/* Card */}
      <div style={{
        background: 'var(--s1)',
        border: `2px solid ${color}`,
        borderRadius: 24,
        padding: '32px 40px',
        textAlign: 'center',
        boxShadow: `0 0 60px ${color}40, 0 20px 60px rgba(0,0,0,0.5)`,
        minWidth: 260,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow de fond */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 50% 40%, ${color}20, transparent 70%)`,
          pointerEvents: 'none',
        }}/>

        {/* Particules */}
        {phase === 'stay' && [0,1,2,3,4,5].map(i => (
          <div key={i} style={{
            position: 'absolute',
            width: 6, height: 6,
            borderRadius: '50%',
            background: color,
            top: `${20 + Math.sin(i*1.2)*30}%`,
            left: `${10 + (i/5)*80}%`,
            animation: `floatUp${i} 2s ease-out infinite`,
            opacity: 0.6,
            animationDelay: `${i*0.3}s`,
          }}/>
        ))}

        {/* Texte haut */}
        <div style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 3,
          textTransform: 'uppercase',
          color: color,
          marginBottom: 16,
          fontFamily: 'var(--fb)',
        }}>🔓 Badge débloqué !</div>

        {/* Icône */}
        <div style={{
          fontSize: 72,
          lineHeight: 1,
          marginBottom: 12,
          filter: `drop-shadow(0 0 20px ${color}80)`,
          animation: phase === 'stay' ? 'badgePulse 1s ease-in-out infinite' : 'none',
        }}>
          {badge.icon}
        </div>

        {/* Nom */}
        <div style={{
          fontFamily: 'var(--fm)',
          fontSize: 28,
          fontWeight: 900,
          color: color,
          letterSpacing: 2,
          textTransform: 'uppercase',
          marginBottom: 6,
          textShadow: `0 0 20px ${color}60`,
        }}>
          {badge.name}
        </div>

        {/* Description */}
        <div style={{
          fontSize: 13,
          color: 'var(--text2)',
          fontFamily: 'var(--fb)',
        }}>
          {badge.desc}
        </div>
      </div>

      <style>{`
        @keyframes badgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        @keyframes floatUp0 { 0% { transform: translateY(0) scale(1); opacity:0.6; } 100% { transform: translateY(-40px) scale(0); opacity:0; } }
        @keyframes floatUp1 { 0% { transform: translateY(0) scale(1); opacity:0.6; } 100% { transform: translateY(-55px) scale(0); opacity:0; } }
        @keyframes floatUp2 { 0% { transform: translateY(0) scale(1); opacity:0.6; } 100% { transform: translateY(-35px) scale(0); opacity:0; } }
        @keyframes floatUp3 { 0% { transform: translateY(0) scale(1); opacity:0.6; } 100% { transform: translateY(-50px) scale(0); opacity:0; } }
        @keyframes floatUp4 { 0% { transform: translateY(0) scale(1); opacity:0.6; } 100% { transform: translateY(-45px) scale(0); opacity:0; } }
        @keyframes floatUp5 { 0% { transform: translateY(0) scale(1); opacity:0.6; } 100% { transform: translateY(-60px) scale(0); opacity:0; } }
      `}</style>
    </div>
  )
}
