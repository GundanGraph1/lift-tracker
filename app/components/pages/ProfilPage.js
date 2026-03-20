'use client'
import { useState } from 'react'
import { db } from '../../../lib/supabase'
import { useStore, actions } from '../../../lib/store'
import { THEMES, FONT_PACKS, applyTheme, getThemeFromUser } from '../../../lib/themes'
import { BADGES } from '../../../lib/constants'
import { showToast } from '../Toast'
import SantePage from './SantePage'

export default function ProfilPage({ onLogout }) {
  const currentUser = useStore(s => s.currentUser)
  const userBadges = useStore(s => s.userBadges) || []
  const { themeKey: initTheme, fontKey: initFont } = getThemeFromUser(currentUser)

  const [tab, setTab] = useState('profil') // 'profil' | 'sante' | 'badges' | 'theme'

  // Profil states
  const [weightKg, setWeightKg] = useState(currentUser?.weight_kg?.toString() || '')
  const [heightCm, setHeightCm] = useState(currentUser?.height_cm?.toString() || '')
  const [birthYear, setBirthYear] = useState(currentUser?.birth_year?.toString() || '')
  const [goal, setGoal] = useState(currentUser?.goal || 'maintain')
  const [activityLevel, setActivityLevel] = useState(currentUser?.activity_level || 'moderate')
  const [dailySteps, setDailySteps] = useState(currentUser?.daily_steps_avg?.toString() || '7500')
  const [sessionsPerWeek, setSessionsPerWeek] = useState(currentUser?.sessions_per_week?.toString() || '3')
  const [username, setUsername] = useState(currentUser?.username || '')
  const [pin, setPin] = useState('')
  const [gender, setGender] = useState(currentUser?.gender || 'male')
  const [isPrivate, setIsPrivate] = useState(currentUser?.is_private || false)
  const [featuredBadges, setFeaturedBadges] = useState(currentUser?.featured_badges || [])
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [pinConfirm, setPinConfirm] = useState('')
  const [pinError, setPinError] = useState('')

  // Theme states
  const [selectedTheme, setSelectedTheme] = useState(initTheme)
  const [selectedFont, setSelectedFont] = useState(initFont)

  const isImg = currentUser?.avatar?.startsWith('http') || currentUser?.avatar?.startsWith('data:')
  const currentThemeObj = THEMES.find(t => t.key === selectedTheme) || THEMES[0]

  function selectTheme(tk) { setSelectedTheme(tk); applyTheme(tk, selectedFont) }
  function selectFont(fk) { setSelectedFont(fk); applyTheme(selectedTheme, fk) }

  async function save() {
    setSaving(true)
    const themeData = JSON.stringify({ themeKey: selectedTheme, fontKey: selectedFont })
    const updates = {
      username: username.trim(),
      theme: themeData,
      is_private: isPrivate,
      gender,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      height_cm: heightCm ? parseInt(heightCm) : null,
      birth_year: birthYear ? parseInt(birthYear) : null,
      goal,
      activity_level: activityLevel,
      daily_steps_avg: dailySteps ? parseInt(dailySteps) : null,
      sessions_per_week: sessionsPerWeek ? parseInt(sessionsPerWeek) : null,
      featured_badges: featuredBadges.length ? featuredBadges : null,
    }
    if (pin) updates.pin = pin
    const { error } = await db.from('users').update(updates).eq('id', currentUser.id)
    setSaving(false)
    if (error) { showToast('Erreur lors de la sauvegarde', 'var(--red)'); return }
    applyTheme(selectedTheme, selectedFont)
    actions.setCurrentUser({ ...currentUser, ...updates })
    showToast('✅ Profil mis à jour !')
  }

  async function deleteProfile() {
    if (!confirmDelete) { setConfirmDelete(true); setPinConfirm(''); setPinError(''); return }
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

  const TABS = [
    { k: 'profil', l: 'Profil' },
    { k: 'sante',  l: 'Santé' },
    { k: 'badges', l: 'Badges' },
    { k: 'theme',  l: 'Thème' },
  ]

  return (
    <div>
      {/* Header profil */}
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:20,paddingBottom:20,borderBottom:'1px solid var(--border)'}}>
        <div style={{width:64,height:64,borderRadius:'50%',border:'2px solid var(--border2)',overflow:'hidden',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          {isImg
            ? <img src={currentUser.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
            : <span style={{fontSize:28}}>{currentUser?.avatar||'💪'}</span>
          }
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:'var(--fm)',fontSize:24,fontWeight:800,letterSpacing:1,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{currentUser?.username}</div>
          <div style={{fontSize:12,color:'var(--text3)',marginTop:2}}>
            {currentUser?.gender==='female'?'♀':currentUser?.gender==='other'?'·':'♂'}
            {currentUser?.birth_year ? ` · ${new Date().getFullYear()-currentUser.birth_year} ans` : ''}
            {currentUser?.goal ? ` · ${({bulk:'💪 Prise',cut:'🔥 Sèche',recomp:'⚖️ Recompo',maintain:'🎯 Maintien'})[currentUser.goal]||''}` : ''}
          </div>
          {/* Badges mis en avant */}
          {featuredBadges.length > 0 && (
            <div style={{display:'flex',gap:4,marginTop:6,flexWrap:'wrap'}}>
              {featuredBadges.map(k=>{
                const b=BADGES[k]; if(!b) return null
                return <span key={k} title={b.name} style={{fontSize:18,lineHeight:1}}>{b.icon}</span>
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',background:'var(--s2)',borderRadius:12,padding:3,gap:2,marginBottom:20}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            flex:1,padding:'8px 4px',borderRadius:9,border:'none',cursor:'pointer',
            background:tab===t.k?'var(--s1)':'transparent',
            color:tab===t.k?'var(--text)':'var(--text3)',
            fontFamily:'var(--fb)',fontWeight:700,fontSize:12,
            transition:'all .15s',
            boxShadow:tab===t.k?'0 1px 4px rgba(0,0,0,0.3)':'none',
          }}>{t.l}</button>
        ))}
      </div>

      {/* ── ONGLET PROFIL ── */}
      {tab === 'profil' && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>

          {/* Infos de base */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{gridColumn:'1/-1'}}>
              <label className="field-label">Pseudo</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Pseudo" maxLength={20}/>
            </div>
            <div>
              <label className="field-label">Poids (kg)</label>
              <input type="number" value={weightKg} onChange={e=>setWeightKg(e.target.value)} placeholder="75" min="0" step="0.5" inputMode="decimal"/>
            </div>
            <div>
              <label className="field-label">Taille (cm)</label>
              <input type="number" value={heightCm} onChange={e=>setHeightCm(e.target.value)} placeholder="175" min="0" inputMode="numeric"/>
            </div>
            <div>
              <label className="field-label">Année naiss.</label>
              <input type="number" value={birthYear} onChange={e=>setBirthYear(e.target.value)} placeholder="2000" min="1950" max="2010" inputMode="numeric"/>
            </div>
            <div>
              <label className="field-label">Nouveau PIN</label>
              <input type="password" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="••••" inputMode="numeric" maxLength={4}/>
            </div>
          </div>

          {/* Genre */}
          <div>
            <label className="field-label">Genre</label>
            <div style={{display:'flex',gap:8}}>
              {[{v:'male',l:'♂ Homme'},{v:'female',l:'♀ Femme'},{v:'other',l:'· Autre'}].map(g=>(
                <button key={g.v} onClick={()=>setGender(g.v)} style={{flex:1,padding:'8px 6px',fontSize:13,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:10,border:`1px solid ${gender===g.v?'var(--red)':'var(--border)'}`,background:gender===g.v?'var(--red)':'var(--s3)',color:gender===g.v?'white':'var(--text2)',transition:'all .15s'}}>{g.l}</button>
              ))}
            </div>
          </div>

          {/* Objectif */}
          <div>
            <label className="field-label">Objectif</label>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {[{v:'bulk',l:'💪 Prise de masse'},{v:'cut',l:'🔥 Sèche'},{v:'recomp',l:'⚖️ Recompo'},{v:'maintain',l:'🎯 Maintien'}].map(g=>(
                <button key={g.v} onClick={()=>setGoal(g.v)} style={{flex:'1 1 40%',padding:'8px 6px',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:10,border:`1px solid ${goal===g.v?'var(--red)':'var(--border)'}`,background:goal===g.v?'var(--red)':'var(--s3)',color:goal===g.v?'white':'var(--text2)',transition:'all .15s'}}>{g.l}</button>
              ))}
            </div>
          </div>

          {/* Activité */}
          <div>
            <label className="field-label">Journée type</label>
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              {[
                {v:'sedentary',   l:'🪑 Bureau / étudiant',    desc:'Assis la majorité du temps'},
                {v:'light',       l:'🚶 Debout régulièrement', desc:'Vendeur, prof, déplacements'},
                {v:'active',      l:'⚡ Journée active',        desc:'Livraison, restauration'},
                {v:'very_active', l:'🔥 Travail physique',      desc:'Chantier, maçon...'},
              ].map(a=>(
                <button key={a.v} onClick={()=>setActivityLevel(a.v)} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:10,border:`1px solid ${activityLevel===a.v?'var(--red)':'var(--border)'}`,background:activityLevel===a.v?'var(--s1)':'var(--s3)',color:activityLevel===a.v?'var(--red)':'var(--text2)',transition:'all .15s',textAlign:'left'}}>
                  <span>{a.l}</span>
                  <span style={{fontSize:10,opacity:0.5,fontWeight:400}}>{a.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Pas/jour */}
          <div>
            <label className="field-label">Pas moyens / jour</label>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {[{v:'3000',l:'< 5k'},{v:'7500',l:'5-10k'},{v:'12500',l:'10-15k'},{v:'17500',l:'15-20k'},{v:'22000',l:'> 20k'}].map(s=>(
                <button key={s.v} onClick={()=>setDailySteps(s.v)} style={{flex:'1 1 18%',padding:'8px 4px',fontSize:11,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:8,border:`1px solid ${dailySteps===s.v?'var(--red)':'var(--border)'}`,background:dailySteps===s.v?'var(--red)':'var(--s3)',color:dailySteps===s.v?'white':'var(--text2)',transition:'all .15s',textAlign:'center'}}>{s.l}</button>
              ))}
            </div>
          </div>

          {/* Séances/sem */}
          <div>
            <label className="field-label">Séances de sport / semaine</label>
            <div style={{display:'flex',gap:6}}>
              {[{v:'0',l:'0'},{v:'1',l:'1-2'},{v:'3',l:'3-4'},{v:'5',l:'5-6'},{v:'7',l:'7+'}].map(s=>(
                <button key={s.v} onClick={()=>setSessionsPerWeek(s.v)} style={{flex:1,padding:'8px 4px',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:8,border:`1px solid ${sessionsPerWeek===s.v?'var(--red)':'var(--border)'}`,background:sessionsPerWeek===s.v?'var(--red)':'var(--s3)',color:sessionsPerWeek===s.v?'white':'var(--text2)',transition:'all .15s'}}>{s.l}</button>
              ))}
            </div>
          </div>

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

          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? '⏳ Sauvegarde...' : '💾 Enregistrer'}
          </button>

          <button onClick={onLogout} style={{width:'100%',padding:'11px',borderRadius:12,cursor:'pointer',background:'var(--s3)',border:'1px solid var(--border)',color:'var(--text2)',fontFamily:'var(--fb)',fontWeight:700,fontSize:13}}>
            Se déconnecter
          </button>

          <div style={{borderTop:'1px solid var(--border)',paddingTop:12}}>
            {!confirmDelete ? (
              <button onClick={deleteProfile} style={{width:'100%',padding:'11px',borderRadius:12,cursor:'pointer',background:'rgba(239,68,68,.08)',border:'1px solid rgba(239,68,68,.25)',color:'var(--red)',fontFamily:'var(--fb)',fontWeight:700,fontSize:13}}>
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

      {/* ── ONGLET SANTÉ ── */}
      {tab === 'sante' && <SantePage embedded />}

      {/* ── ONGLET BADGES ── */}
      {tab === 'badges' && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {userBadges.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🏅</div>
              <div className="empty-state-title">Aucun badge</div>
              <div className="empty-state-sub">Complète des défis pour débloquer des badges</div>
            </div>
          ) : (
            <>
              <div>
                <label className="field-label">Badges affichés sur ton profil <span style={{color:'var(--text3)',fontWeight:400}}>(max 5)</span></label>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>
                  {userBadges.map(b=>{
                    // Support badges mensuels (ex: champion_month_2025_3)
                    const monthlyKey = b.badge_key?.startsWith('champion_month') ? 'champion_month'
                      : b.badge_key?.startsWith('podium_month') ? 'podium_month' : null
                    const badge=BADGES[monthlyKey || b.badge_key]; if(!badge) return null
                    // Extraire le mois/année pour les badges mensuels
                    const monthParts = monthlyKey ? b.badge_key.split('_').slice(-2) : null
                    const badgeLabel = monthParts ? `${['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'][parseInt(monthParts[1])-1]} ${monthParts[0]}` : null
                    const isSelected=featuredBadges.includes(b.badge_key)
                    return (
                      <div key={b.badge_key} onClick={()=>{
                        if(isSelected) setFeaturedBadges(f=>f.filter(k=>k!==b.badge_key))
                        else if(featuredBadges.length<5) setFeaturedBadges(f=>[...f,b.badge_key])
                      }} style={{
                        display:'flex',alignItems:'center',gap:8,padding:'8px 12px',
                        borderRadius:12,cursor:'pointer',transition:'all .15s',
                        background:isSelected?`${badge.color}18`:'var(--s2)',
                        border:`1.5px solid ${isSelected?badge.color:'var(--border)'}`,
                        opacity:!isSelected&&featuredBadges.length>=5?0.35:1,
                      }}>
                        <span style={{fontSize:20}}>{badge.icon}</span>
                        <div>
                          <div style={{fontSize:12,fontWeight:700,color:isSelected?badge.color:'var(--text2)',fontFamily:'var(--fb)'}}>{badge.name}{badgeLabel ? ` — ${badgeLabel}` : ''}</div>
                          <div style={{fontSize:10,color:'var(--text3)'}}>{badge.desc}</div>
                        </div>
                        {isSelected&&<span style={{fontSize:11,color:badge.color,marginLeft:'auto',fontWeight:700}}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving?'⏳...':'💾 Sauvegarder la sélection'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── ONGLET THÈME ── */}
      {tab === 'theme' && (
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {/* Aperçu */}
          <div style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:14,padding:'14px',textAlign:'center'}}>
            <div style={{fontFamily:'var(--fm)',fontSize:28,fontWeight:900,color:'var(--red)',letterSpacing:4}}>GRINDSET</div>
            <div style={{fontFamily:'var(--fb)',fontSize:12,color:'var(--text2)',marginTop:2}}>Aperçu du thème</div>
          </div>

          {/* Thèmes standard */}
          <div>
            <label className="field-label">Couleur d&apos;accent</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8}}>
              {THEMES.filter(t=>!t.premium).map(t=>(
                <div key={t.key} onClick={()=>selectTheme(t.key)} style={{border:`2px solid ${selectedTheme===t.key?t.preview:'transparent'}`,borderRadius:12,padding:'10px 6px',cursor:'pointer',background:'var(--s2)',display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:'all .15s'}}>
                  <div style={{width:28,height:28,borderRadius:'50%',background:t.preview,boxShadow:selectedTheme===t.key?`0 0 0 3px ${t.preview}40`:'none'}}/>
                  <span style={{fontSize:9,fontWeight:700,color:selectedTheme===t.key?t.preview:'var(--text3)'}}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Thèmes premium */}
          <div>
            <label className="field-label">Thèmes premium <span style={{color:'var(--text3)',fontWeight:400,fontSize:9}}>Fond + effets lumineux</span></label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {THEMES.filter(t=>t.premium).map(t=>(
                <div key={t.key} onClick={()=>selectTheme(t.key)} style={{border:`2px solid ${selectedTheme===t.key?t.preview:'rgba(255,255,255,0.08)'}`,borderRadius:12,padding:'12px 6px',cursor:'pointer',background:selectedTheme===t.key?`${t.preview}12`:'var(--s2)',display:'flex',flexDirection:'column',alignItems:'center',gap:5,transition:'all .2s',boxShadow:selectedTheme===t.key?`0 0 12px ${t.preview}30`:'none'}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:t.preview,boxShadow:`0 0 8px ${t.preview}50`}}/>
                  <span style={{fontSize:9,fontWeight:700,color:selectedTheme===t.key?t.preview:'var(--text2)',textAlign:'center'}}>{t.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Polices */}
          <div>
            <label className="field-label">Police</label>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {FONT_PACKS.map(f=>(
                <div key={f.key} onClick={()=>selectFont(f.key)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,cursor:'pointer',background:selectedFont===f.key?`${currentThemeObj.preview}15`:'var(--s2)',border:`1px solid ${selectedFont===f.key?'var(--red)':'var(--border)'}`,transition:'all .15s'}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:700,color:selectedFont===f.key?'var(--red)':'var(--text)',fontFamily:f.fm}}>{f.name}</div>
                    <div style={{fontSize:10,color:'var(--text3)'}}>{f.sub}</div>
                  </div>
                  {selectedFont===f.key&&<div style={{width:16,height:16,borderRadius:'50%',background:'var(--red)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:'white'}}>✓</div>}
                </div>
              ))}
            </div>
          </div>

          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving?'⏳ Sauvegarde...':'💾 Appliquer'}
          </button>
        </div>
      )}
    </div>
  )
}
