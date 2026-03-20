'use client'
import { useState, useEffect, useRef } from 'react'
import { db } from '../../../lib/supabase'
import { useStore, actions } from '../../../lib/store'
import { ALL_EXERCISES, MUSCLE_LABELS, MUSCLE_GROUPS, normalize } from '../../../lib/constants'
import { showToast } from '../Toast'


const BW_EXERCISES = ['Pompes', 'Push-Up Lesté']

const TECHNIQUES = [
  { k: 'dropset',    l: 'Drop set',    color: '#ef4444' },
  { k: 'superset',   l: 'Super set',   color: '#8b5cf6' },
  { k: 'restpause',  l: 'Rest-pause',  color: '#f97316' },
  { k: 'giant',      l: 'Giant set',   color: '#06b6d4' },
  { k: 'cluster',    l: 'Cluster',     color: '#10b981' },
  { k: 'myo',        l: 'Myo-reps',    color: '#f59e0b' },
]

const isBW = (name) => BW_EXERCISES.some(bw => (name||'').toLowerCase().includes('pompe') && !(name||'').toLowerCase().includes('lest'))

export default function SaisiePage({ onSaved, saveOffline, isOnline }) {
  const sessions = useStore(s => s.sessions)
  const customExercises = useStore(s => s.customExercises)
  const presets = useStore(s => s.presets)
  const userPRs = useStore(s => s.userPRs)
  const currentUser = useStore(s => s.currentUser)

  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(new Date().toTimeString().slice(0,5))
  const [muscles, setMuscles] = useState(['Dos'])
  const [notes, setNotes] = useState('')
  const [exercises, setExercises] = useState([])
  const [exSearch, setExSearch] = useState('')
  const [exResults, setExResults] = useState([])
  const [saving, setSaving] = useState(false)
  const [showCardio, setShowCardio] = useState(false) // cardio optionnel dans la séance
  // Cardio states
  const [cardioType, setCardioType] = useState('tapis')
  const [cardioDuration, setCardioDuration] = useState('')
  const [cardioDistance, setCardioDistance] = useState('')
  const [cardioSpeed, setCardioSpeed] = useState('')
  const [cardioHr, setCardioHr] = useState('')
  const [cardioCalories, setCardioCalories] = useState('')
  const [cardioIncline, setCardioIncline] = useState('')
  const [cardioResistance, setCardioResistance] = useState('')
  const [cardioNotes, setCardioNotes] = useState('')
  const [showPresets, setShowPresets] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [sharePresetId, setSharePresetId] = useState(null)
  const [importCode, setImportCode] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [localPresets, setLocalPresets] = useState(null)
  const [editingPreset, setEditingPreset] = useState(null) // preset en cours d'édition
  const [activePreset, setActivePreset] = useState(null) // preset chargé pour cette séance
  const [editPresetName, setEditPresetName] = useState('')
  const [dragIdx, setDragIdx] = useState(null)
  const [dragOverIdx, setDragOverIdx] = useState(null)
  const [ghostPos, setGhostPos] = useState({ x: 0, y: 0 })
  const [ghostLabel, setGhostLabel] = useState('')
  const dragIdxRef = useRef(null)
  const dragOverIdxRef = useRef(null)
  const ghostOffset = useRef({ x: 0, y: 0 })
  const touchStateRef = useRef({ startIdx: null, lastOverIdx: null })
  const [restTimer, setRestTimer] = useState(null)
  const [restLeft, setRestLeft] = useState(0)
  const restRef = useRef(null)

  useEffect(() => {
    if (restLeft <= 0) { clearInterval(restRef.current); return }
    restRef.current = setInterval(() => {
      setRestLeft(r => {
        if (r <= 1) { clearInterval(restRef.current); if (navigator.vibrate) navigator.vibrate([200,100,200]); showToast('⏱ Temps de repos terminé !', 'var(--green)'); return 0 }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(restRef.current)
  }, [restLeft])

  // Clé de brouillon unique par utilisateur
  const draftKey = currentUser ? `lift_draft_${currentUser.id}` : null

  // Restaurer le brouillon au chargement
  useEffect(() => {
    if (!draftKey) return
    try {
      const saved = localStorage.getItem(draftKey)
      if (!saved) return
      const draft = JSON.parse(saved)
      if (draft.exercises?.length > 0 || draft.notes) {
        if (draft.date) setDate(draft.date)
        if (draft.time) setTime(draft.time)
        if (draft.muscles?.length) setMuscles(draft.muscles)
        if (draft.notes) setNotes(draft.notes)
        if (draft.exercises?.length) setExercises(draft.exercises)
        showToast('📝 Brouillon restauré !', 'var(--blue)')
      }
    } catch {}
  }, [draftKey])

  // Sauvegarder le brouillon à chaque changement
  useEffect(() => {
    if (!draftKey) return
    if (exercises.length === 0 && !notes) {
      localStorage.removeItem(draftKey)
      return
    }
    const draft = { date, time, muscles, notes, exercises }
    localStorage.setItem(draftKey, JSON.stringify(draft))
  }, [date, time, muscles, notes, exercises, draftKey])

  function clearDraft() {
    if (draftKey) localStorage.removeItem(draftKey)
  }

  // Formule kcal tapis réaliste (Pandolf 1977 adaptée) + MET pour autres
  function estimateCardioKcal() {
    const w = currentUser?.weight_kg || 75
    const dur = parseInt(cardioDuration || 0)
    const dist = parseFloat(cardioDistance || 0)
    const spd = parseFloat(cardioSpeed || 0)
    const inc = parseFloat(cardioIncline || 0)
    const hr = parseInt(cardioHr || 0)

    if (!dur) return null

    // Si FC connue → formule Keytel (la plus précise)
    const isMale = currentUser?.gender !== 'female'
    const age = currentUser?.age || 25
    if (hr > 0 && w > 0) {
      if (isMale) return Math.round(((age * 0.2017) + (w * 0.09036) + (hr * 0.6309) - 55.0969) * dur / 4.184)
      else return Math.round(((age * 0.074) - (w * 0.05741) + (hr * 0.4472) - 20.4022) * dur / 4.184)
    }

    // Sinon formule par type
    if (cardioType === 'tapis') {
      const spdMs = spd > 0 ? spd / 3.6 : dist > 0 ? dist * 1000 / (dur * 60) : 8 / 3.6
      const gradFactor = inc > 0 ? (1 + inc / 100 * 4) : 1 // inclinaison augmente effort ~4x
      const met = (0.1 * spdMs * 60 + 1.8 * spdMs * 60 * (inc / 100) + 3.5) / 3.5
      return Math.round(met * gradFactor * w * (dur / 60))
    }
    const MET = { tapis: 8.5, velo: 7.5, rameur: 8.0, elliptique: 5.5, corde: 11.0, autre: 6.5 }
    return Math.round((MET[cardioType] || 7) * w * (dur / 60))
  }

  function getCardioData() {
    if (!showCardio || !cardioDuration) return null
    const cal = cardioCalories ? parseInt(cardioCalories) : estimateCardioKcal()
    let spd = cardioSpeed ? parseFloat(cardioSpeed) : null
    if (!spd && cardioDistance && cardioDuration) {
      spd = parseFloat((parseFloat(cardioDistance) / (parseInt(cardioDuration) / 60)).toFixed(1))
    }
    return {
      type: cardioType,
      duration_min: parseInt(cardioDuration),
      distance_km: cardioDistance ? parseFloat(cardioDistance) : null,
      avg_speed_kmh: spd,
      avg_hr: cardioHr ? parseInt(cardioHr) : null,
      calories_burned: cal,
      incline_pct: cardioIncline ? parseFloat(cardioIncline) : null,
      resistance: cardioResistance ? parseInt(cardioResistance) : null,
      notes: cardioNotes || null,
    }
  }

  function startRest(secs) { clearInterval(restRef.current); setRestLeft(secs); setRestTimer(secs) }

  function filterEx(q) {
    setExSearch(q)
    if (!q.trim()) { setExResults([]); return }
    const nq = normalize(q)
    const all = new Set()
    Object.values(ALL_EXERCISES).flat().forEach(e => all.add(e))
    ;(customExercises||[]).forEach(e => all.add(e.name))
    sessions.forEach(s => (s.exercises||[]).forEach(e => all.add(e.name)))
    setExResults([...all].filter(n => normalize(n).includes(nq)).slice(0,8))
  }

  function getLastPerf(name) {
    for (const s of sessions) {
      const ex = (s.exercises||[]).find(e => normalize(e.name) === normalize(name))
      if (ex) return { session: s, exercise: ex }
    }
    return null
  }

  function addExercise(name) {
    const last = getLastPerf(name)
    setExercises(prev => [...prev, {
      id: Date.now(), name,
      sets: last ? last.exercise.sets.map((s,i) => ({id:Date.now()+i,r:s.r,w:s.w})) : Array(4).fill(null).map((_,i) => ({id:Date.now()+i,r:'',w:''}))
    }])
    setExSearch(''); setExResults([])
  }

  async function createAndAddExercise(name) {
    if (!name.trim()) return
    // Save to custom_exercises table
    const { data } = await db.from('custom_exercises').insert([{user_id: currentUser.id, name: name.trim()}]).select()
    if (data && data[0]) {
      actions.setCustomExercises([...(customExercises||[]), data[0]])
    }
    addExercise(name.trim())
    showToast('✅ Exercice créé !')
  }

  async function toggleFavorite(name) {
    const ex = (customExercises||[]).find(e => normalize(e.name) === normalize(name))
    if (ex) {
      // Toggle existing custom exercise
      await db.from('custom_exercises').update({is_favorite: !ex.is_favorite}).eq('id', ex.id)
      actions.setCustomExercises((customExercises||[]).map(e => e.id===ex.id ? {...e, is_favorite: !e.is_favorite} : e))
    } else {
      // Create as favorite
      const { data } = await db.from('custom_exercises').insert([{user_id: currentUser.id, name, is_favorite: true}]).select()
      if (data && data[0]) actions.setCustomExercises([...(customExercises||[]), data[0]])
    }
  }

  async function deletePreset(id) {
    if (!confirm('Supprimer ce preset ?')) return
    await db.from('presets').delete().eq('id', id)
    actions.setPresets((presets||[]).filter(p => p.id !== id))
    showToast('🗑 Preset supprimé')
  }

  function toggleUnilateral(exId) {
    setExercises(prev => prev.map(ex => ex.id!==exId ? ex : {
      ...ex,
      unilateral: !ex.unilateral,
      sets: ex.sets.map(st => ({...st, wL: st.w||'', wR: st.w||'', rL: st.r||'', rR: st.r||''}))
    }))
  }

  function updateSet(exId, setId, field, val) {
    setExercises(prev => prev.map(ex => ex.id!==exId ? ex : {...ex, sets: ex.sets.map(st => st.id!==setId ? st : {...st,[field]:val})}))
  }

  function addSet(exId) {
    setExercises(prev => prev.map(ex => ex.id!==exId ? ex : {...ex, sets:[...ex.sets,{id:Date.now(),r:'',w:''}]}))
  }

  function removeSet(exId, setId) {
    setExercises(prev => prev.map(ex => ex.id!==exId ? ex : {...ex, sets:ex.sets.filter(st=>st.id!==setId)}))
  }

  function removeExercise(exId) { setExercises(prev => prev.filter(ex => ex.id!==exId)) }

  const totalVolume = exercises.reduce((a,ex) => isBW(ex.name) ? a : a+ex.sets.reduce((b,st) => {
    if (ex.unilateral) return b + (parseFloat(st.rL)||0)*(parseFloat(st.wL)||0) + (parseFloat(st.rR)||0)*(parseFloat(st.wR)||0)
    return b + (parseFloat(st.r)||0)*(parseFloat(st.w)||0)
  }, 0), 0)

  async function checkAndUpdatePRs(exos, sessionDate) {
    for (const ex of exos) {
      let maxW = 0, maxR = 0
      if (ex.unilateral) {
        // PR basé sur le meilleur côté (poids max en 1-2 reps)
        ex.sets.forEach(st => {
          if ((parseInt(st.rL)||0)<=2 && (parseFloat(st.wL)||0)>maxW) { maxW=parseFloat(st.wL)||0; maxR=parseInt(st.rL)||0 }
          if ((parseInt(st.rR)||0)<=2 && (parseFloat(st.wR)||0)>maxW) { maxW=parseFloat(st.wR)||0; maxR=parseInt(st.rR)||0 }
        })
      } else {
        const validSets = ex.sets.filter(st => (parseInt(st.r)||0)<=2 && (parseFloat(st.w)||0)>0)
        if (!validSets.length) continue
        const maxSet = validSets.reduce((best,st) => (parseFloat(st.w)||0)>(parseFloat(best.w)||0)?st:best, validSets[0])
        maxW = parseFloat(maxSet.w)||0; maxR = parseInt(maxSet.r)||0
      }
      if (!maxW) continue
      const existing = (userPRs||[]).find(p => normalize(p.exercise)===normalize(ex.name))
      const label = ex.unilateral ? `${ex.name} (par côté)` : ex.name
      if (!existing) {
        await db.from('prs').insert([{user_id:currentUser.id,exercise:ex.name,weight:maxW,reps:maxR,date:sessionDate,is_manual:false}])
        showToast(`🏆 Nouveau PR ${label} : ${maxW}kg !`, 'var(--gold)')
      } else if (maxW > parseFloat(existing.weight)) {
        await db.from('prs').update({weight:maxW,reps:maxR,date:sessionDate,is_manual:false}).eq('id',existing.id)
        showToast(`🏆 Nouveau PR ${label} : ${maxW}kg !`, 'var(--gold)')
      }
    }
  }

  async function validateSession() {
    if (!exercises.length) { showToast('Ajoute au moins un exercice !', 'var(--orange)'); return }
    setSaving(true)
    const muscleStr = muscles.join('+')
    const cardioData = getCardioData()
    const sessionData = {date,time,muscle:muscleStr,notes,exercises,totalVolume}
    if (!isOnline) {
      saveOffline(sessionData); showToast('📵 Séance sauvegardée hors ligne !', 'var(--orange)')
    } else {
      // Sauvegarder la séance muscu
      const { error, data: sessRows } = await db.from('sessions').insert([{
        user_id:currentUser.id, session_date:date, session_time:time,
        muscle:muscleStr, notes, exercises:JSON.stringify(exercises), total_volume:totalVolume,
        preset_id: activePreset?.id || null,
        preset_name: activePreset?.name || null,
      }]).select()
      if (error) { saveOffline(sessionData); showToast('📵 Hors ligne — séance sauvegardée localement', 'var(--orange)') }
      else {
        await checkAndUpdatePRs(exercises,date)
        // Si cardio renseigné → sauvegarder dans cardio_sessions en liant à la session
        if (cardioData) {
          const sessionId = sessRows?.[0]?.id || null
          await db.from('cardio_sessions').insert([{
            user_id: currentUser.id,
            session_date: date,
            session_id: sessionId, // lien avec la séance muscu
            ...cardioData,
          }])
          const kcal = cardioData.calories_burned
          showToast(`✅ Séance + cardio enregistrés !${kcal ? ' 🔥 ' + kcal + ' kcal' : ''}`)
        } else {
          showToast('✅ Séance enregistrée !')
        }
        resetForm()
        onSaved()
      }
    }
    setSaving(false)
  }

  function resetForm() {
    setDate(new Date().toISOString().split('T')[0]); setTime(new Date().toTimeString().slice(0,5))
    setMuscles(['Dos']); setNotes(''); setExercises([])
    setShowCardio(false)
    setCardioDuration(''); setCardioDistance(''); setCardioSpeed(''); setCardioHr('')
    setCardioCalories(''); setCardioIncline(''); setCardioResistance(''); setCardioNotes('')
    setActivePreset(null)
    setCardioType('tapis')
    clearDraft()
  }

  async function updatePreset(preset) {
    // Sauvegarde le preset avec les exercices actuels de la séance
    const exos = exercises.map(e=>({name:e.name,sets:e.sets.map(s=>({r:s.r,w:s.w}))}))
    const newName = editPresetName.trim() || preset.name
    await db.from('presets').update({ name: newName, muscle: muscles.join('+'), exercises: JSON.stringify(exos) }).eq('id', preset.id)
    await actions.loadPresets(currentUser.id)
    setLocalPresets(null)
    setEditingPreset(null)
    setEditPresetName('')
    showToast(`✅ Preset "${newName}" mis à jour !`)
  }

  async function savePreset() {
    if (!presetName.trim()) { showToast('Donne un nom !', 'var(--orange)'); return }
    const exos = exercises.map(e=>({name:e.name,sets:e.sets.map(s=>({r:s.r,w:s.w}))}))
    await db.from('presets').insert([{user_id:currentUser.id,name:presetName,muscle:muscles.join('+'),exercises:JSON.stringify(exos)}])
    showToast('✅ Preset sauvegardé !'); setPresetName(''); onSaved()
  }

  function getShareCode(preset) {
    // Encode preset as base64 JSON
    const data = { name: preset.name, muscle: preset.muscle, exercises: preset.exercises }
    return btoa(unescape(encodeURIComponent(JSON.stringify(data))))
  }

  // Sorted presets with local order
  const sortedPresets = (localPresets || [...(presets||[])].sort((a,b)=>(a.position||0)-(b.position||0)))

  async function savePresetsOrder(ordered) {
    setLocalPresets(ordered)
    actions.setPresets(ordered)
    await Promise.all(ordered.map((p,i) => db.from('presets').update({position:i}).eq('id',p.id)))
  }

  function reorder(fromIdx, toIdx) {
    if (fromIdx === null || toIdx === null || fromIdx === toIdx) return
    const ordered = [...sortedPresets]
    const [moved] = ordered.splice(fromIdx, 1)
    ordered.splice(toIdx, 0, moved)
    savePresetsOrder(ordered)
  }

  // Which index the ghost is hovering over — basé sur le centre de chaque item
  // Hysteresis : on ne change d'index que si on a franchi le milieu + 20% de marge
  // pour éviter l'oscillation quand le fantôme est entre deux items
  function getHoverIdx(y) {
    const els = Array.from(document.querySelectorAll('[data-preset-idx]'))
    if (!els.length) return dragIdxRef.current
    const current = dragOverIdxRef.current ?? dragIdxRef.current

    let best = current
    let bestDist = Infinity

    els.forEach(el => {
      const idx = parseInt(el.getAttribute('data-preset-idx'))
      if (idx === dragIdxRef.current) return // skip l'item draggé
      const rect = el.getBoundingClientRect()
      const mid = rect.top + rect.height / 2
      const dist = Math.abs(y - mid)

      // Zone de déclenchement : seulement si on a passé 30% dans l'item suivant
      const threshold = rect.height * 0.3
      if (dist < bestDist) {
        // Ne changer que si on est clairement dans une nouvelle zone
        if (idx !== current) {
          const isMovingInto = (idx > current && y > rect.top + threshold) ||
                               (idx < current && y < rect.bottom - threshold)
          if (isMovingInto) {
            bestDist = dist
            best = idx
          }
        } else {
          bestDist = dist
          best = idx
        }
      }
    })

    return best
  }

  // Translate for items that need to shift to make room
  function getItemTranslate(i) {
    const from = dragIdxRef.current
    const over = dragOverIdxRef.current
    if (from === null || over === null || from === over || i === from) return 0
    const itemH = document.querySelector('[data-preset-idx="0"]')?.getBoundingClientRect()?.height || 58
    if (from < over && i > from && i <= over) return -itemH
    if (from > over && i < from && i >= over) return itemH
    return 0
  }

  // Desktop drag (suppressed native ghost, we draw our own)
  function onDragStart(e, i) {
    const rect = e.currentTarget.getBoundingClientRect()
    ghostOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    dragIdxRef.current = i; dragOverIdxRef.current = i
    setDragIdx(i); setDragOverIdx(i)
    setGhostLabel(sortedPresets[i]?.name || '')
    setGhostPos({ x: e.clientX, y: e.clientY })
    e.dataTransfer.effectAllowed = 'move'
    const blank = document.createElement('canvas')
    e.dataTransfer.setDragImage(blank, 0, 0)
  }
  function onDrag(e) {
    if (e.clientX === 0 && e.clientY === 0) return
    setGhostPos({ x: e.clientX, y: e.clientY })
    const newOver = getHoverIdx(e.clientY)
    if (newOver !== dragOverIdxRef.current) {
      dragOverIdxRef.current = newOver
      setDragOverIdx(newOver)
    }
  }
  function onDragEnd() {
    reorder(dragIdxRef.current, dragOverIdxRef.current)
    dragIdxRef.current = null; dragOverIdxRef.current = null
    setDragIdx(null); setDragOverIdx(null)
  }

  // Touch drag
  function onTouchStart(e, i) {
    const rect = e.currentTarget.getBoundingClientRect()
    const t = e.touches[0]
    ghostOffset.current = { x: t.clientX - rect.left, y: t.clientY - rect.top }
    touchStateRef.current = { startIdx: i, lastOverIdx: i }
    dragIdxRef.current = i; dragOverIdxRef.current = i
    setDragIdx(i); setDragOverIdx(i)
    setGhostLabel(sortedPresets[i]?.name || '')
    setGhostPos({ x: t.clientX, y: t.clientY })
    // Bloquer le scroll de la page pendant le drag (passive:false obligatoire sur mobile)
    document.addEventListener('touchmove', handleTouchMoveGlobal, { passive: false })
    document.addEventListener('touchend', handleTouchEndGlobal)
  }
  function handleTouchMoveGlobal(e) {
    if (touchStateRef.current.startIdx === null) return
    e.preventDefault() // bloque le scroll
    const t = e.touches[0]
    setGhostPos({ x: t.clientX, y: t.clientY })
    const newOver = getHoverIdx(t.clientY)
    if (newOver !== dragOverIdxRef.current) {
      dragOverIdxRef.current = newOver
      touchStateRef.current.lastOverIdx = newOver
      setDragOverIdx(newOver)
    }
  }
  function handleTouchEndGlobal() {
    reorder(touchStateRef.current.startIdx, touchStateRef.current.lastOverIdx)
    touchStateRef.current = { startIdx: null, lastOverIdx: null }
    dragIdxRef.current = null; dragOverIdxRef.current = null
    setDragIdx(null); setDragOverIdx(null)
    document.removeEventListener('touchmove', handleTouchMoveGlobal)
    document.removeEventListener('touchend', handleTouchEndGlobal)
  }
  function onTouchMove(e) {} // géré par handleTouchMoveGlobal
  function onTouchEnd() {} // géré par handleTouchEndGlobal

  async function importPreset() {
    if (!importCode.trim()) return
    setImportLoading(true)
    try {
      const decoded = JSON.parse(decodeURIComponent(escape(atob(importCode.trim()))))
      if (!decoded.name || !decoded.exercises) throw new Error()
      await db.from('presets').insert([{user_id:currentUser.id, name:decoded.name+' (importé)', muscle:decoded.muscle||'', exercises:JSON.stringify(decoded.exercises)}])
      const { data } = await db.from('presets').select('*').eq('user_id', currentUser.id)
      actions.setPresets(data||[])
      setImportCode(''); setShowImport(false)
      showToast('✅ Preset importé !')
    } catch(e) {
      showToast('❌ Code invalide', 'var(--red)')
    }
    setImportLoading(false)
  }

  // Reset local order when presets reload
  useState(() => { setLocalPresets(null) })

  function loadPreset(preset) {
    setMuscles(preset.muscle ? preset.muscle.split('+') : ['Dos'])
    setExercises((preset.exercises||[]).map(e=>({id:Date.now()+Math.random(),name:e.name,sets:(e.sets||[]).map((s,i)=>({id:Date.now()+i,r:s.r||'',w:s.w||''}))})))
    setActivePreset({id: preset.id, name: preset.name})
    setShowPresets(false); showToast(`✅ Preset "${preset.name}" chargé !`)
  }

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="page-title">SAISIE</div>
        <div className="page-sub">Nouvelle séance{activePreset ? ` — ${activePreset.name}` : ''}</div>
        {exercises.length > 0 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:8,padding:'7px 12px',background:'rgba(59,130,246,0.08)',border:'1px solid rgba(59,130,246,0.2)',borderRadius:10}}>
            <span style={{fontSize:12,color:'#60a5fa'}}>📝 Brouillon en cours — {exercises.length} exo{exercises.length>1?'s':''}</span>
            <button onClick={()=>{resetForm();showToast('🗑 Brouillon effacé')}} style={{background:'none',border:'none',color:'var(--text3)',fontSize:11,cursor:'pointer',fontFamily:'var(--fb)'}}>Effacer</button>
          </div>
        )}

        <hr className="page-divider" />
      </div>

      {/* DATE / HEURE — commun aux deux modes */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:16}}>
        <div><label className="field-label">Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
        <div><label className="field-label">Heure</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} /></div>
      </div>



      {/* ─── MODE MUSCU ─── */}
      {(
        <div>
          <label className="field-label">Groupe musculaire</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
            {MUSCLE_GROUPS.map(m => {
              const sel = muscles.includes(m)
              return <button key={m} onClick={()=>setMuscles(prev=>sel?prev.filter(x=>x!==m):[...prev,m])} style={{background:sel?'var(--red)':'var(--s2)',border:`1px solid ${sel?'var(--red)':'var(--border)'}`,borderRadius:8,padding:'5px 12px',color:sel?'white':'var(--text2)',cursor:'pointer',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,transition:'all 0.15s'}}>{MUSCLE_LABELS[m]}</button>
            })}
            {muscles.length > 0 && (
              <div style={{width:'100%',marginTop:4,fontSize:11,color:'var(--text3)'}}>
                Séance : <span style={{color:'var(--text2)',fontWeight:600}}>{muscles.map(m=>MUSCLE_LABELS[m]||m).join(' + ')}</span>
                {muscles.length > 1 && <button onClick={()=>setMuscles(['Dos'])} style={{marginLeft:8,background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:11}}>✕ Reset</button>}
              </div>
            )}
          </div>
      <div style={{marginBottom:16}}>
        <label className="field-label">Notes (optionnel)</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2} placeholder="RPE, douleurs, humeur..." style={{resize:'none'}} />
      </div>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,padding:'10px 16px',marginBottom:16}}>
        <span style={{fontSize:13,color:'var(--text2)'}}>Volume total</span>
        <span style={{fontFamily:'var(--fm)',fontSize:22,fontWeight:700,color:'var(--green)'}}>{totalVolume.toLocaleString('fr')} <span style={{fontSize:14}}>kg</span></span>
      </div>

      {exercises.length === 0 && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'40px 20px',gap:10,opacity:0.5}}>
          <div style={{fontSize:44}}>🏋️</div>
          <div style={{fontSize:13,color:'var(--text3)',textAlign:'center',fontFamily:'var(--fb)'}}>Recherche un exercice ci-dessous pour commencer</div>
        </div>
      )}

      {exercises.map((ex) => {
        const last = getLastPerf(ex.name)
        return (
          <div key={ex.id} style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:14,marginBottom:10,overflow:'hidden'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
              <div style={{width:26,height:26,borderRadius:8,background:'var(--red)',color:'white',fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{exercises.indexOf(ex)+1}</div>
              <div style={{flex:1,fontSize:14,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>{ex.name}{isBW(ex.name)&&<span style={{fontSize:10,fontWeight:700,background:'rgba(59,130,246,.2)',color:'var(--blue)',borderRadius:4,padding:'2px 6px',letterSpacing:1,flexShrink:0}}>BW</span>}</div>
              <button onClick={()=>removeExercise(ex.id)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:18,cursor:'pointer'}}>×</button>
            </div>
            {last && (
              <div style={{padding:'6px 14px',fontSize:11,color:'var(--text3)',borderBottom:'1px solid var(--border)',display:'flex',gap:8,flexWrap:'wrap'}}>
                <span>Dernière fois ({new Date(last.session.session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})}) :</span>
                {last.exercise.sets.map((st,i)=><span key={i} style={{color:'var(--text2)'}}>{st.r}×{st.w}kg</span>)}
              </div>
            )}
            <div style={{padding:'10px 14px'}}>
              {/* Ligne mode unilatéral */}
              <div onClick={()=>toggleUnilateral(ex.id)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'7px 0',marginBottom:6,cursor:'pointer',borderBottom:'1px solid var(--border)'}}>
                <div>
                  <span style={{fontSize:12,fontWeight:700,color:ex.unilateral?'var(--orange)':'var(--text2)',fontFamily:'var(--fb)'}}>Mode unilatéral</span>
                  <span style={{fontSize:10,color:'var(--text3)',marginLeft:6}}>Poids et reps par côté (G / D)</span>
                </div>
                <div style={{width:36,height:20,borderRadius:10,background:ex.unilateral?'var(--orange)':'var(--s3)',border:`1px solid ${ex.unilateral?'var(--orange)':'var(--border)'}`,position:'relative',transition:'all .2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:3,left:ex.unilateral?17:3,width:12,height:12,borderRadius:'50%',background:'white',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.3)'}}/>
                </div>
              </div>

              {ex.unilateral ? (
                <div style={{display:'grid',gridTemplateColumns:'22px 1fr 1fr 1fr 1fr 28px',gap:4,marginBottom:6}}>
                  <span/><span style={{fontSize:10,color:'var(--orange)',textAlign:'center',fontWeight:700}}>Reps G</span><span style={{fontSize:10,color:'var(--orange)',textAlign:'center',fontWeight:700}}>kg G</span><span style={{fontSize:10,color:'var(--blue)',textAlign:'center',fontWeight:700}}>Reps D</span><span style={{fontSize:10,color:'var(--blue)',textAlign:'center',fontWeight:700}}>kg D</span><span/>
                </div>
              ) : (
                <div style={{display:'grid',gridTemplateColumns:'28px 1fr 1fr 60px 28px',gap:6,marginBottom:6}}>
                  <span/><span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>Reps</span><span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>Poids (kg)</span><span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>Vol</span><span/>
                </div>
              )}
              {ex.sets.map((st,si)=>(
                ex.unilateral ? (
                  <div key={st.id} style={{marginBottom:8}}>
                    <div style={{display:'grid',gridTemplateColumns:'22px 1fr 1fr 1fr 1fr 28px',gap:4,alignItems:'center'}}>
                      <span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>{si+1}</span>
                      <input type="number" value={st.rL||''} onChange={e=>updateSet(ex.id,st.id,'rL',e.target.value)} placeholder="0" min="0" inputMode="numeric" style={{textAlign:'center',padding:'6px 2px',fontSize:13,borderColor:'var(--orange)',borderWidth:1}}/>
                      <input type="number" value={st.wL||''} onChange={e=>updateSet(ex.id,st.id,'wL',e.target.value)} placeholder="0" min="0" step="0.5" inputMode="decimal" style={{textAlign:'center',padding:'6px 2px',fontSize:13,borderColor:'var(--orange)',borderWidth:1}}/>
                      <input type="number" value={st.rR||''} onChange={e=>updateSet(ex.id,st.id,'rR',e.target.value)} placeholder="0" min="0" inputMode="numeric" style={{textAlign:'center',padding:'6px 2px',fontSize:13,borderColor:'var(--blue)',borderWidth:1}}/>
                      <input type="number" value={st.wR||''} onChange={e=>updateSet(ex.id,st.id,'wR',e.target.value)} placeholder="0" min="0" step="0.5" inputMode="decimal" style={{textAlign:'center',padding:'6px 2px',fontSize:13,borderColor:'var(--blue)',borderWidth:1}}/>
                      <button onClick={()=>removeSet(ex.id,st.id)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:14,cursor:'pointer'}}>×</button>
                    </div>
                    {/* Indicateur déséquilibre */}
                    {(st.rL||st.rR||st.wL||st.wR) && (parseFloat(st.rL)||0)!==(parseFloat(st.rR)||0) && (
                      <div style={{fontSize:10,color:'var(--orange)',textAlign:'center',marginTop:2}}>
                        ⚠️ {(parseFloat(st.rL)||0)>(parseFloat(st.rR)||0)?`G +${(parseFloat(st.rL)||0)-(parseFloat(st.rR)||0)} rep`:`D +${(parseFloat(st.rR)||0)-(parseFloat(st.rL)||0)} rep`}
                      </div>
                    )}
                    {(st.wL||st.wR) && (parseFloat(st.wL)||0)!==(parseFloat(st.wR)||0) && (
                      <div style={{fontSize:10,color:'var(--text3)',textAlign:'center'}}>
                        {(parseFloat(st.wL)||0)>(parseFloat(st.wR)||0)?`G +${((parseFloat(st.wL)||0)-(parseFloat(st.wR)||0)).toFixed(1)}kg`:`D +${((parseFloat(st.wR)||0)-(parseFloat(st.wL)||0)).toFixed(1)}kg`}
                      </div>
                    )}
                  </div>
                ) : (
                  <div key={st.id} style={{marginBottom:4}}>
                    <div style={{display:'grid',gridTemplateColumns:'28px 1fr 1fr 60px 28px',gap:6,marginBottom:2,alignItems:'center'}}>
                      <span style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>{si+1}</span>
                      {(() => {
                          const last = getLastPerf(ex.name)
                          const lastSet = last?.exercise?.sets?.[si]
                          const prevR = lastSet?.r ? String(lastSet.r) : ''
                          const prevW = lastSet?.w ? String(lastSet.w) : ''
                          const isEmpty = !st.r && !st.w
                          return (<>
                            <input type="number" value={st.r||''} onChange={e=>updateSet(ex.id,st.id,'r',e.target.value)}
                              placeholder={prevR||'0'} min="0" inputMode="numeric"
                              style={{textAlign:'center',padding:'8px 4px',fontSize:14,
                                opacity: isEmpty&&prevR ? 0.95 : 1,
                                borderColor: isEmpty&&prevR ? 'var(--border2)' : ''
                              }}/>
                            <input type="number" value={st.w||''} onChange={e=>updateSet(ex.id,st.id,'w',e.target.value)}
                              placeholder={isBW(ex.name)?'Lest':(prevW||'0')} min="0" step="0.5" inputMode="decimal"
                              style={{textAlign:'center',padding:'8px 4px',fontSize:14,
                                borderColor: isBW(ex.name)&&!st.w?'var(--blue)': isEmpty&&prevW?'var(--border2)':'',
                                opacity: isEmpty&&prevW ? 0.95 : 1,
                              }}/>
                          </>)
                        })()}
                      <span style={{fontSize:12,color: isBW(ex.name)?'var(--blue)':'var(--text3)',textAlign:'center'}}>{isBW(ex.name)?'BW':((parseFloat(st.r)||0)*(parseFloat(st.w)||0)).toLocaleString('fr')}</span>
                      <button onClick={()=>removeSet(ex.id,st.id)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:14,cursor:'pointer'}}>×</button>
                    </div>
                    {/* Tag technique compact */}
                    <div style={{paddingLeft:34,marginTop:2,position:'relative'}}>
                      {st.technique ? (
                        <div style={{display:'flex',alignItems:'center',gap:4}}>
                          {(()=>{const t=TECHNIQUES.find(x=>x.k===st.technique);return t?(<button onClick={()=>updateSet(ex.id,st.id,'technique',null)} style={{padding:'2px 8px',fontSize:10,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:6,border:`1px solid ${t.color}`,background:`${t.color}20`,color:t.color}}>{t.l} ×</button>):null})()}
                        </div>
                      ) : (
                        <div style={{position:'relative'}}>
                          <button onClick={()=>updateSet(ex.id,st.id,'_showTech',!st._showTech)} style={{padding:'1px 7px',fontSize:10,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)'}}>⚡ Technique</button>
                          {st._showTech && (
                            <div style={{position:'absolute',bottom:'calc(100% + 4px)',left:0,zIndex:50,background:'var(--s1)',border:'1px solid var(--border2)',borderRadius:10,padding:8,display:'flex',gap:5,flexWrap:'wrap',width:210,boxShadow:'0 4px 20px rgba(0,0,0,0.5)'}}>
                              {TECHNIQUES.map(t=>(
                                <button key={t.k} onClick={()=>updateSet(ex.id,st.id,'technique',t.k)} style={{padding:'3px 8px',fontSize:10,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:6,border:`1px solid ${t.color}`,background:`${t.color}15`,color:t.color}}>{t.l}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              ))}
              <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                <button onClick={()=>addSet(ex.id)} style={{background:'var(--s3)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 14px',color:'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)'}}>＋ Série</button>
                {[60,90,120,180].map(s=>(
                  <button key={s} onClick={()=>startRest(s)} style={{background:restLeft>0&&restTimer===s?'rgba(34,197,94,.2)':'var(--s3)',border:`1px solid ${restLeft>0&&restTimer===s?'var(--green)':'var(--border)'}`,borderRadius:8,padding:'6px 10px',color:restLeft>0&&restTimer===s?'var(--green)':'var(--text3)',fontSize:11,cursor:'pointer',fontFamily:'var(--fb)'}}>⏱ {s>=60?`${Math.floor(s / 60)}m`:''}{s%60||''}</button>
                ))}
              </div>
            </div>
          </div>
        )
      })}

      {restLeft > 0 && (
        <div style={{background:'rgba(34,197,94,.1)',border:'1px solid var(--green)',borderRadius:12,padding:'12px 16px',marginBottom:12,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <span style={{color:'var(--green)',fontFamily:'var(--fm)',fontSize:18,fontWeight:700}}>⏱ {Math.floor(restLeft / 60)}:{String(restLeft % 60).padStart(2,'0')}</span>
          <button onClick={()=>setRestLeft(0)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:18,cursor:'pointer'}}>×</button>
        </div>
      )}

      <div style={{marginBottom:16}}>
        <div className="ex-search-wrap">
          <span>🔍</span>
          <input className="ex-search-input" value={exSearch} onChange={e=>filterEx(e.target.value)} placeholder="Ajouter un exercice..." />
        </div>
        {/* Favoris — affichés quand la recherche est vide */}
        {!exSearch && (customExercises||[]).filter(e=>e.is_favorite).length > 0 && (
          <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:8}}>
            {(customExercises||[]).filter(e=>e.is_favorite).map(e=>(
              <button key={e.id} onClick={()=>addExercise(e.name)}
                style={{background:'rgba(251,191,36,.12)',border:'1px solid rgba(251,191,36,.3)',borderRadius:20,padding:'5px 12px',color:'#fbbf24',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600}}>
                ⭐ {e.name}
              </button>
            ))}
          </div>
        )}
        {exResults.length > 0 && (
          <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,marginTop:4,overflow:'hidden'}}>
            {exResults.map(n => {
              const isFav = (customExercises||[]).some(e=>normalize(e.name)===normalize(n)&&e.is_favorite)
              return (
                <div key={n} className="ex-result-item" style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingRight:8}}>
                  <span onClick={()=>addExercise(n)} style={{flex:1,padding:'8px 12px',cursor:'pointer'}}>{n}</span>
                  <span onClick={e=>{e.stopPropagation();toggleFavorite(n)}} style={{cursor:'pointer',fontSize:16,opacity:isFav?1:0.3,transition:'opacity .15s'}} title="Favori">⭐</span>
                </div>
              )
            })}
          </div>
        )}
        {exSearch.length > 1 && exResults.length === 0 && (
          <div style={{marginTop:6,padding:'8px 12px',background:'rgba(59,130,246,.08)',border:'1px solid rgba(59,130,246,.2)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <span style={{fontSize:12,color:'var(--text2)'}}>Exercice introuvable</span>
            <button onClick={()=>createAndAddExercise(exSearch)}
              style={{background:'rgba(59,130,246,.2)',border:'1px solid rgba(59,130,246,.4)',borderRadius:8,padding:'5px 12px',color:'#60a5fa',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:700}}>
              ➕ Créer "{exSearch}"
            </button>
          </div>
        )}
      </div>

      {/* ─── BLOC CARDIO OPTIONNEL ─── */}
      <div style={{marginBottom:12}}>
        <button
          onClick={()=>setShowCardio(v=>!v)}
          style={{
            width:'100%', padding:'11px 16px',
            background: showCardio ? 'rgba(249,115,22,0.1)' : 'var(--s2)',
            border: `1.5px solid ${showCardio ? 'var(--orange)' : 'var(--border)'}`,
            borderRadius:12, cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            color: showCardio ? 'var(--orange)' : 'var(--text2)',
            fontSize:13, fontFamily:'var(--fb)', fontWeight:700,
            transition:'all .2s',
          }}>
          <span>🏃 Ajouter du cardio à cette séance</span>
          <span style={{fontSize:16, transition:'transform .2s', transform: showCardio ? 'rotate(180deg)' : 'none'}}>⌄</span>
        </button>

        {showCardio && (
          <div style={{marginTop:10,padding:'14px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,display:'flex',flexDirection:'column',gap:12}}>
            {/* Type */}
            <div>
              <label className="field-label">Type d&apos;activité</label>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                {[{v:'tapis',l:'🏃 Tapis'},{v:'velo',l:'🚴 Vélo'},{v:'rameur',l:'🚣 Rameur'},{v:'elliptique',l:'〰️ Elliptique'},{v:'corde',l:'🪢 Corde'},{v:'autre',l:'⚡ Autre'}].map(t=>(
                  <button key={t.v} onClick={()=>setCardioType(t.v)} style={{padding:'6px 11px',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:8,border:`1px solid ${cardioType===t.v?'var(--orange)':'var(--border)'}`,background:cardioType===t.v?'rgba(249,115,22,0.15)':'var(--s3)',color:cardioType===t.v?'var(--orange)':'var(--text2)',transition:'all .15s'}}>{t.l}</button>
                ))}
              </div>
            </div>

            {/* Durée + Distance */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label className="field-label">Durée (min) *</label>
                <input value={cardioDuration} onChange={e=>setCardioDuration(e.target.value)} placeholder="30" inputMode="numeric" />
              </div>
              {['tapis','velo','rameur','autre'].includes(cardioType) && (
                <div>
                  <label className="field-label">Distance (km)</label>
                  <input value={cardioDistance} onChange={e=>setCardioDistance(e.target.value)} placeholder="5.0" inputMode="decimal" />
                </div>
              )}
            </div>

            {/* Vitesse + Inclinaison (tapis) */}
            {cardioType === 'tapis' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label className="field-label">Vitesse (km/h)</label>
                  <input value={cardioSpeed} onChange={e=>setCardioSpeed(e.target.value)} placeholder="10.0" inputMode="decimal" />
                </div>
                <div>
                  <label className="field-label">Inclinaison (%)</label>
                  <input value={cardioIncline} onChange={e=>setCardioIncline(e.target.value)} placeholder="1.0" inputMode="decimal" />
                </div>
              </div>
            )}

            {/* Résistance (vélo/elliptique) */}
            {['velo','elliptique'].includes(cardioType) && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <div>
                  <label className="field-label">Résistance (1-20)</label>
                  <input value={cardioResistance} onChange={e=>setCardioResistance(e.target.value)} placeholder="10" inputMode="numeric" />
                </div>
                <div>
                  <label className="field-label">Vitesse moy. (km/h)</label>
                  <input value={cardioSpeed} onChange={e=>setCardioSpeed(e.target.value)} placeholder="25" inputMode="decimal" />
                </div>
              </div>
            )}

            {/* FC */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <label className="field-label">FC moy. (bpm)</label>
                <input value={cardioHr} onChange={e=>setCardioHr(e.target.value)} placeholder="145" inputMode="numeric" />
              </div>
              <div>
                <label className="field-label">Calories (optionnel)</label>
                <input value={cardioCalories} onChange={e=>setCardioCalories(e.target.value)} placeholder="auto" inputMode="numeric" />
              </div>
            </div>

            {/* Preview kcal */}
            {cardioDuration && !cardioCalories && (
              <div style={{padding:'9px 13px',background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.25)',borderRadius:10,fontSize:12,color:'var(--orange)',display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontSize:16}}>🔥</span>
                <div>
                  <div style={{fontWeight:700}}>~{estimateCardioKcal() ?? '—'} kcal estimées</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>
                    {cardioHr ? 'Formule FC (Keytel)' : cardioType==='tapis' && (cardioSpeed||cardioDistance||cardioIncline) ? `Formule tapis${cardioIncline?' · incl. '+cardioIncline+'%':''}${cardioSpeed?' · '+cardioSpeed+' km/h':''}` : 'Formule MET standard'}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="field-label">Notes cardio</label>
              <input value={cardioNotes} onChange={e=>setCardioNotes(e.target.value)} placeholder="Interval, zone 2, warmup..." />
            </div>
          </div>
        )}
      </div>

      <div style={{display:'flex',gap:10,marginBottom:12}}>
        <button onClick={()=>setShowPresets(!showPresets)} style={{flex:1,background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12,padding:13,color:'var(--text2)',fontSize:13,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer'}}>📋 Presets</button>
        <button onClick={validateSession} disabled={saving} className="btn-primary" style={{flex:2}}>{saving?'⏳ Enregistrement...':'✅ Valider la séance'}</button>
      </div>

      {showPresets && (
        <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:14,padding:16,marginBottom:12}}>
          <div style={{fontSize:13,fontWeight:700,marginBottom:12,color:'var(--text2)'}}>MES PRESETS</div>
          {presets.length===0 && <div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Aucun preset</div>}
          {/* Ghost flottant qui suit le curseur/doigt */}
          {dragIdx !== null && (
            <div style={{
              position:'fixed',
              left: ghostPos.x - ghostOffset.current.x,
              top: ghostPos.y - ghostOffset.current.y,
              width: document.querySelector('[data-preset-idx]')?.offsetWidth || 280,
              background:'var(--s1)',
              border:'1px solid var(--red)',
              borderRadius:10,
              padding:'10px 12px',
              boxShadow:'0 12px 40px rgba(0,0,0,0.6)',
              pointerEvents:'none',
              zIndex:9999,
              opacity:0.95,
              display:'flex',alignItems:'center',gap:8,
            }}>
              <span style={{color:'var(--text3)',fontSize:18,fontFamily:'monospace'}}>⠿</span>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:'var(--text1)'}}>{ghostLabel}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>{sortedPresets[dragIdx]?.exercises?.length||0} exos</div>
              </div>
            </div>
          )}
          {sortedPresets.map((p,i) => {
            const isBeingDragged = dragIdx === i
            const translate = isBeingDragged ? 0 : getItemTranslate(i)
            return (
            <div key={p.id}
              data-preset-idx={i}
              draggable
              onDragStart={e=>onDragStart(e,i)}
              onDrag={onDrag}
              onDragEnd={onDragEnd}
              onDragOver={e=>e.preventDefault()}
              onTouchStart={e=>onTouchStart(e,i)}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                padding:'8px 0',
                borderBottom:'1px solid var(--border)',
                borderRadius:8,
                willChange:'transform',
                transition: isBeingDragged ? 'opacity 0.1s' : 'transform 0.2s cubic-bezier(0.2,0,0,1)',
                transform: `translateY(${translate}px)`,
                opacity: isBeingDragged ? 0 : 1,
                position:'relative',
                zIndex: 1,
                userSelect:'none',
              }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{color:'var(--text3)',fontSize:20,cursor:'grab',touchAction:'none',padding:'0 6px',lineHeight:1,fontFamily:'monospace'}}>⠿</span>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{p.name}</div>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{(p.exercises||[]).length} exos — {(p.muscle||'').split('+').map(m=>MUSCLE_LABELS[m]||m).join(' + ')}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setSharePresetId(sharePresetId===p.id?null:p.id)} style={{background:'var(--s3)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',color:'var(--text2)',fontSize:11,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer'}}>🔗</button>
                  <button onClick={()=>{loadPreset(p);setEditingPreset(p);setEditPresetName(p.name)}} style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',color:'var(--text2)',fontSize:11,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer'}}>✏️</button>
                  <button onClick={()=>loadPreset(p)} style={{background:'var(--red)',border:'none',borderRadius:8,padding:'5px 12px',color:'white',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer'}}>Charger</button>
                  <button onClick={()=>deletePreset(p.id)} style={{background:'none',border:'1px solid rgba(239,68,68,.2)',borderRadius:8,padding:'5px 10px',color:'var(--red)',fontSize:13,cursor:'pointer'}}>🗑</button>
                </div>
              </div>
              {sharePresetId===p.id&&(
                <div style={{marginTop:8,padding:10,background:'var(--s1)',borderRadius:10,border:'1px solid var(--border)'}}>
                  <div style={{fontSize:11,color:'var(--text3)',marginBottom:6}}>Copie ce code et envoie-le à tes amis :</div>
                  <div style={{display:'flex',gap:6}}>
                    <input readOnly value={getShareCode(p)} style={{flex:1,fontSize:10,padding:'6px 8px',background:'var(--s3)',color:'var(--text2)',borderRadius:6,border:'1px solid var(--border)',fontFamily:'monospace'}}/>
                    <button onClick={()=>{navigator.clipboard.writeText(getShareCode(p));showToast('✅ Code copié !')}} style={{background:'var(--green)',border:'none',borderRadius:8,padding:'6px 10px',color:'white',fontSize:11,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer'}}>Copier</button>
                  </div>
                </div>
              )}
            </div>
          )})
          }
          {/* Import preset */}
          <div style={{marginTop:10,borderTop:'1px solid var(--border)',paddingTop:10}}>
            {!showImport
              ? <button onClick={()=>setShowImport(true)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',padding:0}}>📥 Importer le preset d&apos;un ami</button>
              : <div style={{display:'flex',gap:6}}>
                  <input value={importCode} onChange={e=>setImportCode(e.target.value)} placeholder="Colle le code ici..." style={{flex:1,fontSize:11,padding:'7px 10px',fontFamily:'monospace'}}/>
                  <button onClick={importPreset} disabled={importLoading} style={{background:'var(--blue)',border:'none',borderRadius:8,padding:'7px 12px',color:'white',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer'}}>{importLoading?'⏳':'📥'}</button>
                  <button onClick={()=>{setShowImport(false);setImportCode('')}} style={{background:'var(--s3)',border:'none',borderRadius:8,padding:'7px 10px',color:'var(--text2)',fontSize:12,cursor:'pointer'}}>✕</button>
                </div>
            }
          </div>
          {editingPreset && (
            <div style={{marginTop:10,padding:12,background:'rgba(251,191,36,0.08)',border:'1px solid rgba(251,191,36,0.3)',borderRadius:12}}>
              <div style={{fontSize:11,color:'#fbbf24',fontWeight:700,marginBottom:8}}>✏️ MODE ÉDITION — les exercices chargés seront sauvegardés dans ce preset</div>
              <div style={{display:'flex',gap:8}}>
                <input value={editPresetName} onChange={e=>setEditPresetName(e.target.value)} placeholder={editingPreset.name} style={{flex:1,padding:'8px 12px',fontSize:13,border:'1px solid rgba(251,191,36,0.4)',background:'var(--s1)'}}/>
                <button onClick={()=>updatePreset(editingPreset)} style={{background:'#fbbf24',border:'none',borderRadius:8,padding:'8px 14px',color:'#000',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer'}}>💾 Sauver</button>
                <button onClick={()=>{setEditingPreset(null);setEditPresetName('')}} style={{background:'var(--s3)',border:'none',borderRadius:8,padding:'8px 10px',color:'var(--text2)',fontSize:12,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          )}
          {!editingPreset && exercises.length > 0 && (
            <div style={{marginTop:10,display:'flex',gap:8}}>
              <input value={presetName} onChange={e=>setPresetName(e.target.value)} placeholder="Nom du preset..." style={{flex:1,padding:'8px 12px',fontSize:13}}/>
              <button onClick={savePreset} style={{background:'var(--green)',border:'none',borderRadius:8,padding:'8px 14px',color:'white',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer'}}>Sauver</button>
            </div>
          )}
        </div>
      )}
      </div>
    )}
    </div>
  )

}