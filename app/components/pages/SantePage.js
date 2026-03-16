'use client'
import { useStore } from '../../../lib/store'
import { useState, useEffect, useRef } from 'react'
import { db } from '../../../lib/supabase'
import { showToast } from '../Toast'

// Multiplicateur style de vie (NEAT de base)
const LIFESTYLE_MULT = {
  sedentary: 1.15, light: 1.25, moderate: 1.35, active: 1.50, very_active: 1.65,
}
// Bonus séances sport (TEF + EAT)
const SESSION_BONUS = { 0: 0, 2: 0.05, 4: 0.10, 6: 0.15, 7: 0.20 }
// Bonus pas (NEAT marche)
const STEPS_BONUS = { 3000: 0, 6500: 0.04, 10000: 0.09, 13500: 0.14, 17000: 0.20 }
const GOAL_CONFIG = {
  bulk:     { label: '💪 Prise de masse', kcalDelta: +300, protein: 2.2, fat: 0.9, color: '#3b82f6', weeklyKg: +0.25 },
  cut:      { label: '🔥 Sèche',          kcalDelta: -400, protein: 2.5, fat: 0.8, color: '#ef4444', weeklyKg: -0.35 },
  recomp:   { label: '⚖️ Recomposition',  kcalDelta:    0, protein: 2.3, fat: 0.9, color: '#a855f7', weeklyKg:  0    },
  maintain: { label: '🎯 Maintien',        kcalDelta:    0, protein: 1.8, fat: 1.0, color: '#10b981', weeklyKg:  0    },
}
const LIFESTYLE_LABELS = {
  sedentary: '🪑 Sédentaire', light: '🚶 Peu actif', moderate: '🏃 Modéré',
  active: '⚡ Actif', very_active: '🔥 Très actif',
}
const STEPS_LABELS = { 3000:'< 5 000 pas', 6500:'5-8k pas', 10000:'8-12k pas', 13500:'12-15k pas', 17000:'> 15k pas' }
const SESSION_LABELS = { 0:'0 séance/sem', 2:'1-2/sem', 4:'3-4/sem', 6:'5-6/sem', 7:'7+/sem' }

function getFeedbackMsg(delta, goal, gender) {
  const f = gender === 'female'
  if (goal === 'cut') {
    if (delta > 0.8) return f
      ? { icon:'🍕', msg:"Un peu trop profité cette semaine ! On se recentre sur le déficit ?" }
      : { icon:'🐷', msg:"T'as pris du poids en sèche mon gars. La pizza de l'autre soir elle se voit clairement..." }
    if (delta > 0.1) return f
      ? { icon:'⚠️', msg:"Légère hausse. Reste dans le déficit, t'es proche du but !" }
      : { icon:'⚠️', msg:"Légère hausse. Les yeux sur l'assiette, pas juste sur les séances." }
    if (delta < -1) return f
      ? { icon:'🔥', msg:"Grosse semaine ! Fais gaffe à ne pas perdre trop vite, les muscles aussi ça fond." }
      : { icon:'🔥', msg:"Machine de guerre ! Attention à garder le muscle, mange assez de protéines." }
    if (delta < 0) return f
      ? { icon:'✅', msg:"Dans le bon sens ! Continue comme ça, tu gères parfaitement." }
      : { icon:'✅', msg:"En baisse, c'est exactement ça qu'on veut. Continue à assurer." }
    return f
      ? { icon:'➡️', msg:"Stable cette semaine. Pas grave, continue le déficit proprement." }
      : { icon:'➡️', msg:"Stable. Vérifie tes calories, le déficit est là ou pas ?" }
  }
  if (goal === 'bulk') {
    if (delta > 0.8) return f
      ? { icon:'📈', msg:"Tu prends vite ! Assure-toi que c'est du muscle, pas que de la bonne humeur en excès." }
      : { icon:'🤙', msg:"Tu grossis vite mon gars. Espérons que c'est du muscle et pas que du MacDo." }
    if (delta > 0) return f
      ? { icon:'✅', msg:"Belle progression ! Le corps reconstruit, continue comme ça." }
      : { icon:'✅', msg:"Ça monte, parfait. Continue à manger et à t'éclater en salle." }
    if (delta < -0.3) return f
      ? { icon:'😅', msg:"T'as perdu du poids en masse. Mange plus, ton corps a faim !" }
      : { icon:'😅', msg:"T'es en mode prise de masse mais tu maigris. Mange mon ami, MANGE." }
    return f
      ? { icon:'➡️', msg:"Stable. Ajoute 200 kcal/jour et vois ce que ça donne." }
      : { icon:'➡️', msg:"Plateau. Rajoute une poignée de riz, tu verras la différence." }
  }
  if (goal === 'recomp') return f
    ? { icon:'⚖️', msg:"Stable, c'est normal en recompo. Le corps change même si la balance bouge peu." }
    : { icon:'⚖️', msg:"Stable — normal en recompo. La balance ment, les miroirs pas." }
  if (Math.abs(delta) < 0.5) return f
    ? { icon:'✅', msg:"Poids stable, super ! Tu gères ton équilibre parfaitement." }
    : { icon:'✅', msg:"Stable, parfait. T'es en mode croisière." }
  if (delta > 0.5) return f
    ? { icon:'⚠️', msg:"Légère hausse. Rien d'alarmant, mais garde un oeil dessus." }
    : { icon:'⚠️', msg:"Légère hausse. Un peu moins de chips le soir ça aide." }
  return f
    ? { icon:'⬇️', msg:"Tu perds un peu. Mange assez pour maintenir ton énergie !" }
    : { icon:'⬇️', msg:"T'as maigri. Mange man, t'es pas en sèche." }
}

