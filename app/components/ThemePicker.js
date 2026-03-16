'use client'
import { useState, useEffect } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { THEMES, FONT_PACKS, applyTheme, getThemeFromUser } from '../../lib/themes'
import { showToast } from './Toast'

export default function ThemePicker({ onClose }) {
  const currentUser = useStore(s => s.currentUser)
  const { themeKey: initTheme, fontKey: initFont } = getThemeFromUser(currentUser)
  const [selectedTheme, setSelectedTheme] = useState(initTheme)
  const [selectedFont, setSelectedFont] = useState(initFont)
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(false)

  function previewTheme(tk, fk) {
    applyTheme(tk, fk)
  }

  function resetPreview() {
    applyTheme(initTheme, initFont)
    setSelectedTheme(initTheme)
    setSelectedFont(initFont)
  }

  function selectTheme(tk) {
    setSelectedTheme(tk)
    previewTheme(tk, selectedFont)
  }

  function selectFont(fk) {
    setSelectedFont(fk)
    previewTheme(selectedTheme, fk)
  }

  async function saveTheme() {
    setSaving(true)
    const themeData = JSON.stringify({ themeKey: selectedTheme, fontKey: selectedFont })
    const { error } = await db.from('users').update({ theme: themeData }).eq('id', currentUser.id)
    if (error) { showToast('Erreur', 'var(--red)'); setSaving(false); return }
    actions.setCurrentUser({ ...currentUser, theme: themeData })
    showToast('✅ Thème sauvegardé !')
    setSaving(false)
    onClose()
  }

  const currentTheme = THEMES.find(t => t.key === selectedTheme) || THEMES[0]
  const currentFont = FONT_PACKS.find(f => f.key === selectedFont) || FONT_PACKS[0]

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && (resetPreview(), onClose())}>
      <div className="modal" style={{ maxHeight: '85vh', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>🎨 THÈME</div>
          <button onClick={() => { resetPreview(); onClose() }} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Preview card */}
        <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 20, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--fm)', fontSize: 32, fontWeight: 800, color: 'var(--red)', letterSpacing: 2, textTransform: 'uppercase' }}>LIFT TRACKER</div>
          <div style={{ fontFamily: 'var(--fb)', fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>{currentTheme.name} · {currentFont.name}</div>
          <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
            {['Dos','Pec','Quad'].map(m => (
              <div key={m} style={{ background: 'var(--s3)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'var(--text2)' }}>{m}</div>
            ))}
            <div style={{ background: 'var(--red)', borderRadius: 8, padding: '4px 10px', fontSize: 12, color: 'white', fontWeight: 700 }}>Sélectionné</div>
          </div>
        </div>

        {/* Color section — Standard */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>Couleur d&apos;accent</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {THEMES.filter(t => !t.premium).map(t => (
              <div key={t.key} onClick={() => selectTheme(t.key)} style={{
                border: `2px solid ${selectedTheme === t.key ? t.preview : 'transparent'}`,
                borderRadius: 12, padding: 10, cursor: 'pointer', background: 'var(--s2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                transition: 'all .15s', opacity: selectedTheme === t.key ? 1 : 0.7,
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: t.preview, boxShadow: selectedTheme === t.key ? `0 0 12px ${t.preview}88` : 'none', transition: 'box-shadow .2s' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: selectedTheme === t.key ? t.preview : 'var(--text3)', textAlign: 'center' }}>{t.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Premium themes */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase' }}>Thèmes Premium</div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase' }}>✦ Exclusif</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {THEMES.filter(t => t.premium).map(t => (
              <div key={t.key} onClick={() => selectTheme(t.key)} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 14px', borderRadius: 14, cursor: 'pointer',
                background: selectedTheme === t.key ? `${t.preview}15` : 'var(--s2)',
                border: `1.5px solid ${selectedTheme === t.key ? t.preview : 'var(--border2)'}`,
                transition: 'all .2s',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Gradient pill */}
                <div style={{
                  width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                  background: `linear-gradient(135deg, ${t.preview}, ${t.vars['--accent2'] || t.preview}88)`,
                  boxShadow: selectedTheme === t.key ? `0 0 16px ${t.preview}66` : 'none',
                  transition: 'box-shadow .2s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }}>
                  {t.key === 'obsidian' ? '⬛' : t.key === 'neon' ? '💠' : t.key === 'titanium' ? '🔩' : t.key === 'aurora' ? '🌌' : t.key === 'ember' ? '🔥' : '👻'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: selectedTheme === t.key ? t.preview : 'var(--text)', marginBottom: 2 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                    {t.key === 'obsidian' ? 'Fond ultra-sombre · Glow rouge discret' :
                     t.key === 'neon' ? 'Bleu néon · Fond deep space' :
                     t.key === 'titanium' ? 'Gris acier · Interface épurée' :
                     t.key === 'aurora' ? 'Vert émeraude · Touches indigo' :
                     t.key === 'ember' ? 'Orange chaud · Fond braise' :
                     'Violet · Rose · Dark fantasy'}
                  </div>
                </div>
                {selectedTheme === t.key && (
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: t.preview, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#000', fontWeight: 800 }}>✓</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Font section */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>Police</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FONT_PACKS.map(f => (
              <div key={f.key} onClick={() => selectFont(f.key)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
                background: selectedFont === f.key ? 'rgba(var(--red-rgb), .1)' : 'var(--s2)',
                border: `1px solid ${selectedFont === f.key ? 'var(--red)' : 'var(--border)'}`,
                transition: 'all .15s',
              }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: selectedFont === f.key ? 'var(--red)' : 'var(--text)', lineHeight: 1, marginBottom: 2 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{f.sub}</div>
                </div>
                {selectedFont === f.key && <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'white', fontWeight: 700 }}>✓</div>}
              </div>
            ))}
          </div>
        </div>

        <button className="btn-primary" onClick={saveTheme} disabled={saving}>
          {saving ? '⏳ Sauvegarde...' : '💾 Appliquer ce thème'}
        </button>
        <button className="btn-secondary" onClick={() => { resetPreview(); onClose() }} style={{ marginTop: 10 }}>
          Annuler
        </button>
      </div>
    </div>
  )
}
