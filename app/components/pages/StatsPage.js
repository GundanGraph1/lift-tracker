'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/supabase'
import { useStore, actions } from '../../../lib/store'
import { MUSCLE_COLORS, BADGES, normalize } from '../../../lib/constants'
import { showToast } from '../Toast'

export default function StatsPage() {
  const sessions = useStore(s => s.sessions)
  const userPRs = useStore(s => s.userPRs)
  const userBadges = useStore(s => s.userBadges)
  const currentUser = useStore(s => s.currentUser)
  const [showPRModal, setShowPRModal] = useState(false)
  const [prExercise, setPrExercise] = useState('')
  const [prWeight, setPrWeight] = useState('')
  const [prDate, setPrDate] = useState(new Date().toISOString().split('T')[0])
  const [savingPR, setSavingPR] = useState(false)
  const [prCustom, setPrCustom] = useState(false)
  const [prCustomSearch, setPrCustomSearch] = useState('')
  const [prCustomResults, setPrCustomResults] = useState([])
  const [progEx, setProgEx] = useState('')
  const [progSearch, setProgSearch] = useState('')
  const [progResults, setProgResults] = useState([])
  const [progMode, setProgMode] = useState('exercise') // 'exercise' | 'muscle'
  const [progMuscle, setProgMuscle] = useState('')

  useEffect(() => { checkBadges() }, [sessions, userPRs])

  async function checkBadges() {
    if (!currentUser || !sessions.length) return
    for (const badge of Object.values(BADGES)) {
      const already = (userBadges||[]).find(b=>b.badge_key===badge.key)
      if (already) continue
      const unlocked = badge.check(sessions, userPRs||[])
      if (unlocked) {
        await db.from('badges').insert([{user_id:currentUser.id,badge_key:badge.key,unlocked_at:new Date().toISOString().split('T')[0]}])
        actions.setUserBadges([...(userBadges||[]),{badge_key:badge.key}])
        showToast(`🏅 Badge débloqué : ${badge.name} ${badge.icon}`, badge.color)
      }
    }
  }

  async function savePR() {
    if (!prExercise) { showToast('Choisis un exercice !', 'var(--orange)'); return }
    if (!prWeight) { showToast('Entre un poids !', 'var(--orange)'); return }
    setSavingPR(true)
    const existing = (userPRs||[]).find(p=>normalize(p.exercise)===normalize(prExercise))
    if (existing) {
      await db.from('prs').update({weight:parseFloat(prWeight),reps:1,date:prDate,is_manual:true}).eq('id',existing.id)
    } else {
      await db.from('prs').insert([{user_id:currentUser.id,exercise:prExercise,weight:parseFloat(prWeight),reps:1,date:prDate,is_manual:true}])
    }
    const { data } = await db.from('prs').select('*').eq('user_id',currentUser.id)
    actions.setUserPRs(data||[])
    setSavingPR(false)
    setShowPRModal(false); setPrExercise(''); setPrWeight(''); setPrDate(new Date().toISOString().split('T')[0])
    showToast('✅ PR enregistré !')
    checkBadges()
  }

  async function deletePR(id) {
    await db.from('prs').delete().eq('id',id)
    actions.setUserPRs((userPRs||[]).filter(p=>p.id!==id))
  }

  // Stats
  const totalVol = sessions.reduce((a,s)=>a+(s.total_volume||0),0)
  const avgVol = sessions.length ? totalVol/sessions.length : 0
  const maxVol = sessions.length ? Math.max(...sessions.map(s=>s.total_volume||0)) : 0
  const last10 = [...sessions].slice(0,10).reverse()
  const maxBar = Math.max(...last10.map(s=>s.total_volume||0),1)

  const priority = ['Développé Couché (Bench Press)','Bench Press','Squat','Deadlift','Soulevé de terre (Deadlift)']
  const sortedPRs = [...(userPRs||[])].sort((a,b)=>{
    const ai=priority.findIndex(p=>normalize(p)===normalize(a.exercise))
    const bi=priority.findIndex(p=>normalize(p)===normalize(b.exercise))
    if(ai>=0&&bi<0) return -1; if(bi>=0&&ai<0) return 1; if(ai>=0&&bi>=0) return ai-bi; return 0
  })

  function filterProgSearch(q) {
    setProgSearch(q)
    setProgEx(q) // update progEx immediately so typing works without clicking
    if (!q.trim()) { setProgResults([]); setProgEx(''); return }
    const nq = normalize(q)
    const names = new Set()
    sessions.forEach(s=>(s.exercises||[]).forEach(e=>names.add(e.name)))
    setProgResults([...names].filter(n=>normalize(n).includes(nq)).slice(0,6))
  }

  function getMuscleProgData(muscle) {
    const pts = []
    const sorted = [...sessions].sort((a,b)=>a.session_date.localeCompare(b.session_date))
    for (const s of sorted) {
      if (!(s.muscle||'').split('+').includes(muscle)) continue
      const vol = (s.exercises||[]).reduce((a,ex)=>a+ex.sets.reduce((b,st)=>b+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0),0)
      if (vol > 0) pts.push({ date: s.session_date, w: vol })
    }
    return pts
  }

  function getProgData(name) {
    const pts = []
    for (const s of [...sessions].reverse()) {
      const ex = (s.exercises||[]).find(e=>normalize(e.name)===normalize(name))
      if (ex && ex.sets.length) {
        const maxW = Math.max(...ex.sets.map(st=>parseFloat(st.w)||0))
        pts.push({ date: s.session_date, w: maxW })
      }
    }
    return pts
  }

  const progData = progEx ? getProgData(progEx) : []
  const maxW = progData.length ? Math.max(...progData.map(p=>p.w)) : 1

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="page-title">STATS</div>
        <div className="page-sub">Tes performances</div>
        <hr className="page-divider" />
      </div>

      {/* KPIs */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        {[
          {label:'Séances',val:sessions.length,color:'var(--red)'},
          {label:'Volume total',val:`${(totalVol/1000).toFixed(1)}t`,color:'var(--green)'},
          {label:'Volume moyen',val:`${Math.round(avgVol).toLocaleString('fr')} kg`,color:'var(--blue)'},
          {label:'Record séance',val:`${maxVol.toLocaleString('fr')} kg`,color:'var(--gold)'},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:14,padding:'14px 16px'}}>
            <div style={{fontSize:11,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{k.label}</div>
            <div style={{fontFamily:'var(--fm)',fontSize:24,fontWeight:700,color:k.color}}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Volume chart */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',letterSpacing:1,textTransform:'uppercase',marginBottom:16}}>📊 10 dernières séances</div>
        {last10.length===0 ? <div style={{textAlign:'center',color:'var(--text3)',fontSize:13}}>Aucune donnée</div> : (
          <div style={{display:'flex',alignItems:'flex-end',gap:6,height:80}}>
            {last10.map((s,i)=>{
              const h=Math.max(4,((s.total_volume||0)/maxBar)*80)
              const color=MUSCLE_COLORS[s.muscle]||'var(--red)'
              return <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
                <div style={{width:'100%',height:h,background:color,borderRadius:4,opacity:0.8}}/>
                <div style={{fontSize:9,color:'var(--text3)',textAlign:'center'}}>{new Date(s.session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}</div>
              </div>
            })}
          </div>
        )}
      </div>

      {/* PRs */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',letterSpacing:1,textTransform:'uppercase'}}>🏆 Mes PRs</div>
          <button onClick={()=>setShowPRModal(true)} style={{background:'var(--red)',border:'none',borderRadius:8,padding:'5px 12px',color:'white',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer'}}>+ Ajouter</button>
        </div>
        {sortedPRs.length===0 && <div style={{fontSize:13,color:'var(--text3)'}}>Aucun PR enregistré</div>}
        {sortedPRs.map(p=>{
          const isPriority=priority.some(x=>normalize(x)===normalize(p.exercise))
          const dateStr=p.date?new Date(p.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}):''
          return (
            <div key={p.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
              <div>
                <div style={{fontSize:14,fontWeight:600}}>{isPriority&&'⭐ '}{p.exercise}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{dateStr && `📅 ${dateStr}`}{p.is_manual?' · manuel':''}</div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{textAlign:'right'}}>
                  <span style={{fontFamily:'var(--fm)',fontSize:22,fontWeight:700,color:'var(--gold)'}}>{p.weight}</span>
                  <span style={{fontSize:13,color:'var(--text2)'}}> kg</span>
                  <div style={{fontSize:10,color:'var(--text3)'}}>{p.reps} rep</div>
                </div>
                {p.is_manual&&<button onClick={()=>deletePR(p.id)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:16,cursor:'pointer'}}>×</button>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Badges */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',letterSpacing:1,textTransform:'uppercase'}}>🏅 Mes badges</div>
          <button onClick={checkBadges} style={{background:'var(--s3)',border:'1px solid var(--border)',borderRadius:8,padding:'4px 10px',color:'var(--text2)',fontSize:11,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer'}}>🔄 Vérifier</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
          {Object.values(BADGES).map(b=>{
            const unlocked=(userBadges||[]).find(ub=>ub.badge_key===b.key)
            return (
              <div key={b.key} style={{background:unlocked?'var(--s2)':'var(--s1)',border:`1px solid ${unlocked?b.color+'88':'var(--border)'}`,borderRadius:14,padding:12,textAlign:'center',opacity:unlocked?1:0.4,transition:'all .2s'}}>
                <div style={{fontSize:28,marginBottom:6,filter:unlocked?'none':'grayscale(1)'}}>{b.icon}</div>
                <div style={{fontSize:11,fontWeight:700,color:unlocked?b.color:'var(--text2)'}}>{b.name}</div>
                <div style={{fontSize:9,color:'var(--text3)',marginTop:2}}>{b.desc}</div>
                <div style={{fontSize:9,marginTop:4,letterSpacing:1,color:unlocked?b.color:'var(--text3)'}}>{unlocked?'✓ DÉBLOQUÉ':'Verrouillé'}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Progression chart */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>📈 Progression par exercice</div>
        <div className="ex-search-wrap" style={{marginBottom:8}}>
          <span>🔍</span>
          <input className="ex-search-input" value={progSearch} onChange={e=>filterProgSearch(e.target.value)} placeholder="Cherche un exercice..." />
        </div>
        {progResults.length>0&&(
          <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:8,overflow:'hidden'}}>
            {progResults.map(n=><div key={n} className="ex-result-item" onClick={()=>{setProgEx(n);setProgSearch(n);setProgResults([])}}>{n}</div>)}
          </div>
        )}
        {progData.length>1 && (
          <div style={{position:'relative',height:120,marginTop:8}}>
            <svg width="100%" height="100%" viewBox={`0 0 ${progData.length*50} 100`} preserveAspectRatio="none">
              <polyline
                points={progData.map((p,i)=>`${i*50+25},${100-((p.w/maxW)*80+10)}`).join(' ')}
                fill="none" stroke="var(--red)" strokeWidth="2"
              />
              {progData.map((p,i)=>(
                <circle key={i} cx={i*50+25} cy={100-((p.w/maxW)*80+10)} r="4" fill={p.w===maxW?'var(--gold)':'var(--red)'}/>
              ))}
            </svg>
          </div>
        )}
        {progData.length===1&&<div style={{fontSize:13,color:'var(--text3)',textAlign:'center',padding:20}}>Une seule séance enregistrée</div>}
        {progEx&&progData.length===0&&<div style={{fontSize:13,color:'var(--text3)',textAlign:'center',padding:20}}>Aucune donnée pour cet exercice</div>}
      </div>

      {/* PR Modal */}
      {showPRModal && (
        <div className="modal-overlay open" onClick={e=>e.target===e.currentTarget&&setShowPRModal(false)}>
          <div className="modal">
            <div className="modal-title">🏆 AJOUTER UN PR</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label className="field-label">Exercice</label>
                {/* 3 natifs en priorité */}
                <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:8}}>
                  {['Développé Couché (Bench Press)','Squat','Soulevé de terre (Deadlift)'].map(ex=>(
                    <button key={ex} onClick={()=>{setPrExercise(ex);setPrCustom(false);setPrCustomSearch('')}}
                      style={{background:prExercise===ex?'rgba(255,60,60,.2)':'var(--s3)',border:`1px solid ${prExercise===ex?'var(--red)':'var(--border)'}`,borderRadius:10,padding:'8px 14px',color:prExercise===ex?'var(--red)':'var(--text)',fontSize:13,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600,textAlign:'left',transition:'all .15s'}}>
                      {ex==='Développé Couché (Bench Press)'?'🏋️ Bench Press':ex==='Squat'?'🦵 Squat':'⛓️ Deadlift'}
                    </button>
                  ))}
                </div>
                {/* Autre exercice custom */}
                <div style={{borderTop:'1px solid var(--border)',paddingTop:8}}>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:6}}>Autre exercice :</div>
                  <input value={prCustomSearch} onChange={e=>{setPrCustom(true);searchCustomEx(e.target.value);setPrExercise(e.target.value)}}
                    placeholder="Cherche dans tes séances..." style={{width:'100%',boxSizing:'border-box'}}/>
                  {prCustomResults.length>0&&(
                    <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:10,marginTop:4,overflow:'hidden'}}>
                      {prCustomResults.map(n=>(
                        <div key={n} onClick={()=>{setPrExercise(n);setPrCustomSearch(n);setPrCustomResults([])}}
                          style={{padding:'8px 14px',cursor:'pointer',fontSize:13,borderBottom:'1px solid var(--border)'}}
                          onMouseOver={e=>e.currentTarget.style.background='var(--s3)'}
                          onMouseOut={e=>e.currentTarget.style.background=''}>{n}</div>
                      ))}
                    </div>
                  )}
                  {prCustomSearch.length>1&&prCustomResults.length===0&&!['Développé Couché (Bench Press)','Squat','Soulevé de terre (Deadlift)'].includes(prExercise)&&(
                    <div style={{marginTop:6,padding:'8px 12px',background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:10}}>
                      <div style={{fontSize:12,color:'var(--text2)',marginBottom:6}}>Exercice introuvable dans tes séances ?</div>
                      <button onClick={()=>{setPrExercise(prCustomSearch);setPrCustomResults([])}}
                        style={{background:'rgba(59,130,246,.2)',border:'1px solid rgba(59,130,246,.4)',borderRadius:8,padding:'6px 12px',color:'#60a5fa',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:700}}>
                        ➕ Créer "{prCustomSearch}"
                      </button>
                    </div>
                  )}
                  {prExercise&&!['Développé Couché (Bench Press)','Squat','Soulevé de terre (Deadlift)'].includes(prExercise)&&(
                    <div style={{fontSize:11,color:'var(--green)',marginTop:4}}>✓ {prExercise}</div>
                  )}
                </div>
              </div>
              <div>
                <label className="field-label">Poids (kg)</label>
                <input type="number" value={prWeight} onChange={e=>setPrWeight(e.target.value)} placeholder="ex: 120" min="0" step="0.5" inputMode="decimal"/>
              </div>
              <div>
                <label className="field-label">Reps</label>
                <input type="number" value="1" readOnly style={{background:'var(--s3)',color:'var(--text3)',cursor:'not-allowed'}}/>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Le PR = 1 rep max</div>
              </div>
              <div>
                <label className="field-label">Date</label>
                <input type="date" value={prDate} onChange={e=>setPrDate(e.target.value)}/>
              </div>
              <button className="btn-primary" onClick={savePR} disabled={savingPR}>{savingPR?'⏳ Enregistrement...':'✅ Enregistrer'}</button>
            </div>
            <button className="btn-secondary" onClick={()=>setShowPRModal(false)} style={{marginTop:10}}>Annuler</button>
          </div>
        </div>
      )}
    </div>
  )
}
