'use client'
const isBW = (name) => (name||'').toLowerCase().includes('pompe') && !(name||'').toLowerCase().includes('lest')

import { useState } from 'react'
import { db } from '../../../lib/supabase'
import { useStore } from '../../../lib/store'
import ShareStory from '../ShareStory'
import { MUSCLE_LABELS, MUSCLE_COLORS, normalize } from '../../../lib/constants'
import { showToast } from '../Toast'

export default function HistoriquePage({ onChanged }) {
  const sessions = useStore(s => s.sessions)
  const currentUser = useStore(s => s.currentUser)
  const [filterMuscle, setFilterMuscle] = useState('all')
  const [editSession, setEditSession] = useState(null)
  const [shareSession, setShareSession] = useState(null)
  const [saving, setSaving] = useState(false)

  const filtered = filterMuscle==='all' ? sessions : sessions.filter(s=>(s.muscle||'').split('+').includes(filterMuscle))

  async function deleteSession(id) {
    if (!confirm('Supprimer cette séance ?')) return
    await db.from('sessions').delete().eq('id', id)
    showToast('🗑 Séance supprimée')
    onChanged()
  }

  async function openEdit(s) {
    // Charger la session cardio liée si elle existe
    const { data: cardioData } = await db.from('cardio_sessions').select('*')
      .eq('user_id', s.user_id).eq('session_id', String(s.id)).maybeSingle()
    setEditSession({
      ...s,
      exercises: (s.exercises||[]).map(e=>({...e,sets:e.sets.map(st=>({...st}))})),
      cardio: cardioData || null,
      showCardio: !!cardioData,
    })
  }

  function toggleEditUnilateral(ei) {
    setEditSession(prev => {
      const exos = [...prev.exercises]
      const ex = {...exos[ei]}
      ex.unilateral = !ex.unilateral
      if (ex.unilateral) {
        ex.sets = ex.sets.map(st => ({...st, wL:st.w||'', wR:st.w||'', rL:st.r||'', rR:st.r||''}))
      }
      exos[ei] = ex
      return {...prev, exercises: exos}
    })
  }

  function updateEditSet(ei, si, field, val) {
    setEditSession(prev => {
      const exos = [...prev.exercises]
      exos[ei] = {...exos[ei], sets: exos[ei].sets.map((st,i)=>i===si?{...st,[field]:val}:st)}
      return {...prev, exercises: exos}
    })
  }

  async function saveEdit() {
    if (!editSession) return
    setSaving(true)
    const totalVolume = editSession.exercises.reduce((a,e)=>a+e.sets.reduce((b,st)=>{
      if (e.unilateral) return b+(parseFloat(st.rL)||0)*(parseFloat(st.wL)||0)+(parseFloat(st.rR)||0)*(parseFloat(st.wR)||0)
      return b+(parseFloat(st.r)||0)*(parseFloat(st.w)||0)
    },0),0)
    const { error } = await db.from('sessions').update({
      session_date: editSession.session_date,
      session_time: editSession.session_time||'',
      muscle: editSession.muscle,
      notes: editSession.notes||'',
      exercises: JSON.stringify(editSession.exercises),
      total_volume: totalVolume
    }).eq('id', editSession.id)
    if (error) { setSaving(false); showToast('Erreur', 'var(--red)'); return }

    // Sauvegarder le cardio
    const c = editSession.cardio
    if (editSession.showCardio && c?.duration_min) {
      const cardioPayload = {
        user_id: editSession.user_id,
        session_date: editSession.session_date,
        session_id: String(editSession.id),
        type: c.type||'autre',
        duration_min: parseInt(c.duration_min)||0,
        distance_km: c.distance_km ? parseFloat(c.distance_km) : null,
        avg_speed_kmh: c.avg_speed_kmh ? parseFloat(c.avg_speed_kmh) : null,
        avg_hr: c.avg_hr ? parseInt(c.avg_hr) : null,
        calories_burned: c.calories_burned ? parseInt(c.calories_burned) : null,
        incline_pct: c.incline_pct ? parseFloat(c.incline_pct) : null,
        resistance: c.resistance ? parseInt(c.resistance) : null,
        notes: c.notes||null,
      }
      if (c.id) {
        await db.from('cardio_sessions').update(cardioPayload).eq('id', c.id)
      } else {
        await db.from('cardio_sessions').insert([cardioPayload])
      }
    } else if (!editSession.showCardio && editSession.cardio?.id) {
      // Supprimer le cardio si désactivé
      await db.from('cardio_sessions').delete().eq('id', editSession.cardio.id)
    }

    setSaving(false)
    showToast('✅ Séance modifiée !')
    setEditSession(null)
    onChanged()
  }

  function getArrow(s, idx) {
    // Si la séance vient d'un preset → comparer le volume TOTAL contre la séance précédente du MÊME preset
    if (s.preset_id) {
      const samePreset = sessions
        .filter(ss => ss.preset_id === s.preset_id && ss.id !== s.id && ss.session_date <= s.session_date)
        .sort((a,b) => b.session_date.localeCompare(a.session_date))
      if (!samePreset.length) return null
      const p = samePreset[0]
      const volS = s.total_volume || 0
      const volP = p.total_volume || 0
      if (!volP) return null
      const label = s.preset_name ? `vs ${s.preset_name}` : 'vs même preset'
      if (volS > volP) return { dir:'up',   pct: Math.round((volS-volP)/volP*100), label }
      if (volS < volP) return { dir:'down', pct: Math.round((volP-volS)/volP*100), label }
      return { dir:'eq', label }
    }

    // Sinon : comparer avec la séance précédente du même groupe musculaire (hors preset)
    const prev = sessions.filter(ss=>ss.muscle===s.muscle&&ss.id!==s.id&&!ss.preset_id).slice(idx)
    if (!prev.length) return null
    const p = prev[0]
    if (s.total_volume > p.total_volume) return { dir:'up', pct: Math.round((s.total_volume-p.total_volume)/p.total_volume*100) }
    if (s.total_volume < p.total_volume) return { dir:'down', pct: Math.round((p.total_volume-s.total_volume)/p.total_volume*100) }
    return { dir:'eq' }
  }

  const muscles = ['all', ...Object.keys(MUSCLE_LABELS)]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="page-title">HISTORIQUE</div>
        <div className="page-sub">{sessions.length} séances enregistrées</div>
        <hr className="page-divider" />
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {muscles.map(m => (
          <button key={m} onClick={()=>setFilterMuscle(m)} style={{background:filterMuscle===m?'var(--red)':'var(--s2)',border:`1px solid ${filterMuscle===m?'var(--red)':'var(--border)'}`,borderRadius:20,padding:'5px 12px',color:filterMuscle===m?'white':'var(--text2)',cursor:'pointer',fontSize:11,fontFamily:'var(--fb)',fontWeight:600}}>{m==='all'?'Tout':MUSCLE_LABELS[m]}</button>
        ))}
      </div>

      {filtered.length === 0 && <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>Aucune séance</div>}

      {filtered.map((s,idx) => {
        const arrow = getArrow(s, idx)
        const color = MUSCLE_COLORS[s.muscle]||'var(--red)'
        return (
          <div key={s.id} style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:14,marginBottom:10,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:14}}>{new Date(s.session_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'2-digit',month:'2-digit',year:'2-digit'})}</span>
                  <span className={`hist-badge m-${(s.muscle||"").split("+")[0]}`}>{(s.muscle||"").split("+").map(m=>MUSCLE_LABELS[m]||m).join(" + ")}</span>
                  {s.session_time && <span style={{fontSize:11,color:'var(--text3)'}}>⏰ {s.session_time}</span>}
                </div>
                {s.notes && <div style={{fontSize:11,color:'var(--text3)',marginTop:3,fontStyle:'italic'}}>"{s.notes}"</div>}
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontFamily:'var(--fm)',fontSize:18,fontWeight:700,color:'var(--green)'}}>{(s.total_volume||0).toLocaleString('fr')} kg</div>
                {arrow && (
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:12,fontWeight:700,color:arrow.dir==='up'?'var(--green)':arrow.dir==='down'?'var(--red)':'var(--text3)'}}>
                      {arrow.dir==='up'?'↑':arrow.dir==='down'?'↓':'='}{arrow.pct?` ${arrow.pct}%`:''}
                    </div>
                    {arrow.label && <div style={{fontSize:9,color:'var(--text3)',marginTop:1}}>{arrow.label}</div>}
                  </div>
                )}
              </div>
            </div>
            <div style={{padding:'10px 14px'}}>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                {(s.exercises||[]).map((e,i) => {
                  const maxW = e.sets.length?Math.max(...e.sets.map(st=>parseFloat(st.w)||0)):0
                  return <div key={i} style={{background:'var(--s3)',borderRadius:8,padding:'4px 10px',fontSize:12,color:'var(--text2)'}}>{e.name} <span style={{color:'var(--text)',fontWeight:600}}>{maxW}kg</span></div>
                })}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button onClick={()=>setShareSession(s)} style={{background:'var(--s3)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 12px',color:'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600}}>📸 Story</button>
                <button onClick={()=>openEdit(s)} style={{background:'rgba(59,130,246,.15)',border:'1px solid rgba(59,130,246,.3)',borderRadius:8,padding:'5px 12px',color:'#60a5fa',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600}}>✏️ Modifier</button>
                <button onClick={()=>deleteSession(s.id)} style={{background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'5px 12px',color:'var(--red)',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600}}>🗑 Supprimer</button>
              </div>
            </div>
          </div>
        )
      })}

      {/* Edit modal */}
      {editSession && (
        <div className="modal-overlay open" onClick={e=>e.target===e.currentTarget&&setEditSession(null)}>
          <div className="modal" style={{maxHeight:'85vh',overflowY:'auto'}}>
            <div className="modal-title">MODIFIER LA SÉANCE</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div><label className="field-label">Date</label><input type="date" value={editSession.session_date} onChange={e=>setEditSession(p=>({...p,session_date:e.target.value}))}/></div>
                <div><label className="field-label">Heure</label><input type="time" value={editSession.session_time||''} onChange={e=>setEditSession(p=>({...p,session_time:e.target.value}))}/></div>
              </div>
              <div>
                <label className="field-label">Muscle</label>
                <select value={(editSession.muscle||'').split('+')[0]} onChange={e=>setEditSession(p=>({...p,muscle:e.target.value}))}>
                  {Object.keys(MUSCLE_LABELS).map(m=><option key={m} value={m}>{MUSCLE_LABELS[m]}</option>)}
                </select>
              </div>
              <div><label className="field-label">Notes</label><textarea value={editSession.notes||''} onChange={e=>setEditSession(p=>({...p,notes:e.target.value}))} rows={2} style={{resize:'none'}}/></div>
              {editSession.exercises.map((ex,ei)=>(
                <div key={ei} style={{background:'var(--s2)',borderRadius:12,padding:12,border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                    <div style={{fontSize:13,fontWeight:600}}>{ex.name}</div>
                  </div>
                  {/* Ligne mode unilatéral */}
                  <div onClick={()=>toggleEditUnilateral(ei)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',marginBottom:8,cursor:'pointer',borderBottom:'1px solid var(--border)'}}>
                    <div>
                      <span style={{fontSize:12,fontWeight:700,color:ex.unilateral?'var(--orange)':'var(--text2)',fontFamily:'var(--fb)'}}>Mode unilatéral</span>
                      <span style={{fontSize:10,color:'var(--text3)',marginLeft:6}}>Poids et reps par côté (G / D)</span>
                    </div>
                    <div style={{width:36,height:20,borderRadius:10,background:ex.unilateral?'var(--orange)':'var(--s3)',border:`1px solid ${ex.unilateral?'var(--orange)':'var(--border)'}`,position:'relative',transition:'all .2s',flexShrink:0}}>
                      <div style={{position:'absolute',top:3,left:ex.unilateral?17:3,width:12,height:12,borderRadius:'50%',background:'white',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                    </div>
                  </div>

                  {ex.unilateral ? (
                    <>
                      <div style={{display:'grid',gridTemplateColumns:'22px 1fr 1fr 1fr 1fr',gap:4,marginBottom:4}}>
                        <span/><span style={{fontSize:9,color:'var(--orange)',textAlign:'center',fontWeight:700}}>Reps G</span><span style={{fontSize:9,color:'var(--orange)',textAlign:'center',fontWeight:700}}>kg G</span><span style={{fontSize:9,color:'var(--blue)',textAlign:'center',fontWeight:700}}>Reps D</span><span style={{fontSize:9,color:'var(--blue)',textAlign:'center',fontWeight:700}}>kg D</span>
                      </div>
                      {ex.sets.map((st,si)=>(
                        <div key={si} style={{marginBottom:6}}>
                          <div style={{display:'grid',gridTemplateColumns:'22px 1fr 1fr 1fr 1fr',gap:4,alignItems:'center'}}>
                            <span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>{si+1}</span>
                            <input type="number" value={st.rL||''} onChange={e=>updateEditSet(ei,si,'rL',e.target.value)} placeholder="0" style={{padding:'5px 2px',fontSize:12,textAlign:'center',borderColor:'var(--orange)'}}/>
                            <input type="number" value={st.wL||''} onChange={e=>updateEditSet(ei,si,'wL',e.target.value)} placeholder="0" step="0.5" style={{padding:'5px 2px',fontSize:12,textAlign:'center',borderColor:'var(--orange)'}}/>
                            <input type="number" value={st.rR||''} onChange={e=>updateEditSet(ei,si,'rR',e.target.value)} placeholder="0" style={{padding:'5px 2px',fontSize:12,textAlign:'center',borderColor:'var(--blue)'}}/>
                            <input type="number" value={st.wR||''} onChange={e=>updateEditSet(ei,si,'wR',e.target.value)} placeholder="0" step="0.5" style={{padding:'5px 2px',fontSize:12,textAlign:'center',borderColor:'var(--blue)'}}/>
                          </div>
                          {(parseFloat(st.rL)||0)!==(parseFloat(st.rR)||0) && (st.rL||st.rR) && (
                            <div style={{fontSize:10,color:'var(--orange)',textAlign:'center',marginTop:2}}>
                              ⚠️ {(parseFloat(st.rL)||0)>(parseFloat(st.rR)||0)?`G +${(parseFloat(st.rL)||0)-(parseFloat(st.rR)||0)} rep`:`D +${(parseFloat(st.rR)||0)-(parseFloat(st.rL)||0)} rep`}
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  ) : (
                    ex.sets.map((st,si)=>(
                      <div key={si} style={{display:'grid',gridTemplateColumns:'30px 1fr 1fr',gap:6,marginBottom:4,alignItems:'center'}}>
                        <span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>{si+1}</span>
                        <input type="number" value={st.r} onChange={e=>updateEditSet(ei,si,'r',e.target.value)} placeholder="Reps" style={{padding:'6px',fontSize:13}}/>
                        <input type="number" value={st.w} onChange={e=>updateEditSet(ei,si,'w',e.target.value)} placeholder="kg" step="0.5" style={{padding:'6px',fontSize:13}}/>
                      </div>
                    ))
                  )}
                </div>
              ))}
              {/* Section cardio */}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:14,marginTop:4}}>
                <div onClick={()=>setEditSession(p=>({...p,showCardio:!p.showCardio}))} style={{display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer',padding:'8px 0',marginBottom:editSession.showCardio?10:0}}>
                  <span style={{fontSize:13,fontWeight:700,color:editSession.showCardio?'var(--orange)':'var(--text2)',fontFamily:'var(--fb)'}}>🏃 Cardio associé</span>
                  <div style={{width:36,height:20,borderRadius:10,background:editSession.showCardio?'var(--orange)':'var(--s3)',border:`1px solid ${editSession.showCardio?'var(--orange)':'var(--border)'}`,position:'relative',transition:'all .2s',flexShrink:0}}>
                    <div style={{position:'absolute',top:3,left:editSession.showCardio?17:3,width:12,height:12,borderRadius:'50%',background:'white',transition:'all .2s'}}/>
                  </div>
                </div>
                {editSession.showCardio && (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div>
                      <label className="field-label" style={{fontSize:10}}>Type d&apos;activité</label>
                      <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                        {[{v:'tapis',l:'🏃 Tapis'},{v:'velo',l:'🚴 Vélo'},{v:'rameur',l:'🚣 Rameur'},{v:'elliptique',l:'〰️ Elliptique'},{v:'corde',l:'🪢 Corde'},{v:'autre',l:'⚡ Autre'}].map(t=>(
                          <button key={t.v} onClick={()=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),type:t.v}}))} style={{padding:'5px 10px',fontSize:11,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:8,border:`1px solid ${(editSession.cardio?.type||'tapis')===t.v?'var(--orange)':'var(--border)'}`,background:(editSession.cardio?.type||'tapis')===t.v?'rgba(249,115,22,0.15)':'var(--s3)',color:(editSession.cardio?.type||'tapis')===t.v?'var(--orange)':'var(--text2)',transition:'all .15s'}}>{t.l}</button>
                        ))}
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                      <div><label className="field-label" style={{fontSize:10}}>Durée (min)</label><input type="number" value={editSession.cardio?.duration_min||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),duration_min:e.target.value}}))} placeholder="30" min="0" inputMode="numeric"/></div>
                      <div><label className="field-label" style={{fontSize:10}}>Distance (km)</label><input type="number" value={editSession.cardio?.distance_km||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),distance_km:e.target.value}}))} placeholder="0" min="0" step="0.1" inputMode="decimal"/></div>
                      <div><label className="field-label" style={{fontSize:10}}>Vitesse moy. (km/h)</label><input type="number" value={editSession.cardio?.avg_speed_kmh||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),avg_speed_kmh:e.target.value}}))} placeholder="0" min="0" step="0.5" inputMode="decimal"/></div>
                      <div><label className="field-label" style={{fontSize:10}}>FC moy. (bpm)</label><input type="number" value={editSession.cardio?.avg_hr||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),avg_hr:e.target.value}}))} placeholder="0" min="0" inputMode="numeric"/></div>
                      {(editSession.cardio?.type||'tapis')==='tapis' && <div><label className="field-label" style={{fontSize:10}}>Inclinaison (%)</label><input type="number" value={editSession.cardio?.incline_pct||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),incline_pct:e.target.value}}))} placeholder="0" min="0" step="0.5" inputMode="decimal"/></div>}
                      <div><label className="field-label" style={{fontSize:10}}>Calories (kcal)</label><input type="number" value={editSession.cardio?.calories_burned||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),calories_burned:e.target.value}}))} placeholder="Auto" min="0" inputMode="numeric"/></div>
                    </div>
                    <div><label className="field-label" style={{fontSize:10}}>Notes</label><input type="text" value={editSession.cardio?.notes||''} onChange={e=>setEditSession(p=>({...p,cardio:{...(p.cardio||{}),notes:e.target.value}}))} placeholder="Optionnel..."/></div>
                  </div>
                )}
              </div>

              <button className="btn-primary" onClick={saveEdit} disabled={saving}>{saving?'⏳ Sauvegarde...':'💾 Sauvegarder'}</button>
            </div>
            <button className="btn-secondary" onClick={()=>setEditSession(null)} style={{marginTop:10}}>Annuler</button>
          </div>
        </div>
      )}
      {shareSession && <ShareStory session={shareSession} user={currentUser} onClose={()=>setShareSession(null)} />}
    </div>
  )
}