function WeightChart({ logs, goalCfg }) {
  const ref = useRef(null)
  const [W, setW] = useState(320)
  const H = 190
  const PAD = { t: 12, r: 12, b: 28, l: 38 }

  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(e => setW(Math.floor(e[0].contentRect.width)))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  if (logs.length < 2) return null
  const cW = W - PAD.l - PAD.r
  const cH = H - PAD.t - PAD.b

  const weights = logs.map(l => parseFloat(l.weight_kg))
  const modelEnd = weights[0] + goalCfg.weeklyKg * ((new Date(logs[logs.length-1].date) - new Date(logs[0].date)) / (7 * 86400000))
  const allV = [...weights, modelEnd]
  const minV = Math.min(...allV) - 0.8
  const maxV = Math.max(...allV) + 0.8
  const rng = maxV - minV || 1

  const xOf = i => PAD.l + (i / Math.max(1, logs.length - 1)) * cW
  const yOf = v => PAD.t + cH - ((v - minV) / rng) * cH

  const pts = logs.map((l, i) => [xOf(i), yOf(parseFloat(l.weight_kg))])
  const poly = pts.map(([x,y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')

  const nT = 4
  const ticks = Array.from({length: nT+1}, (_, i) => minV + rng * i / nT)
  const fmtD = d => new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})

  return (
    <div ref={ref} style={{width:'100%'}}>
      <svg width={W} height={H} style={{overflow:'visible',display:'block'}}>
        <defs>
          <linearGradient id="wgrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--red)" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="var(--red)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {ticks.map((t,i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W-PAD.r} y1={yOf(t)} y2={yOf(t)} stroke="var(--border)" strokeWidth={0.5}/>
            <text x={PAD.l-4} y={yOf(t)+4} textAnchor="end" fontSize={9} fill="var(--text3)">{t.toFixed(1)}</text>
          </g>
        ))}
        {goalCfg.weeklyKg !== 0 && (
          <line x1={xOf(0)} y1={yOf(weights[0])} x2={xOf(logs.length-1)} y2={yOf(modelEnd)}
            stroke={goalCfg.color} strokeWidth={1.5} strokeDasharray="5,4" opacity={0.55}/>
        )}
        <polygon points={`${pts[0][0]},${PAD.t+cH} ${poly} ${pts[pts.length-1][0]},${PAD.t+cH}`} fill="url(#wgrad)"/>
        <polyline points={poly} fill="none" stroke="var(--red)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={3} fill="var(--red)"/>)}
        <text x={xOf(0)} y={H-4} textAnchor="middle" fontSize={9} fill="var(--text3)">{fmtD(logs[0].date)}</text>
        {logs.length > 2 && (
          <text x={xOf(logs.length-1)} y={H-4} textAnchor="middle" fontSize={9} fill="var(--text3)">{fmtD(logs[logs.length-1].date)}</text>
        )}
      </svg>
    </div>
  )
}

