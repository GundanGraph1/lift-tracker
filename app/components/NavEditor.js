'use client'
import { useState } from 'react'

export default function NavEditor({ allPages, navOrder, onSave, onClose }) {
  const [favs, setFavs] = useState([...navOrder])

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

  const moveUp = (i) => {
    if (i === 0) return
    setFavs(f => { const n = [...f]; [n[i-1], n[i]] = [n[i], n[i-1]]; return n })
  }

  const moveDown = (i) => {
    if (i === favs.length - 1) return
    setFavs(f => { const n = [...f]; [n[i], n[i+1]] = [n[i+1], n[i]]; return n })
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
          3 onglets toujours visibles · Swipe pour accéder aux autres · Flèches pour réordonner
        </div>

        <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
          Onglets principaux ({favs.length}/3)
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:20}}>
          {favs.map((key, i) => {
            const p = allPages.find(x => x.key === key)
            if (!p) return null
            return (
              <div key={key} style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'10px 12px',
                background:'var(--s3)',
                border:'1.5px solid var(--red)',
                borderRadius:12,
              }}>
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  <button onClick={() => moveUp(i)} disabled={i===0} style={{
                    background:'none', border:'none', cursor: i===0?'default':'pointer',
                    fontSize:12, color: i===0?'var(--border2)':'var(--text2)',
                    padding:'2px 4px', lineHeight:1,
                  }}>▲</button>
                  <button onClick={() => moveDown(i)} disabled={i===favs.length-1} style={{
                    background:'none', border:'none', cursor: i===favs.length-1?'default':'pointer',
                    fontSize:12, color: i===favs.length-1?'var(--border2)':'var(--text2)',
                    padding:'2px 4px', lineHeight:1,
                  }}>▼</button>
                </div>
                <div style={{
                  width:20, height:20, borderRadius:'50%',
                  background:'var(--red)', color:'white',
                  fontSize:11, fontWeight:800, fontFamily:'var(--fb)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  flexShrink:0,
                }}>{i+1}</div>
                <span style={{fontSize:18}}>{p.icon}</span>
                <span style={{fontSize:13,fontWeight:700,color:'var(--text)',fontFamily:'var(--fb)',flex:1}}>{p.label}</span>
                <button onClick={() => toggleFav(key)} style={{
                  background:'var(--s2)', border:'1px solid var(--border)',
                  borderRadius:6, color:'var(--text3)',
                  fontSize:12, cursor: favs.length<=2?'not-allowed':'pointer',
                  padding:'4px 8px', lineHeight:1,
                  opacity: favs.length<=2 ? 0.25 : 1,
                }}>✕</button>
              </div>
            )
          })}
        </div>

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
                  <span style={{fontSize:11,color:'var(--text3)',opacity:0.6}}>+ Mettre en avant</span>
                </button>
              ))}
            </div>
          </>
        )}

        <div style={{marginBottom:20}}>
          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:10}}>
            Aperçu de la barre
          </div>
          <div style={{
            background:'var(--s2)', border:'1px solid var(--border)',
            borderRadius:14, padding:'12px 8px 8px', overflow:'hidden',
          }}>
            <div style={{display:'flex', justifyContent:'space-around'}}>
              {allOrdered.slice(0,3).map((p) => (
                <div key={p.key} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  padding:'4px 8px', flex:1,
                }}>
                  <span style={{fontSize:20}}>{p.icon}</span>
                  <span style={{fontSize:8,fontWeight:700,color:'var(--red)',textTransform:'uppercase',fontFamily:'var(--fb)'}}>{p.label}</span>
                </div>
              ))}
            </div>
            {allOrdered.length > 3 && (
              <div style={{fontSize:10,color:'var(--text3)',textAlign:'center',marginTop:6}}>
                + {allOrdered.length - 3} autres par swipe →
              </div>
            )}
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
