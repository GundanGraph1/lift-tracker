'use client'
import { useEffect, useState } from 'react'
import { useStore, actions } from '../../lib/store'

// Version de la mise à jour — changer ce string à chaque grosse mise à jour
const UPDATE_VERSION = 'v2-sante-cardio'

export default function UpdateBanner() {
  const currentUser = useStore(s => s.currentUser)
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!currentUser) return
    const key = `lt_update_seen_${currentUser.id}_${UPDATE_VERSION}`
    const seen = localStorage.getItem(key)
    if (!seen) setVisible(true)
  }, [currentUser])

  function dismiss(dontShowAgain) {
    if (dontShowAgain) {
      const key = `lt_update_seen_${currentUser.id}_${UPDATE_VERSION}`
      localStorage.setItem(key, '1')
    }
    setVisible(false)
  }

  function goToProfile() {
    dismiss(true)
    actions.setCurrentPage('profil')
    // Signal ProfilPage to open Santé tab
    window.dispatchEvent(new CustomEvent('lt-open-tab', { detail: 'sante' }))
  }

  if (!visible) return null

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => dismiss(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 1000, backdropFilter: 'blur(4px)'
      }} />

      {/* Modal */}
      <div style={{
        position: 'fixed', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(92vw, 400px)',
        background: 'var(--s1)', border: '1px solid var(--border)',
        borderRadius: 20, padding: 24, zIndex: 1001,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
      }}>
        {/* Badge nouveauté */}
        <div style={{
          display: 'inline-block', background: 'var(--red)', color: 'white',
          fontSize: 10, fontWeight: 800, fontFamily: 'var(--fb)',
          letterSpacing: 1.5, padding: '4px 10px', borderRadius: 20,
          marginBottom: 14
        }}>MISE À JOUR</div>

        <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--fm)', color: 'var(--text)', marginBottom: 8, lineHeight: 1.2 }}>
          Cardio &amp; Suivi<br />nutritionnel
        </div>

        <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 16 }}>
          La nouvelle mise à jour est là ! Pour en profiter pleinement, renseigne tes infos physiques :
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
          {[
            { icon: '', text: 'Ton poids & ta taille', sub: 'Pour calculer ton IMC et tes calories' },
            { icon: '', text: 'Ton année de naissance', sub: 'Pour le métabolisme de base (BMR)' },
            { icon: '', text: 'Ton objectif', sub: 'Prise de masse, sèche, maintien...' },
            { icon: '', text: 'Cardio dans la saisie', sub: 'Tapis, vélo, rameur — calories auto' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', background: 'var(--s2)',
              borderRadius: 10, border: '1px solid var(--border)'
            }}>
              <span style={{ fontSize: 20 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.text}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{item.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={goToProfile} style={{
          width: '100%', padding: '13px', background: 'var(--red)', border: 'none',
          borderRadius: 12, color: 'white', fontSize: 14, fontFamily: 'var(--fm)',
          fontWeight: 800, cursor: 'pointer', letterSpacing: 0.5, marginBottom: 10
        }}>
          Voir la page Santé
        </button>

        <button onClick={() => dismiss(false)} style={{
          width: '100%', padding: '10px', background: 'transparent', border: '1px solid var(--border)',
          borderRadius: 12, color: 'var(--text2)', fontSize: 13, fontFamily: 'var(--fb)',
          fontWeight: 600, cursor: 'pointer', marginBottom: 10
        }}>
          Plus tard
        </button>

        {/* Ne plus afficher */}
        <button onClick={() => dismiss(true)} style={{
          width: '100%', background: 'none', border: 'none',
          color: 'var(--text3)', fontSize: 11, fontFamily: 'var(--fb)',
          cursor: 'pointer', padding: '4px', textDecoration: 'underline'
        }}>
          ✕ Ne plus afficher
        </button>
      </div>
    </>
  )
}