export default function SantePage() {
  const currentUser = useStore(s => s.currentUser)
  const cardioSessions = useStore(s => s.cardioSessions || [])
  const {
    weight_kg: w, height_cm: h, birth_year: by, gender,
    goal = 'maintain',
    activity_level = 'moderate',
    daily_steps_avg,
    sessions_per_week,
  } = currentUser || {}
  // Normaliser les valeurs aux clés connues
  const stepsKey = [3000,6500,10000,13500,17000].reduce((best, k) => Math.abs(k-(daily_steps_avg||8000)) < Math.abs(best-(daily_steps_avg||8000)) ? k : best, 10000)
  const sessKey  = [0,2,4,6,7].reduce((best, k) => Math.abs(k-(sessions_per_week||3)) < Math.abs(best-(sessions_per_week||3)) ? k : best, 4)
  const age = by ? new Date().getFullYear() - by : null
  const incomplete = !w || !h || !age

  const [weightLogs, setWeightLogs] = useState([])
  const [newWeight, setNewWeight] = useState('')
  const [newNote, setNewNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reminderDays, setReminderDays] = useState(7)

  useEffect(() => {
    if (!currentUser?.id) return
    try { setReminderDays(parseInt(localStorage.getItem('lt_wr_'+currentUser.id) || '7')) } catch {}
    loadLogs()
  }, [currentUser?.id])

  async function loadLogs() {
    const { data } = await db.from('weight_logs').select('*').eq('user_id', currentUser.id).order('date', {ascending:true}).limit(90)
    if (data) setWeightLogs(data)
  }

  async function saveWeight() {
    if (!newWeight) { showToast('Entre ton poids !', 'var(--orange)'); return }
    setSaving(true)
    const today = new Date().toISOString().split('T')[0]
    const { error } = await db.from('weight_logs').upsert({
      user_id: currentUser.id, date: today,
      weight_kg: parseFloat(newWeight), note: newNote || null,
    }, { onConflict: 'user_id,date' })
    setSaving(false)
    if (error) { showToast('Erreur sauvegarde', 'var(--red)'); return }
    showToast('✅ Pesée enregistrée !')
    setNewWeight(''); setNewNote(''); setShowForm(false)
    loadLogs()
  }

  function setReminder(d) {
    setReminderDays(d)
    try { localStorage.setItem('lt_wr_'+currentUser?.id, String(d)) } catch {}
  }

  const lastLog = weightLogs[weightLogs.length - 1]
  const daysSince = lastLog ? Math.floor((Date.now() - new Date(lastLog.date+'T12:00:00')) / 86400000) : null
  const shouldRemind = daysSince !== null && daysSince >= reminderDays

  let feedback = null
  if (weightLogs.length >= 2) {
    const delta = parseFloat(weightLogs[weightLogs.length-1].weight_kg) - parseFloat(weightLogs[weightLogs.length-2].weight_kg)
    feedback = getFeedbackMsg(delta, goal, gender)
  }

  let bmr = null
  if (!incomplete) bmr = gender === 'female' ? 10*w + 6.25*h - 5*age - 161 : 10*w + 6.25*h - 5*age + 5
  // TDEE = BMR × (style de vie + bonus pas + bonus séances)
  const totalMult = bmr ? (LIFESTYLE_MULT[activity_level] || 1.35) + (STEPS_BONUS[stepsKey] || 0) + (SESSION_BONUS[sessKey] || 0) : null
  const tdee = bmr ? Math.round(bmr * totalMult) : null
  const goalCfg = GOAL_CONFIG[goal]
  const targetKcal = tdee ? tdee + goalCfg.kcalDelta : null
  let proteinG = null, fatG = null, carbG = null
  if (targetKcal && w) {
    proteinG = Math.round(w * goalCfg.protein)
    fatG = Math.round(w * goalCfg.fat)
    carbG = Math.round((targetKcal - proteinG*4 - fatG*9) / 4)
  }
  const imc = (w && h) ? (w/((h/100)**2)).toFixed(1) : null
  const imcLabel = imc
    ? imc < 18.5 ? {l:'Insuffisance pondérale',c:'#60a5fa'}
    : imc < 25   ? {l:'Poids normal ✅',c:'#22c55e'}
    : imc < 30   ? {l:'Surpoids',c:'#f59e0b'}
    :               {l:'Obésité',c:'#ef4444'}
    : null

  const d30 = new Date(Date.now() - 30*86400000)
  const recent = cardioSessions.filter(s => new Date(s.session_date) >= d30)
  const totalMin = recent.reduce((a,s) => a+(s.duration_min||0), 0)
  const totalKcal = recent.reduce((a,s) => a+(s.calories_burned||0), 0)
  const totalKm = recent.reduce((a,s) => a+(s.distance_km||0), 0)

  const card = (label, value, sub, color='var(--red)') => (
    <div style={{background:'var(--s2)',borderRadius:12,padding:'14px 16px',border:'1px solid var(--border)',flex:'1 1 40%'}}>
      <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color,fontFamily:'var(--fm)'}}>{value}</div>
      {sub && <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{sub}</div>}
    </div>
  )

  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div className="page-title">SANTÉ</div>
      <div className="page-sub">Suivi du poids &amp; métabolisme</div>

      {/* Rappel */}
      {shouldRemind && (
        <div style={{marginTop:16,padding:'12px 14px',background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.3)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--orange)'}}>⚖️ Il est temps de te peser !</div>
            <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>Dernière pesée il y a {daysSince} jours · À jeun, au réveil, après les toilettes</div>
          </div>
          <button onClick={() => setShowForm(true)} style={{background:'var(--orange)',border:'none',borderRadius:8,padding:'8px 14px',color:'white',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',flexShrink:0}}>Peser</button>
        </div>
      )}

      {/* Titre section poids */}
      <div style={{marginTop:20,marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>SUIVI DU POIDS</div>

      {/* Bouton ajouter pesée */}
      <button onClick={() => setShowForm(v => !v)} style={{width:'100%',padding:'11px 16px',marginBottom:10,background:showForm?'rgba(239,68,68,0.08)':'var(--s2)',border:`1.5px solid ${showForm?'var(--red)':'var(--border)'}`,borderRadius:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'space-between',color:showForm?'var(--red)':'var(--text2)',fontSize:13,fontFamily:'var(--fb)',fontWeight:700,transition:'all .2s'}}>
        <span>⚖️ Enregistrer une pesée</span>
        <span style={{fontSize:16,transition:'transform .2s',transform:showForm?'rotate(180deg)':'none'}}>⌄</span>
      </button>

      {showForm && (
        <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',marginBottom:12,display:'flex',flexDirection:'column',gap:10}}>
          <div style={{fontSize:12,color:'var(--text3)',lineHeight:1.5,padding:'8px 10px',background:'rgba(16,185,129,0.06)',borderRadius:8,border:'1px solid rgba(16,185,129,0.15)'}}>
            📋 Pour une mesure fiable : <strong style={{color:'var(--text2)'}}>à jeun, au réveil, après passage aux toilettes.</strong> Toujours dans les mêmes conditions pour comparer.
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div>
              <label style={{fontSize:10,color:'var(--text3)',display:'block',marginBottom:4,fontWeight:700}}>POIDS (kg) *</label>
              <input value={newWeight} onChange={e=>setNewWeight(e.target.value)} placeholder="75.5" inputMode="decimal" style={{fontSize:20,fontWeight:800,textAlign:'center'}}/>
            </div>
            <div>
              <label style={{fontSize:10,color:'var(--text3)',display:'block',marginBottom:4,fontWeight:700}}>NOTE (optionnel)</label>
              <input value={newNote} onChange={e=>setNewNote(e.target.value)} placeholder="Lendemain de triche..."/>
            </div>
          </div>
          <button onClick={saveWeight} disabled={saving} style={{background:'var(--red)',border:'none',borderRadius:10,padding:'12px',color:'white',fontSize:14,fontFamily:'var(--fm)',fontWeight:800,letterSpacing:1,cursor:'pointer'}}>
            {saving ? '⏳...' : '✅ ENREGISTRER'}
          </button>
        </div>
      )}

      {/* Graphique */}
      {weightLogs.length >= 2 && (
        <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
            <div>
              <div style={{fontSize:18,fontWeight:800,color:'var(--text)',fontFamily:'var(--fm)'}}>
                {parseFloat(weightLogs[weightLogs.length-1].weight_kg).toFixed(1)} kg
              </div>
              <div style={{fontSize:10,color:'var(--text3)'}}>{weightLogs.length} pesées</div>
            </div>
            <div style={{textAlign:'right'}}>
              {(() => {
                const delta = parseFloat(weightLogs[weightLogs.length-1].weight_kg) - parseFloat(weightLogs[0].weight_kg)
                const sign = delta >= 0 ? '+' : ''
                const c = goal==='cut' ? (delta<0?'#22c55e':'#ef4444') : goal==='bulk' ? (delta>0?'#22c55e':'#ef4444') : 'var(--text2)'
                return <div style={{fontSize:14,fontWeight:800,color:c,fontFamily:'var(--fm)'}}>{sign}{delta.toFixed(1)} kg</div>
              })()}
              <div style={{fontSize:10,color:'var(--text3)'}}>depuis le début</div>
            </div>
          </div>
          <WeightChart logs={weightLogs} goalCfg={goalCfg}/>
          {goalCfg.weeklyKg !== 0 && (
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6,fontSize:10,color:'var(--text3)'}}>
              <svg width={20} height={8}><line x1={0} y1={4} x2={20} y2={4} stroke={goalCfg.color} strokeWidth={1.5} strokeDasharray="4,3"/></svg>
              Courbe modèle ({goalCfg.weeklyKg > 0 ? '+' : ''}{goalCfg.weeklyKg} kg/sem)
            </div>
          )}
        </div>
      )}

      {weightLogs.length === 1 && (
        <div style={{padding:'12px 14px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,marginBottom:10,fontSize:12,color:'var(--text3)',textAlign:'center'}}>
          Ajoute une 2ème pesée pour voir le graphique d'évolution
        </div>
      )}

      {weightLogs.length === 0 && (
        <div style={{padding:'16px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,marginBottom:10,fontSize:12,color:'var(--text3)',textAlign:'center'}}>
          Aucune pesée — commence par enregistrer ton poids pour suivre ton évolution
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div style={{padding:'12px 14px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,marginBottom:10,display:'flex',alignItems:'flex-start',gap:10}}>
          <span style={{fontSize:22,flexShrink:0}}>{feedback.icon}</span>
          <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.5}}>{feedback.msg}</div>
        </div>
      )}

      {/* Paramètre rappel */}
      <div style={{padding:'12px 14px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,marginBottom:20,display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}>
        <div>
          <div style={{fontSize:12,fontWeight:700,color:'var(--text2)'}}>🔔 Rappel de pesée</div>
          <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>Alerte dans l&apos;app après X jours sans peser</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          {[7,14].map(d => (
            <button key={d} onClick={() => setReminder(d)} style={{padding:'6px 12px',borderRadius:8,fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',background:reminderDays===d?'var(--red)':'var(--s3)',border:`1px solid ${reminderDays===d?'var(--red)':'var(--border)'}`,color:reminderDays===d?'white':'var(--text2)',transition:'all .15s'}}>{d}j</button>
          ))}
        </div>
      </div>

      {incomplete && (
        <div style={{padding:'12px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:12,fontSize:13,color:'#f59e0b',marginBottom:16}}>
          ⚠️ Renseigne ton poids, ta taille et ton année de naissance dans <strong>Éditer le profil</strong> pour voir tes stats de métabolisme.
        </div>
      )}

      {!incomplete && (
        <>
          <div style={{marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>MÉTABOLISME</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {card('Métabolisme de base', `${Math.round(bmr)} kcal`, 'Au repos complet')}
            {card('Dépense totale (TDEE)', `${tdee} kcal`, `${LIFESTYLE_LABELS[activity_level]} · ${STEPS_LABELS[stepsKey]} · ${SESSION_LABELS[sessKey]}`)}
          </div>
          {imc && (
            <div style={{marginTop:10,padding:'12px 16px',background:'var(--s2)',borderRadius:12,border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>IMC</span>
              <span style={{fontWeight:800,fontSize:18,color:imcLabel.c,fontFamily:'var(--fm)'}}>{imc} <span style={{fontSize:12,fontWeight:400}}>{imcLabel.l}</span></span>
            </div>
          )}
          <div style={{marginTop:20,marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>OBJECTIF — {goalCfg.label}</div>
          <div style={{padding:'14px 16px',background:'var(--s2)',borderRadius:12,border:`1px solid ${goalCfg.color}33`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>Apport calorique cible</span>
              <span style={{fontSize:24,fontWeight:900,color:goalCfg.color,fontFamily:'var(--fm)'}}>{targetKcal} <span style={{fontSize:12,fontWeight:400}}>kcal/jour</span></span>
            </div>
            {goalCfg.kcalDelta !== 0 && (
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:12}}>{goalCfg.kcalDelta > 0 ? '+' : ''}{goalCfg.kcalDelta} kcal par rapport au TDEE</div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
              {[
                {l:'Protéines',v:proteinG,unit:'g',kcal:proteinG*4,c:'#3b82f6'},
                {l:'Glucides', v:carbG,   unit:'g',kcal:carbG*4,   c:'#f59e0b'},
                {l:'Lipides',  v:fatG,    unit:'g',kcal:fatG*9,    c:'#ef4444'},
              ].map(m=>(
                <div key={m.l} style={{background:'var(--s3)',borderRadius:10,padding:'10px 8px',textAlign:'center',border:`1px solid ${m.c}33`}}>
                  <div style={{fontSize:10,color:'var(--text3)',marginBottom:4}}>{m.l}</div>
                  <div style={{fontSize:20,fontWeight:800,color:m.c,fontFamily:'var(--fm)'}}>{m.v}<span style={{fontSize:10,fontWeight:400}}>{m.unit}</span></div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{m.kcal} kcal</div>
                </div>
              ))}
            </div>
            <div style={{marginTop:10,fontSize:11,color:'var(--text3)'}}>
              💡 Protéines à {goalCfg.protein}g/kg · Lipides à {goalCfg.fat}g/kg · Reste en glucides
            </div>
          </div>
        </>
      )}

      {recent.length > 0 && (
        <>
          <div style={{marginTop:20,marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>CARDIO — 30 DERNIERS JOURS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {card('Séances', recent.length, 'sessions')}
            {card('Durée totale', `${Math.floor(totalMin/60)}h${String(totalMin%60).padStart(2,'0')}`, '')}
            {totalKm > 0 && card('Distance', `${totalKm.toFixed(1)} km`, '')}
            {totalKcal > 0 && card('Calories brûlées', `${totalKcal}`, 'kcal estimées')}
          </div>
        </>
      )}
    </div>
  )
}
