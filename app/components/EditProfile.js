'use client'
import { useState } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { THEMES, FONT_PACKS, applyTheme, getThemeFromUser } from '../../lib/themes'
import { showToast } from './Toast'

export default function EditProfile({ onClose }) {
  const currentUser = useStore(s => s.currentUser)
  const { themeKey: initTheme, fontKey: initFont } = getThemeFromUser(currentUser)

  const [tab, setTab] = useState('profil') // 'profil' | 'theme'
  const [weightKg, setWeightKg] = useState(currentUser?.weight_kg?.toString() || '')
  const [heightCm, setHeightCm] = useState(currentUser?.height_cm?.toString() || '')
  const [birthYear, setBirthYear] = useState(currentUser?.birth_year?.toString() || '')
  const [goal, setGoal] = useState(currentUser?.goal || 'maintain')
  const [activityLevel, setActivityLevel] = useState(currentUser?.activity_level || 'moderate')
  const [dailySteps, setDailySteps] = useState(currentUser?.daily_steps_avg?.toString() || '8000')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(currentUser?.sessions_per_week?.toString() || '3')
  const [username, setUsername] = useState(currentUser?.username || '')
  const [pin, setPin] = useState('')
  const [photo, setPhoto] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(initTheme)
  const [selectedFont, setSelectedFont] = useState(initFont)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isPrivate, setIsPrivate] = useState(currentUser?.is_private || false)
  const [gender, setGender] = useState(currentUser?.gender || 'male')

  const isImg = currentUser?.avatar?.startsWith('http') || currentUser?.avatar?.startsWith('data:')
  const previewAvatar = photo || currentUser?.avatar

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  function selectTheme(tk) {
    setSelectedTheme(tk)
    applyTheme(tk, selectedFont)
  }

  function selectFont(fk) {
    setSelectedFont(fk)
    applyTheme(selectedTheme, fk)
  }

  async function save() {
    if (!username.trim()) { showToast('Le pseudo ne peut pas être vide', 'var(--orange)'); return }
    if (pin && (pin.length !== 4 || !/^\d{4}$/.test(pin))) { showToast('Le PIN doit faire 4 chiffres', 'var(--orange)'); return }
    setSaving(true)

    let avatarUrl = currentUser.avatar
    if (photoFile) {
      const fname = `${currentUser.id}_${Date.now()}`
      const { error: upErr } = await db.storage.from('avatars').upload(fname, photoFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = db.storage.from('avatars').getPublicUrl(fname)
        avatarUrl = urlData.publicUrl
      }
    }

    const themeData = JSON.stringify({ themeKey: selectedTheme, fontKey: selectedFont })
    const updates = { username: username.trim(), avatar: avatarUrl, theme: themeData, is_private: isPrivate, gender,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseInt(heightCm) : null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      goal, activity_level: activityLevel,
      daily_steps_avg: dailySteps ? parseInt(dailySteps) : null,
      sessions_per_week: sessionsPerWeek ? parseInt(sessionsPerWeek) : null,
    }
    if (pin) updates.pin = pin

    const { error } = await db.from('users').update(updates).eq('id', currentUser.id)
    if (error) { showToast('Erreur lors de la sauvegarde', 'var(--red)'); setSaving(false); return }

    applyTheme(selectedTheme, selectedFont)
    actions.setCurrentUser({ ...currentUser, ...updates })
    showToast('✅ Profil mis à jour !')
    setSaving(false)
    onClose()
  }

  async function deleteProfile() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    await db.from('sessions').delete().eq('user_id', currentUser.id)
    await db.from('prs').delete().eq('user_id', currentUser.id)
    await db.from('badges').delete().eq('user_id', currentUser.id)
    await db.from('presets').delete().eq('user_id', currentUser.id)
    await db.from('users').delete().eq('id', currentUser.id)
    localStorage.removeItem('lt_user_id')
    localStorage.removeItem('lt_page')
    applyTheme('red', 'barlow')
    actions.setCurrentUser(null)
  }

  const currentThemeObj = THEMES.find(t => t.key === selectedTheme) || THEMES[0]
  const currentFontObj = FONT_PACKS.find(f => f.key === selectedFont) || FONT_PACKS[0]

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxHeight: '88vh', overflowY: 'auto', padding: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 0' }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>⚙️ MON PROFIL</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0' }}>
          {[{ k: 'profil', l: '👤 Profil' }, { k: 'theme', l: '🎨 Thème' }].map(t => (
            <button key={t.k} onClick={() => setTab(t.k)} style={{
              flex: 1, padding: '8px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: tab === t.k ? 'var(--red)' : 'var(--s3)',
              color: tab === t.k ? 'white' : 'var(--text2)',
              fontFamily: 'var(--fb)', fontWeight: 700, fontSize: 13, transition: 'all .15s'
            }}>{t.l}</button>
          ))}
        </div>

        <div style={{ padding: '16px 20px 20px' }}>

          {/* ── PROFIL TAB ── */}
          {tab === 'profil' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <label htmlFor="photo-input" style={{ cursor: 'pointer', position: 'relative' }}>
                  <div style={{ width: 82, height: 82, borderRadius: '50%', overflow: 'hidden', border: '3px solid var(--border2)', background: 'var(--s3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34 }}>
                    {photo || isImg
                      ? <img src={previewAvatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span>{currentUser?.avatar || '💪'}</span>
                    }
                  </div>
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>✏️</div>
                </label>
                <input id="photo-input" type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
                <span style={{ fontSize: 11, color: 'var(--text3)' }}>Appuie sur la photo pour changer</span>
              </div>

              {/* Username */}
              <div>
                <label className="field-label">Pseudo</label>
                <input value={username} onChange={e => setUsername(e.target.value)} placeholder="Ton pseudo" maxLength={20} />
              </div>

              {/* Genre */}
              <div>
                <label className="field-label">Genre</label>
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  {[{val:'male',label:'👨 Homme'},{val:'female',label:'👩 Femme'},{val:'other',label:'🧑 Autre'}].map(g=>(
                    <button key={g.val} onClick={()=>setGender(g.val)} style={{flex:1,padding:'8px 6px',borderRadius:10,border:`1px solid ${gender===g.val?'var(--red)':'var(--border)'}`,background:gender===g.val?'rgba(255,60,60,0.1)':'var(--s2)',color:gender===g.val?'var(--red)':'var(--text2)',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',transition:'all .15s'}}>{g.label}</button>
                  ))}
                </div>
                <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Utilisé pour les paliers de badges adaptés</div>
              </div>

              {/* PIN */}
              <div>
                <label className="field-label">Nouveau PIN (laisser vide = pas de changement)</label>
                <input
                  type="password" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g,'').slice(0,4))}
                  placeholder="4 chiffres" inputMode="numeric" maxLength={4}
                />
              </div>

              {/* Profil physique */}
              <div style={{padding:'14px',background:'var(--s2)',borderRadius:12,border:'1px solid var(--border)',display:'flex',flexDirection:'column',gap:12}}>
                <div style={{fontSize:12,color:'var(--text2)',fontWeight:700,letterSpacing:1}}>📏 PROFIL PHYSIQUE</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                  <div>
                    <label className="field-label" style={{fontSize:10}}>Poids (kg)</label>
                    <input value={weightKg} onChange={e=>setWeightKg(e.target.value)} placeholder="75" inputMode="decimal" style={{textAlign:'center'}}/>
                  </div>
                  <div>
                    <label className="field-label" style={{fontSize:10}}>Taille (cm)</label>
                    <input value={heightCm} onChange={e=>setHeightCm(e.target.value)} placeholder="175" inputMode="numeric" style={{textAlign:'center'}}/>
                  </div>
                  <div>
                    <label className="field-label" style={{fontSize:10}}>Année naiss.</label>
                    <input value={birthYear} onChange={e=>setBirthYear(e.target.value)} placeholder="1998" inputMode="numeric" maxLength={4} style={{textAlign:'center'}}/>
                  </div>
                </div>
                <div>
                  <label className="field-label" style={{fontSize:10}}>Objectif</label>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[{v:'bulk',l:'💪 Prise de masse'},{v:'cut',l:'🔥 Sèche'},{v:'recomp',l:'⚖️ Recompo'},{v:'maintain',l:'🎯 Maintien'}].map(g=>(
                      <button key={g.v} onClick={()=>setGoal(g.v)} style={{flex:'1 1 40%',padding:'6px 4px',fontSize:11,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:8,border:`1px solid ${goal===g.v?'var(--red)':'var(--border)'}`,background:goal===g.v?'var(--red)':'var(--s3)',color:goal===g.v?'white':'var(--text2)',transition:'all .15s'}}>{g.l}</button>
                    ))}
                  </div>
                </div>
                {/* ── CRITÈRE 1 : Journée type ── */}
                <div>
                  <label className="field-label" style={{fontSize:10}}>Journée type (hors sport)</label>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {[
                      {v:'sedentary', l:'🪑 Bureau / étudiant',    desc:'Assis la majorité du temps'},
                      {v:'light',     l:'🚶 Debout régulièrement', desc:'Vendeur, prof, déplacements fréquents'},
                      {v:'active',    l:'⚡ Journée active',        desc:'Livraison, restauration, toujours en mouvement'},
                      {v:'intense',   l:'🔥 Travail physique',      desc:'Chantier, maçon, déménagement...'},
                    ].map(a=>(
                      <button key={a.v} onClick={()=>setActivityLevel(a.v)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'7px 10px',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:8,border:`1px solid ${activityLevel===a.v?'var(--red)':'var(--border)'}`,background:activityLevel===a.v?'var(--s1)':'var(--s3)',color:activityLevel===a.v?'var(--red)':'var(--text2)',transition:'all .15s',textAlign:'left'}}>
                        <span>{a.l}</span>
                        <span style={{fontSize:10,opacity:0.6,fontWeight:400}}>{a.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── CRITÈRE 2 : Pas par jour ── */}
                <div>
                  <label className="field-label" style={{fontSize:10}}>Pas moyens par jour</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                    {[
                      {v:'3000', l:'< 5k',   desc:'< 5 000'},
                      {v:'7500', l:'5-10k',  desc:'5 000 – 10 000'},
                      {v:'12500',l:'10-15k', desc:'10 000 – 15 000'},
                      {v:'17500',l:'15-20k', desc:'15 000 – 20 000'},
                      {v:'22000',l:'> 20k',  desc:'> 20 000'},
                    ].map(s=>(
                      <button key={s.v} onClick={()=>setDailySteps(s.v)} style={{flex:'1 1 18%',padding:'8px 4px',fontSize:11,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:8,border:`1px solid ${dailySteps===s.v?'var(--red)':'var(--border)'}`,background:dailySteps===s.v?'var(--red)':'var(--s3)',color:dailySteps===s.v?'white':'var(--text2)',transition:'all .15s',textAlign:'center'}}>
                        <div>{s.l}</div>
                        <div style={{fontSize:9,fontWeight:400,opacity:0.7,marginTop:2}}>{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── CRITÈRE 3 : Séances par semaine ── */}
                <div>
                  <label className="field-label" style={{fontSize:10}}>Séances de sport / semaine</label>
                  <div style={{display:'flex',gap:6}}>
                    {[
                      {v:'0', l:'0'},
                      {v:'1', l:'1-2'},
                      {v:'3', l:'3-4'},
                      {v:'5', l:'5-6'},
                      {v:'7', l:'6+'},
                    ].map(s=>(
                      <button key={s.v} onClick={()=>setSessionsPerWeek(s.v)} style={{flex:1,padding:'8px 4px',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:8,border:`1px solid ${sessionsPerWeek===s.v?'var(--red)':'var(--border)'}`,background:sessionsPerWeek===s.v?'var(--red)':'var(--s3)',color:sessionsPerWeek===s.v?'white':'var(--text2)',transition:'all .15s'}}>
                        {s.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>


              <button className="btn-primary" onClick={save} disabled={saving} style={{ marginTop: 4 }}>