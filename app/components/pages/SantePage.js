'use client'
import { useStore } from '../../../lib/store'

const ACTIVITY_MULTIPLIER = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_CONFIG = {
  bulk:     { label: '💪 Prise de masse', kcalDelta: +300, protein: 2.2, fat: 0.9, color: '#3b82f6' },
  cut:      { label: '🔥 Sèche',          kcalDelta: -400, protein: 2.5, fat: 0.8, color: '#ef4444' },
  recomp:   { label: '⚖️ Recomposition',  kcalDelta:    0, protein: 2.3, fat: 0.9, color: '#a855f7' },
  maintain: { label: '🎯 Maintien',        kcalDelta:    0, protein: 1.8, fat: 1.0, color: '#10b981' },
}

const ACTIVITY_LABELS = {
  sedentary:   '🪑 Sédentaire',
  light:       '🚶 Léger',
  moderate:    '🏃 Modéré',
  active:      '⚡ Actif',
  very_active: '🔥 Très actif',
}

export default function SantePage() {
  const currentUser = useStore(s => s.currentUser)
  const cardioSessions = useStore(s => s.cardioSessions || [])

  const { weight_kg: w, height_cm: h, birth_year: by, gender, goal = 'maintain', activity_level = 'moderate' } = currentUser || {}
  const age = by ? new Date().getFullYear() - by : null
  const incomplete = !w || !h || !age

  // Mifflin-St Jeor
  let bmr = null
  if (!incomplete) {
    if (gender === 'female') {
      bmr = 10 * w + 6.25 * h - 5 * age - 161
    } else {
      bmr = 10 * w + 6.25 * h - 5 * age + 5
    }
  }

  const tdee = bmr ? Math.round(bmr * ACTIVITY_MULTIPLIER[activity_level]) : null
  const goalCfg = GOAL_CONFIG[goal]
  const targetKcal = tdee ? tdee + goalCfg.kcalDelta : null

  // Macros
  let proteinG = null, fatG = null, carbG = null
  if (targetKcal && w) {
    proteinG = Math.round(w * goalCfg.protein)
    fatG = Math.round(w * goalCfg.fat)
    const proteinKcal = proteinG * 4
    const fatKcal = fatG * 9
    carbG = Math.round((targetKcal - proteinKcal - fatKcal) / 4)
  }

  // IMC
  const imc = (w && h) ? (w / ((h / 100) ** 2)).toFixed(1) : null
  const imcLabel = imc
    ? imc < 18.5 ? { l: 'Insuffisance pondérale', c: '#60a5fa' }
    : imc < 25   ? { l: 'Poids normal ✅',         c: '#22c55e' }
    : imc < 30   ? { l: 'Surpoids',                c: '#f59e0b' }
    :               { l: 'Obésité',                 c: '#ef4444' }
    : null

  // Stats cardio (30 derniers jours)
  const now = new Date()
  const d30 = new Date(now - 30 * 86400000)
  const recent = cardioSessions.filter(s => new Date(s.session_date) >= d30)
  const totalCardioMin = recent.reduce((a, s) => a + (s.duration_min || 0), 0)
  const totalCardioKcal = recent.reduce((a, s) => a + (s.calories_burned || 0), 0)
  const totalCardioKm = recent.reduce((a, s) => a + (s.distance_km || 0), 0)

  const card = (label, value, sub, color = 'var(--red)') => (
    <div style={{background:'var(--s2)',borderRadius:12,padding:'14px 16px',border:'1px solid var(--border)',flex:'1 1 40%'}}>
      <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>{label}</div>
      <div style={{fontSize:22,fontWeight:800,color,fontFamily:'var(--fm)'}}>{value}</div>
      {sub && <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{sub}</div>}
    </div>
  )

  return (
    <div style={{padding:'16px 16px 100px'}}>
      <div className="page-title">SANTÉ</div>
      <div className="page-sub">Métabolisme &amp; nutrition</div>

      {incomplete && (
        <div style={{marginTop:16,padding:'12px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.25)',borderRadius:12,fontSize:13,color:'#f59e0b'}}>
          ⚠️ Renseigne ton poids, ta taille et ton année de naissance dans <strong>Éditer le profil</strong> pour voir tes stats.
        </div>
      )}

      {!incomplete && (
        <>
          {/* BMR / TDEE */}
          <div style={{marginTop:20,marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>MÉTABOLISME</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {card('Métabolisme de base', `${Math.round(bmr)} kcal`, 'Au repos complet')}
            {card('Dépense totale (TDEE)', `${tdee} kcal`, ACTIVITY_LABELS[activity_level])}
          </div>

          {/* IMC */}
          {imc && (
            <div style={{marginTop:10,padding:'12px 16px',background:'var(--s2)',borderRadius:12,border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>IMC</span>
              <span style={{fontWeight:800,fontSize:18,color:imcLabel.c,fontFamily:'var(--fm)'}}>{imc} <span style={{fontSize:12,fontWeight:400}}>{imcLabel.l}</span></span>
            </div>
          )}

          {/* Objectif */}
          <div style={{marginTop:20,marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>OBJECTIF — {goalCfg.label}</div>
          <div style={{padding:'14px 16px',background:'var(--s2)',borderRadius:12,border:`1px solid ${goalCfg.color}33`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>Apport calorique cible</span>
              <span style={{fontSize:24,fontWeight:900,color:goalCfg.color,fontFamily:'var(--fm)'}}>{targetKcal} <span style={{fontSize:12,fontWeight:400}}>kcal/jour</span></span>
            </div>
            {goalCfg.kcalDelta !== 0 && (
              <div style={{fontSize:11,color:'var(--text3)',marginBottom:12}}>
                {goalCfg.kcalDelta > 0 ? `+${goalCfg.kcalDelta}` : goalCfg.kcalDelta} kcal par rapport au TDEE
              </div>
            )}
            {/* Macros */}
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

      {/* Stats cardio 30j */}
      {recent.length > 0 && (
        <>
          <div style={{marginTop:20,marginBottom:8,fontSize:11,color:'var(--text3)',letterSpacing:1,fontWeight:700}}>CARDIO — 30 DERNIERS JOURS</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:10}}>
            {card('Séances', recent.length, 'sessions')}
            {card('Durée totale', `${Math.floor(totalCardioMin / 60)}h${String(totalCardioMin % 60).padStart(2,'0')}`, '')}
            {totalCardioKm > 0 && card('Distance', `${totalCardioKm.toFixed(1)} km`, '')}
            {totalCardioKcal > 0 && card('Calories brûlées', `${totalCardioKcal}`, 'kcal estimées')}
          </div>
        </>
      )}
    </div>
  )
}
