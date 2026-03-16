'use client'
import { useState } from 'react'

export default function NavEditor({ allPages, navOrder, onSave, onClose }) {
  const [favs, setFavs] = useState([...navOrder]) // 3 onglets principaux
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  const extraPages = allPages.filter(p => !favs.includes(p.key))

  const toggleFav = (key) => {
    if (favs.includes(key)) {
      if (favs.length <= 2) return
      setFavs(f => f.filter(k => k !== key))
    } else {
      if (favs.length >= 3) return
      setFavs(f => [...f, key])
    }
  }

  const onDragStart = (i) => setDragIdx(i)
  const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i) }
  const onDrop = (i) => {
    if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return }
    const next = [...favs]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(i, 0, moved)
    setFavs(next)
    setDragIdx(null); setOverIdx(null)
  }

  const allOrdered = [...favs.map(k => allPages.find(p => p.key === k)).filter(Boolean), ...extraPages]

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:300,
      background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:480,
        background:'var(--s1)', borderRadius:'20px 20px 0 0',
        border:'1px solid var(--border2)', borderBottom:'none',
        padding:'16px 16px max(28px,env(safe-area-inset-bottom))',
        maxHeight:'88vh', overflowY:'auto',
      }}>
        <div style={{width:36,height:4,borderRadius:2,background:'var(--border2)',margin:'0 auto 18px'}} />

        <div style={{fontSize:15,fontWeight:800,color:'var(--text)',fontFamily:'var(--fm)',letterSpacing:1,marginBottom:3}}>
          PERSONNALISER LA NAVIGATION
        </div>
        <div style={{fontSize:12,color:'var(--text3)',marginBottom:20}}>
          3 onglets toujours visibles · Swipe pour accéder aux autres · Glisse pour réordonner
        </div>

        {/* Chips draggables */}
        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
          Onglets principaux ({favs.length}/3)
        </div>
        <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
          {favs.map((key, i) => {
            const p = allPages.find(x => x.key === key)
            if (!p) return null
            return (
              <div key={key} draggable
                onDragStart={() => onDragStart(i)}
                onDragOver={e => onDragOver(e, i)}
                onDrop={() => onDrop(i)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 12px',
                  background: overIdx===i && dragIdx!==i ? 'rgba(255,60,60,0.12)' : 'var(--s3)',
                  border:`1.5px solid ${overIdx===i && dragIdx!==i ? 'var(--red)' : 'var(--border2)'}`,
                  borderRadius:10, cursor:'grab',
                  opacity: dragIdx===i ? 0.35 : 1,
                  transition:'all .15s', userSelect:'none',
                }}>
                <span style={{fontSize:9,color:'var(--text3)',fontFamily:'monospace',lineHeight:1}}>⠿</span>
                <span style={{fontSize:16}}>{p.icon}</span>
                <span style={{fontSize:12,fontWeight:700,color:'var(--text2)',fontFamily:'var(--fb)'}}>{p.label}</span>
                <button onClick={() => toggleFav(key)} style={{
                  background:'none', border:'none', color:'var(--text3)',
                  fontSize:13, cursor:'pointer', padding:'0 0 0 2px', lineHeight:1,
                  opacity: favs.length<=2 ? 0.25 : 1,
                }}>✕</button>
              </div>
            )
          })}
        </div>

        {/* Pages secondaires */}
        {extraPages.length > 0 && (
          <>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
              Accessibles par swipe
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
              {extraPages.map(p => (
                <button key={p.key} onClick={() => toggleFav(p.key)}
                  disabled={favs.length>=3}
                  style={{
                    display:'flex', alignItems:'center', gap:12,
                    padding:'10px 14px', background:'var(--s2)',
                    border:'1px dashed var(--border2)', borderRadius:12,
                    cursor: favs.length>=3 ? 'not-allowed' : 'pointer',
                    opacity: favs.length>=3 ? 0.4 : 1,
                    transition:'all .15s', textAlign:'left',
                  }}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <span style={{fontSize:13,fontWeight:600,color:'var(--text3)',fontFamily:'var(--fb)',flex:1}}>{p.label}</span>
                  <span style={{fontSize:11,color:'var(--text3)',opacity:0.6}}>↑ Mettre en avant</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Aperçu barre */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
            Aperçu de la barre
          </div>
          <div style={{
            background:'var(--s2)', border:'1px solid var(--border)',
            borderRadius:14, padding:'12px 8px 8px', overflow:'hidden',
          }}>
            {/* Fenêtre scrollable simulée */}
            <div style={{display:'flex', width:`${allOrdered.length * 100/3}%`, transition:'transform .3s'}}>
              {allOrdered.map((p,i) => (
                <div key={p.key} style={{
                  width:`${100/allOrdered.length}%`, flexShrink:0,
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  padding:'4px 0',
                  opacity: i < 3 ? 1 : 0.35,
                }}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <span style={{fontSize:8,fontWeight:700,color: i<3?'var(--text2)':'var(--text3)',textTransform:'uppercase',fontFamily:'var(--fb)'}}>{p.label}</span>
                </div>
              ))}
            </div>
            {/* Dots */}
            <div style={{display:'flex',justifyContent:'center',gap:4,marginTop:6}}>
              {allOrdered.map((_,i) => (
                <div key={i} style={{
                  width: i<3?5:3, height: i<3?5:3, borderRadius:'50%',
                  background: i<3?'var(--red)':'var(--border2)',
                  opacity: i<3?1:0.4, transition:'all .2s',
                }}/>
              ))}
            </div>
          </div>
          <div style={{fontSize:11,color:'var(--text3)',textAlign:'center',marginTop:6}}>
            ← swipe sur la barre pour voir les autres onglets →
          </div>
        </div>

        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{
            flex:1, padding:14, borderRadius:12,
            background:'var(--s3)', border:'1px solid var(--border)',
            color:'var(--text2)', fontSize:14, fontFamily:'var(--fb)', fontWeight:600, cursor:'pointer',
          }}>Annuler</button>
          <button onClick={() => onSave(favs)} style={{
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
