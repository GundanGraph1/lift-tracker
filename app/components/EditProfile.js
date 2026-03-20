'use client'
import { useState, useRef } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { THEMES, FONT_PACKS, applyTheme, getThemeFromUser } from '../../lib/themes'
import { BADGES } from '../../lib/constants'
import { showToast } from './Toast'

export default function EditProfile({ onClose, onLogout }) {
  const currentUser = useStore(s => s.currentUser)
  const userBadges = useStore(s => s.userBadges) || []
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
  const [showCrop, setShowCrop] = useState(false)
  const [cropSrc, setCropSrc] = useState(null)
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 })
  const [cropScale, setCropScale] = useState(1)
  const cropCanvasRef = useRef(null)
  const cropImgRef = useRef(null)
  const dragStart = useRef(null)
  const [saving, setSaving] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState(initTheme)
  const [selectedFont, setSelectedFont] = useState(initFont)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pinConfirm, setPinConfirm] = useState('')
  const [featuredBadges, setFeaturedBadges] = useState(currentUser?.featured_badges || [])
  const [pinError, setPinError] = useState('')
  const [isPrivate, setIsPrivate] = useState(currentUser?.is_private || false)
  const [gender, setGender] = useState(currentUser?.gender || 'male')

  const isImg = currentUser?.avatar?.startsWith('http') || currentUser?.avatar?.startsWith('data:')
  const previewAvatar = photo || currentUser?.avatar

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setCropSrc(ev.target.result)
      setCropPos({ x: 0, y: 0 })
      setCropScale(1)
      setShowCrop(true)
    }
    reader.readAsDataURL(file)
  }

  function applyCrop() {
    const canvas = cropCanvasRef.current
    const img = cropImgRef.current
    if (!canvas || !img) return
    const size = 300
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, size, size)
    // Cercle clip
    ctx.beginPath()
    ctx.arc(size/2, size/2, size/2, 0, Math.PI*2)
    ctx.clip()
    // Calculer dimensions
    const displaySize = 220
    const imgRatio = img.naturalWidth / img.naturalHeight
    let dw, dh
    if (imgRatio > 1) { dh = displaySize * cropScale; dw = dh * imgRatio }
    else { dw = displaySize * cropScale; dh = dw / imgRatio }
    const sx = (size/2) - (dw/2) + cropPos.x * (size/displaySize)
    const sy = (size/2) - (dh/2) + cropPos.y * (size/displaySize)
    ctx.drawImage(img, sx, sy, dw, dh)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    setPhoto(dataUrl)
    // Convertir en File
    canvas.toBlob(blob => { if (blob) setPhotoFile(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })) }, 'image/jpeg', 0.92)
    setShowCrop(false)
  }

  function onCropMouseDown(e) {
    dragStart.current = { mx: e.clientX, my: e.clientY, px: cropPos.x, py: cropPos.y }
  }
  function onCropMouseMove(e) {
    if (!dragStart.current) return
    setCropPos({ x: dragStart.current.px + e.clientX - dragStart.current.mx, y: dragStart.current.py + e.clientY - dragStart.current.my })
  }
  function onCropMouseUp() { dragStart.current = null }
  function onCropTouchStart(e) {
    const t = e.touches[0]
    dragStart.current = { mx: t.clientX, my: t.clientY, px: cropPos.x, py: cropPos.y }
  }
  function onCropTouchMove(e) {
    if (!dragStart.current) return
    const t = e.touches[0]
    setCropPos({ x: dragStart.current.px + t.clientX - dragStart.current.mx, y: dragStart.current.py + t.clientY - dragStart.current.my })
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
      featured_badges: featuredBadges.length ? featuredBadges : null,
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
    if (!confirmDelete) { setConfirmDelete(true); setPinConfirm(''); setPinError(''); return }
    // Vérifier le PIN avant suppression
    if (pinConfirm !== String(currentUser.pin)) { setPinError('Code PIN incorrect'); return }
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
          <div className="modal-title" style={{ marginBottom: 0, display:'flex', alignItems:'center', gap:8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            MON PROFIL
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '14px 20px 0' }}>
          {[{ k: 'profil', l: 'Profil' }, { k: 'theme', l: 'Thème' }].map(t => (
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
                  <div style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}></div>
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
                  {[{val:'male',label:'♂ Homme'},{val:'female',label:'♀ Femme'}].map(g=>(
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
                      {v:'sedentary',   l:'🪑 Bureau / étudiant',    desc:'Assis la majorité du temps'},
                      {v:'light',       l:'🚶 Debout régulièrement', desc:'Vendeur, prof, déplacements fréquents'},
                      {v:'active',      l:'⚡ Journée active',        desc:'Livraison, restauration, toujours en mouvement'},
                      {v:'very_active', l:'🔥 Travail physique',      desc:'Chantier, maçon, déménagement...'},
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


              {/* Badges mis en avant */}
              {userBadges.length > 0 && (
                <div>
                  <label className="field-label" style={{fontSize:10}}>Badges affichés sur ton profil <span style={{color:'var(--text3)',fontWeight:400}}>(max 5)</span></label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                    {userBadges.map(b=>{
                      const badge = BADGES[b.badge_key]
                      if (!badge) return null
                      const isSelected = featuredBadges.includes(b.badge_key)
                      return (
                        <div key={b.badge_key} onClick={()=>{
                          if (isSelected) setFeaturedBadges(f=>f.filter(k=>k!==b.badge_key))
                          else if (featuredBadges.length < 5) setFeaturedBadges(f=>[...f,b.badge_key])
                        }} style={{
                          display:'flex',alignItems:'center',gap:6,padding:'6px 10px',
                          borderRadius:10,cursor:'pointer',transition:'all .15s',
                          background:isSelected?`${badge.color}18`:'var(--s3)',
                          border:`1.5px solid ${isSelected?badge.color:'var(--border)'}`,
                          opacity: !isSelected && featuredBadges.length>=3 ? 0.35 : 1,
                        }}>
                          <span style={{fontSize:16}}>{badge.icon}</span>
                          <span style={{fontSize:11,fontWeight:600,color:isSelected?badge.color:'var(--text2)',fontFamily:'var(--fb)'}}>{badge.name}</span>
                          {isSelected && <span style={{fontSize:9,color:badge.color,fontWeight:700}}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                  {featuredBadges.length === 0 && (
                    <div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>Aucun badge affiché — sélectionnes-en jusqu&apos;à 5</div>
                  )}
                </div>
              )}

              {/* Mode privé */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'var(--s2)',border:'1px solid var(--border)',borderRadius:12}}>
                <div>
                  <div style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>Mode privé</div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>Ne pas apparaître dans le feed et le leaderboard</div>
                </div>
                <div onClick={()=>setIsPrivate(p=>!p)} style={{width:44,height:24,borderRadius:12,background:isPrivate?'var(--purple)':'var(--s3)',border:'1px solid var(--border)',cursor:'pointer',position:'relative',transition:'all .2s',flexShrink:0}}>
                  <div style={{position:'absolute',top:3,left:isPrivate?22:3,width:16,height:16,borderRadius:'50%',background:'white',transition:'all .2s',boxShadow:'0 1px 3px rgba(0,0,0,0.2)'}}/>
                </div>
              </div>

              <button className="btn-primary" onClick={save} disabled={saving} style={{ marginTop: 4 }}>
                {saving ? '⏳ Sauvegarde...' : '💾 Enregistrer'}
              </button>

              {/* Déconnexion */}
              <button onClick={onLogout} style={{width:'100%',padding:'11px',borderRadius:12,cursor:'pointer',background:'var(--s3)',border:'1px solid var(--border)',color:'var(--text2)',fontFamily:'var(--fb)',fontWeight:700,fontSize:13,transition:'all .2s'}}>
                Se déconnecter
              </button>

              {/* Suppression */}
              <div style={{borderTop:'1px solid var(--border)',paddingTop:12,marginTop:4}}>
                {!confirmDelete ? (
                  <button onClick={deleteProfile} style={{width:'100%',padding:'11px',borderRadius:12,cursor:'pointer',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',color:'var(--red)',fontFamily:'var(--fb)',fontWeight:700,fontSize:13,transition:'all .2s'}}>
                    Supprimer le profil
                  </button>
                ) : (
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div style={{fontSize:12,color:'var(--red)',fontWeight:700,textAlign:'center'}}>Confirme ton PIN pour supprimer</div>
                    <input type="password" inputMode="numeric" maxLength={4} value={pinConfirm} onChange={e=>{setPinConfirm(e.target.value.replace(/\D/g,'').slice(0,4));setPinError('')}} placeholder="••••" style={{textAlign:'center',fontSize:20,letterSpacing:8,padding:'10px',borderColor:pinError?'var(--red)':'var(--border)'}}/>
                    {pinError && <div style={{fontSize:11,color:'var(--red)',textAlign:'center'}}>{pinError}</div>}
                    <div style={{fontSize:11,color:'var(--text3)',textAlign:'center'}}>Action irréversible — toutes tes données seront supprimées</div>
                    <div style={{display:'flex',gap:8}}>
                      <button onClick={()=>{setConfirmDelete(false);setPinConfirm('');setPinError('')}} style={{flex:1,padding:'10px',borderRadius:10,cursor:'pointer',background:'var(--s3)',border:'1px solid var(--border)',color:'var(--text2)',fontFamily:'var(--fb)',fontWeight:700,fontSize:13}}>Annuler</button>
                      <button onClick={deleteProfile} style={{flex:1,padding:'10px',borderRadius:10,cursor:'pointer',background:'var(--red)',border:'none',color:'white',fontFamily:'var(--fb)',fontWeight:700,fontSize:13}}>Supprimer</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ── THEME TAB ── */}
          {tab === 'theme' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Aperçu thème */}
              <div style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--fm)', fontSize: 22, fontWeight: 800, color: 'var(--red)', marginBottom: 2, letterSpacing: 3 }}>GRINDSET</div>
                <div style={{ fontFamily: 'var(--fb)', fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>Aperçu du thème</div>
                <div style={{ display: 'flex', gap: 5, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                  <div style={{ background: 'var(--s3)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: 'var(--fb)', color: 'var(--text2)' }}>Sédentaire</div>
                  <div style={{ background: 'var(--red)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: 'var(--fb)', color: 'white' }}>Actif</div>
                  <div style={{ background: 'var(--s3)', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontFamily: 'var(--fb)', color: 'var(--text2)' }}>Très actif</div>
                </div>
              </div>

              {/* Thèmes standard */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 12 }}>Couleur d&apos;accent</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {THEMES.filter(t => !t.premium).map(t => (
                    <div key={t.key} onClick={() => selectTheme(t.key)} style={{
                      border: `2px solid ${selectedTheme === t.key ? t.preview : 'transparent'}`,
                      borderRadius: 12, padding: '10px 6px', cursor: 'pointer', background: 'var(--s2)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, transition: 'all .15s',
                    }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: t.preview, boxShadow: selectedTheme === t.key ? `0 0 0 3px ${t.preview}40` : 'none' }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: selectedTheme === t.key ? t.preview : 'var(--text3)' }}>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thèmes premium */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 4 }}>
                  Thèmes premium
                </div>
                <div style={{ fontSize: 10, color: 'var(--text3)', marginBottom: 12, opacity: 0.7 }}>Fond personnalisé + effets lumineux</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {THEMES.filter(t => t.premium).map(t => (
                    <div key={t.key} onClick={() => selectTheme(t.key)} style={{
                      border: `2px solid ${selectedTheme === t.key ? t.preview : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '12px 6px', cursor: 'pointer',
                      background: selectedTheme === t.key ? `${t.preview}12` : 'var(--s2)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                      transition: 'all .2s',
                      boxShadow: selectedTheme === t.key ? `0 0 12px ${t.preview}30` : 'none',
                    }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%', background: t.preview,
                        boxShadow: selectedTheme === t.key ? `0 0 10px ${t.preview}60, 0 0 20px ${t.preview}30` : `0 0 6px ${t.preview}40`,
                      }} />
                      <span style={{ fontSize: 9, fontWeight: 700, color: selectedTheme === t.key ? t.preview : 'var(--text2)', textAlign: 'center' }}>{t.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fonts */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--text3)', textTransform: 'uppercase', marginBottom: 10 }}>Police</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {FONT_PACKS.map(f => (
                    <div key={f.key} onClick={() => selectFont(f.key)} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      background: selectedFont === f.key ? `${currentThemeObj.preview}15` : 'var(--s2)',
                      border: `1px solid ${selectedFont === f.key ? 'var(--red)' : 'var(--border)'}`,
                      transition: 'all .15s',
                    }}>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: selectedFont === f.key ? 'var(--red)' : 'var(--text)', fontFamily: f.fm }}>{f.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text3)' }}>{f.sub}</div>
                      </div>
                      {selectedFont === f.key && <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white' }}>✓</div>}
                    </div>
                  ))}
                </div>
              </div>

              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? '⏳ Sauvegarde...' : '💾 Appliquer'}
              </button>

            </div>
          )}

        </div>
      </div>

      {/* Modale recadrage photo */}
      {showCrop && cropSrc && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:400,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:'white',fontFamily:'var(--fm)',letterSpacing:1}}>RECADRER LA PHOTO</div>

          {/* Zone de crop */}
          <div style={{position:'relative',width:220,height:220,borderRadius:'50%',overflow:'hidden',border:'3px solid var(--red)',cursor:'grab',background:'#111',flexShrink:0}}
            onMouseDown={onCropMouseDown} onMouseMove={onCropMouseMove} onMouseUp={onCropMouseUp} onMouseLeave={onCropMouseUp}
            onTouchStart={onCropTouchStart} onTouchMove={onCropTouchMove} onTouchEnd={onCropMouseUp}
          >
            <img ref={cropImgRef} src={cropSrc} alt="" draggable={false}
              onLoad={()=>{ setCropScale(1); setCropPos({x:0,y:0}) }}
              style={{
                position:'absolute',
                width: cropImgRef.current && cropImgRef.current.naturalWidth > cropImgRef.current.naturalHeight ? 'auto' : `${220 * cropScale}px`,
                height: cropImgRef.current && cropImgRef.current.naturalWidth > cropImgRef.current.naturalHeight ? `${220 * cropScale}px` : 'auto',
                left: `calc(50% + ${cropPos.x}px)`,
                top: `calc(50% + ${cropPos.y}px)`,
                transform:'translate(-50%, -50%)',
                userSelect:'none', pointerEvents:'none',
              }}
            />
          </div>

          <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',textAlign:'center'}}>Glisse pour repositionner</div>

          {/* Zoom */}
          <div style={{display:'flex',alignItems:'center',gap:10,width:220}}>
            <span style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>−</span>
            <input type="range" min="0.5" max="3" step="0.05" value={cropScale} onChange={e=>setCropScale(parseFloat(e.target.value))} style={{flex:1,accentColor:'var(--red)'}}/>
            <span style={{color:'rgba(255,255,255,0.5)',fontSize:12}}>+</span>
          </div>

          {/* Canvas caché pour générer l'image finale */}
          <canvas ref={cropCanvasRef} style={{display:'none'}}/>

          <div style={{display:'flex',gap:10,width:220}}>
            <button onClick={()=>setShowCrop(false)} style={{flex:1,padding:'11px',borderRadius:10,background:'var(--s3)',border:'1px solid var(--border)',color:'var(--text2)',fontFamily:'var(--fb)',fontWeight:700,fontSize:13,cursor:'pointer'}}>Annuler</button>
            <button onClick={applyCrop} style={{flex:2,padding:'11px',borderRadius:10,background:'var(--red)',border:'none',color:'white',fontFamily:'var(--fm)',fontWeight:800,fontSize:13,cursor:'pointer',letterSpacing:1}}>✓ VALIDER</button>
          </div>
        </div>
      )}
    </div>
  )
}
