'use client'
import { useState } from 'react'

export default function NavEditor({ allPages, navOrder, onSave, onClose }) {
  const [selected, setSelected] = useState([...navOrder])
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const toggle = (key) => {
    if (selected.includes(key)) {
      if (selected.length <= 2) return // minimum 2
      setSelected(s => s.filter(k => k !== key))
    } else {
      if (selected.length >= 4) return // maximum 4
      setSelected(s => [...s, key])
    }
  }

  // Drag to reorder selected items
  const onDragStart = (i) => setDragIdx(i)
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const onDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return }
    const next = [...selected]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    setSelected(next)
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:300,
      background:'rgba(0,0,0,0.7)', backdropFilter:'blur(4px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:480,
        background:'var(--s1)', borderRadius:'20px 20px 0 0',
        border:'1px solid var(--border2)', borderBottom:'none',
        padding:'20px 16px 32px',
      }}>
        {/* Handle */}
        <div style={{width:36,height:4,borderRadius:2,background:'var(--border2)',margin:'0 auto 20px'}} />

        <div style={{fontSize:15,fontWeight:800,color:'var(--text)',fontFamily:'var(--fm)',letterSpacing:1,marginBottom:4}}>
          PERSONNALISER LA NAVIGATION
        </div>
        <div style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>
          Choisis 2 à 4 onglets · Glisse pour réordonner
        </div>

        {/* Section : onglets actifs (draggable) */}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
          Onglets actifs ({selected.length}/4)
        </div>
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {selected.map((key, i) => {
            const p = allPages.find(x => x.key === key)
            if (!p) return null
            return (
              <div
                key={key}
                draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOver(e, i)}
                onDrop={() => onDrop(i)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 12px',
                  background: overIdx === i && dragIdx !== i ? 'rgba(255,60,60,0.12)' : 'var(--s3)',
                  border:`1.5px solid ${overIdx === i && dragIdx !== i ? 'var(--red)' : 'var(--border2)'}`,
                  borderRadius:10,
                  cursor:'grab',
                  opacity: dragIdx === i ? 0.4 : 1,
                  transition:'all .15s',
                  userSelect:'none',
                }}>
                <span style={{fontSize:8,color:'var(--text3)',lineHeight:1,fontFamily:'monospace'}}>⠿</span>
                <span style={{fontSize:16}}>{p.icon}</span>
                <span style={{fontSize:12,fontWeight:700,color:'var(--text2)',fontFamily:'var(--fb)'}}>{p.label}</span>
                <button
                  onClick={() => toggle(key)}
                  style={{
                    background:'none', border:'none', color:'var(--text3)',
                    fontSize:14, cursor:'pointer', padding:'0 0 0 2px', lineHeight:1,
                    opacity: selected.length <= 2 ? 0.3 : 1,
                  }}>✕</button>
              </div>
            )
          })}
        </div>

        {/* Section : pages disponibles */}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
          Ajouter un onglet
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:24}}>
          {allPages.filter(p => !selected.includes(p.key)).map(p => (
            <button
              key={p.key}
              onClick={() => toggle(p.key)}
              disabled={selected.length >= 4}
              style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 14px',
                background:'var(--s2)',
                border:'1px solid var(--border)',
                borderRadius:12,
                cursor: selected.length >= 4 ? 'not-allowed' : 'pointer',
                opacity: selected.length >= 4 ? 0.4 : 1,
                transition:'all .15s',
                textAlign:'left',
              }}>
              <span style={{fontSize:20}}>{p.icon}</span>
              <span style={{fontSize:13,fontWeight:600,color:'var(--text2)',fontFamily:'var(--fb)',flex:1}}>{p.label}</span>
              <span style={{fontSize:18,color:'var(--red)',fontWeight:300}}>+</span>
            </button>
          ))}
          {allPages.filter(p => !selected.includes(p.key)).length === 0 && (
            <div style={{fontSize:12,color:'var(--text3)',padding:'8px 0'}}>Tous les onglets sont sélectionnés</div>
          )}
        </div>

        {/* Aperçu */}
        <div style={{
          background:'var(--s2)', border:'1px solid var(--border)', borderRadius:14,
          padding:'10px 16px', marginBottom:20,
          display:'flex', gap:4,
        }}>
          {selected.map(key => {
            const p = allPages.find(x => x.key === key)
            if (!p) return null
            return (
              <div key={key} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <span style={{fontSize:20}}>{p.icon}</span>
                <span style={{fontSize:8,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',fontFamily:'var(--fb)'}}>{p.label}</span>
              </div>
            )
          })}
          <div style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
            <span style={{fontSize:20}}>⋯</span>
            <span style={{fontSize:8,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',fontFamily:'var(--fb)'}}>Plus</span>
          </div>
        </div>

        {/* Boutons */}
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{
            flex:1, padding:14, borderRadius:12,
            background:'var(--s3)', border:'1px solid var(--border)',
            color:'var(--text2)', fontSize:14, fontFamily:'var(--fb)', fontWeight:600, cursor:'pointer',
          }}>Annuler</button>
          <button onClick={() => onSave(selected)} style={{
            flex:2, padding:14, borderRadius:12,
            background:'var(--red)', border:'none',
            color:'white', fontSize:14, fontFamily:'var(--fm)', fontWeight:800,
            letterSpacing:1, cursor:'pointer',
          }}>✓ ENREGISTRER</button>
        </div>
      </div>
    </div>
  )
}
