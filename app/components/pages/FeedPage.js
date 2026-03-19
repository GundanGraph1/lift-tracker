'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/supabase'
import { useStore, actions } from '../../../lib/store'
import ShareStory from '../ShareStory'
import { MUSCLE_LABELS, BADGES, normalize } from '../../../lib/constants'
import { showToast } from '../Toast'

const isBW = (name) => (name||'').toLowerCase().includes('pompe') && !(name||'').toLowerCase().includes('lest')

export default function FeedPage() {
  const currentUser = useStore(s => s.currentUser)
  const [copyingSession, setCopyingSession] = useState(null)
  const [copyPresetName, setCopyPresetName] = useState('')
  const [copySaving, setCopySaving] = useState(false)

  async function saveSessionAsPreset(session) {
    const name = copyPresetName.trim() || `Séance de ${items.users?.find(u=>u.id===session.user_id)?.username||'?'}`
    setCopySaving(true)
    const exos = (session.exercises||[]).map(e=>({name:e.name,sets:(e.sets||[]).map(s=>({r:s.r,w:s.w}))}))
    const { data } = await db.from('presets').select('position').eq('user_id',currentUser.id).order('position',{ascending:false}).limit(1)
    const maxPos = data?.[0]?.position+1 || 0
    const { data: newPreset } = await db.from('presets').insert([{user_id:currentUser.id,name,muscle:session.muscle,exercises:JSON.stringify(exos),position:maxPos}]).select().single()
    if (newPreset) actions.setPresets([...(useStore.getState?.()?.presets||[]), newPreset])
    setCopySaving(false); setCopyingSession(null); setCopyPresetName('')
    showToast(`✅ Preset "${name}" créé !`)
  }
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState({})
  const [shareSession, setShareSession] = useState(null)

  useEffect(() => { loadFeed() }, [filter])

  async function loadFeed() {
    setLoading(true)
    try {
      const [sessRes, usersRes, reactRes, badgesRes] = await Promise.all([
        db.from('sessions').select('*').order('created_at',{ascending:false}).limit(30),
        db.from('users').select('*'),
        db.from('reactions').select('*'),
        db.from('badges').select('*')
      ])
      let sessions = (sessRes.data||[]).map(s=>({...s,exercises:typeof s.exercises==='string'?JSON.parse(s.exercises):(s.exercises||[])}))
      if (filter!=='all') sessions = sessions.filter(s=>(s.muscle||'').split('+').includes(filter))
      const users = usersRes.data||[]
      const reactions = reactRes.data||[]
      const badges = badgesRes.data||[]

      // Build badge events
      const badgeEvents = badges.filter(b=>b.unlocked_at).map(b=>({_type:'badge',...b}))

      setItems({ sessions, users, reactions, badges, badgeEvents })
    } catch(e) { setItems(null) }
    setLoading(false)
  }

  async function toggleReaction(sessionId, emoji) {
    // Mise à jour optimiste — on modifie le state local immédiatement, sans recharger
    const prevReactions = items.reactions
    const myExisting = items.reactions.find(r => r.user_id===currentUser.id && r.session_id===sessionId)

    let newReactions
    if (myExisting) {
      if (myExisting.emoji===emoji) {
        // Supprimer la réaction
        newReactions = items.reactions.filter(r => !(r.user_id===currentUser.id && r.session_id===sessionId))
      } else {
        // Changer l'emoji
        newReactions = items.reactions.map(r => r.user_id===currentUser.id && r.session_id===sessionId ? {...r, emoji} : r)
      }
    } else {
      // Ajouter
      newReactions = [...items.reactions, {id: Date.now(), user_id: currentUser.id, session_id: sessionId, emoji}]
    }
    // Appliquer immédiatement — zéro latence visible
    setItems(prev => ({...prev, reactions: newReactions}))

    // Synchro Supabase en arrière-plan
    try {
      if (myExisting) {
        if (myExisting.emoji===emoji) await db.from('reactions').delete().eq('id',myExisting.id)
        else await db.from('reactions').update({emoji}).eq('id',myExisting.id)
      } else {
        await db.from('reactions').insert([{user_id:currentUser.id,session_id:sessionId,emoji}])
      }
    } catch(e) {
      // Rollback si erreur
      setItems(prev => ({...prev, reactions: prevReactions}))
    }
  }

  if (loading) return <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>⏳ Chargement...</div>
  if (!items) return <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>⚠️ Erreur de chargement</div>

  const { sessions, users, reactions, badges, badgeEvents } = items
  const EMOJIS = ['🔥','💪','👏','🏆','😤']

  function Avatar({user,size=42}) {
    const isImg = user?.avatar?.startsWith('http')||user?.avatar?.startsWith('data:')
    return isImg
      ? <div style={{width:size,height:size,borderRadius:'50%',backgroundImage:`url(${user.avatar})`,backgroundSize:'cover',backgroundPosition:'center',flexShrink:0}}/>
      : <div style={{width:size,height:size,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.45,flexShrink:0}}>{user?.avatar||'💪'}</div>
  }

  function timeAgo(d) {
    const diffH = Math.floor((new Date()-new Date(d))/3600000)
    const diffD = Math.floor(diffH/24)
    if (diffH<1) return "À l'instant"
    if (diffH<24) return `Il y a ${diffH}h`
    if (diffD<7) return `Il y a ${diffD}j`
    return new Date(d).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'})
  }

  const filters = ['all',...Object.keys(MUSCLE_LABELS).slice(0,6)]

  return (
    <>
      <div style={{marginBottom:20}}>
        <div className="page-title">FEED</div>
        <div className="page-sub">Activité de la communauté</div>
        <hr className="page-divider" />
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {filters.map(f=>(
          <button key={f} onClick={()=>setFilter(f)} className={`lb-tab${filter===f?' active':''}`} style={{fontSize:11,padding:'5px 10px'}}>{f==='all'?'Tout':MUSCLE_LABELS[f]}</button>
        ))}
      </div>

      {(() => {
        const filteredSessions = filter==='all' ? sessions : sessions.filter(s=>(s.muscle||'').split('+').includes(filter))
        const allItems = [
          ...filteredSessions.map(s => ({...s, _type:'session', _sortDate: s.created_at || s.session_date})),
          ...badgeEvents.map(b => ({...b, _type:'badge', _sortDate: b.unlocked_at}))
        ].sort((a,b) => new Date(b._sortDate) - new Date(a._sortDate))

        if (allItems.length === 0) return <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}><div style={{fontSize:40,marginBottom:12}}>{"👥"}</div><p>Aucune activité</p></div>

        return allItems.map(item => {
          if (item._type === 'badge') {
            const b = item
            const user = users.find(u=>u.id===b.user_id)
            const badge = BADGES[b.badge_key]
            if (!user||!badge) return null
            const dateStr = new Date(b.unlocked_at+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})
            return (
              <div key={'b'+b.id} style={{background:'var(--s1)',border:`1px solid ${badge.color}44`,borderRadius:16,padding:16,marginBottom:12}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <Avatar user={user} size={42}/>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,fontSize:14}}>{user.username}</span>
                      <span style={{fontSize:10,background:`${badge.color}22`,color:badge.color,border:`1px solid ${badge.color}44`,padding:'2px 7px',borderRadius:999,fontWeight:600}}>Badge débloqué</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{"📅"} {dateStr}</div>
                  </div>
                  <div style={{fontSize:36}}>{badge.icon}</div>
                </div>
                <div style={{marginTop:10,padding:10,background:'var(--s2)',borderRadius:10,textAlign:'center'}}>
                  <div style={{fontSize:14,fontWeight:700,color:badge.color}}>{badge.name}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{badge.desc}</div>
                </div>
              </div>
            )
          }

          // SESSION CARD
          const s = item
          const user = users.find(u=>u.id===s.user_id)
          if (!user) return null
          const isMe = user.id===currentUser.id
          const sessReactions = reactions.filter(r=>r.session_id===s.id)
          const myReaction = sessReactions.find(r=>r.user_id===currentUser.id)
          const reactionGroups = {}
          sessReactions.forEach(r=>{ reactionGroups[r.emoji]=(reactionGroups[r.emoji]||0)+1 })
          // Badges affichés : featured_badges si défini, sinon tous (max 3)
          const userBadgeKeys = badges.filter(b=>b.user_id===user.id).map(b=>b.badge_key)
          const featured = user.featured_badges?.length ? user.featured_badges : userBadgeKeys.slice(0,3)
          const userBadgeIcons = featured.map(k=>BADGES[k]?.icon||'').filter(Boolean).join('')
          const dateStr = new Date(s.session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})
          const isExpanded = expanded[s.id]
          return (
            <div key={'s'+s.id} style={{background:'var(--s1)',border:`1px solid ${isMe?'rgba(255,60,60,.3)':'var(--border)'}`,borderRadius:16,padding:16,marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                <Avatar user={user} size={42}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                    <span style={{fontWeight:700,fontSize:14}}>{user.username}</span>
                    {isMe&&<span style={{fontSize:10,color:'var(--text3)',background:'var(--s3)',padding:'2px 6px',borderRadius:999}}>toi</span>}
                    <span className={`hist-badge m-${(s.muscle||"").split("+")[0]}`} style={{fontSize:10}}>{(s.muscle||"").split("+").map(m=>MUSCLE_LABELS[m]||m).join(" + ")}</span>
                    {userBadgeIcons&&<span style={{fontSize:12}}>{userBadgeIcons}</span>}
                  </div>
                  <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>
                    {timeAgo(s.created_at)} {"·"} {"📅"} {dateStr}{s.session_time?` · ${s.session_time}`:''}
                  </div>
                </div>
                <div style={{textAlign:'right',flexShrink:0}}>
                  <div style={{fontSize:16,fontWeight:700,color:'var(--green)',fontFamily:'var(--fm)'}}>{(s.total_volume||0).toLocaleString('fr')}</div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>kg soulevés</div>
                </div>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                {s.exercises.slice(0,3).map((e,i)=>{
                  const maxW=e.sets.length?Math.max(...e.sets.map(st=>parseFloat(st.w)||0)):0
                  return <div key={i} style={{background:'var(--s3)',borderRadius:8,padding:'5px 10px',fontSize:12,color:'var(--text2)'}}>{e.name} <span style={{color:'var(--text)',fontWeight:600}}>{maxW}kg</span></div>
                })}
                {s.exercises.length>3&&<div style={{background:'var(--s3)',borderRadius:8,padding:'5px 10px',fontSize:12,color:'var(--text3)'}}>+{s.exercises.length-3} exos</div>}
              </div>
              {s.notes&&<div style={{fontSize:12,color:'var(--text3)',fontStyle:'italic',marginBottom:8,padding:8,background:'var(--s2)',borderRadius:8}}>"{s.notes}"</div>}
              {isExpanded && (
                <div style={{marginBottom:8}}>
                  {s.exercises.map((e,ei)=>(
                    <div key={ei} style={{padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5}}>
                        <span style={{fontSize:13,fontWeight:600}}>{e.name}</span>
                        <span style={{fontSize:11,color:'var(--text3)'}}>{isBW(e.name)?'BW':e.sets.reduce((a,st)=>a+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0).toLocaleString('fr')+' kg'}</span>
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {e.sets.map((st,si)=><span key={si} style={{background:'var(--s3)',borderRadius:6,padding:'3px 7px',fontSize:11,color:'var(--text2)'}}>{st.r}×{isBW(e.name)?'BW':st.w+'kg'}</span>)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                {s.user_id===currentUser?.id&&<button onClick={e=>{e.stopPropagation();setShareSession(s)}} style={{background:'var(--s3)',border:'1px solid var(--border)',borderRadius:8,padding:'5px 10px',color:'var(--text2)',fontSize:12,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600}}>{"📸"}</button>}
                <button onClick={e=>{e.stopPropagation();setCopyingSession(copyingSession?.id===s.id?null:s);setCopyPresetName('')}} style={{background:copyingSession?.id===s.id?'rgba(96,165,250,.15)':'var(--s3)',border:`1px solid ${copyingSession?.id===s.id?'rgba(96,165,250,.4)':'var(--border)'}`,borderRadius:8,padding:'5px 10px',color:copyingSession?.id===s.id?'#60a5fa':'var(--text2)',fontSize:11,cursor:'pointer',fontFamily:'var(--fb)',fontWeight:600}}>📋 Copier</button>
                <button onClick={()=>setExpanded(p=>({...p,[s.id]:!p[s.id]}))} style={{background:'none',border:'none',color:isExpanded?'var(--red)':'var(--text3)',fontSize:11,cursor:'pointer',padding:'0 0 8px',fontFamily:'var(--fb)'}}>
                  {isExpanded?'▲ Masquer le détail':'▼ Voir le détail'}
                </button>
              </div>
              {copyingSession?.id===s.id&&(
                <div style={{padding:10,background:'rgba(96,165,250,0.06)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:10,marginBottom:8}}>
                  <div style={{fontSize:11,color:'#60a5fa',fontWeight:700,marginBottom:8}}>📋 Copier cette séance en preset</div>
                  <div style={{display:'flex',gap:6}}>
                    <input value={copyPresetName} onChange={e=>setCopyPresetName(e.target.value)} placeholder={`Séance de ${items.users?.find(u=>u.id===s.user_id)?.username||'?'}`} style={{flex:1,padding:'7px 10px',fontSize:12,background:'var(--s1)',border:'1px solid rgba(96,165,250,0.3)',borderRadius:8,color:'var(--text1)',fontFamily:'var(--fb)'}}/>
                    <button onClick={()=>saveSessionAsPreset(s)} disabled={copySaving} style={{background:'#3b82f6',border:'none',borderRadius:8,padding:'7px 14px',color:'white',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer'}}>{copySaving?'⏳':'✅'}</button>
                    <button onClick={()=>setCopyingSession(null)} style={{background:'var(--s3)',border:'none',borderRadius:8,padding:'7px 10px',color:'var(--text2)',fontSize:12,cursor:'pointer'}}>✕</button>
                  </div>
                </div>
              )}
              <div style={{display:'flex',flexWrap:'wrap',gap:6,paddingTop:10,borderTop:'1px solid var(--border)'}}>
                {EMOJIS.map(emoji=>{
                  const count=reactionGroups[emoji]||0
                  const isActive=myReaction?.emoji===emoji
                  return (
                    <button key={emoji} onClick={()=>toggleReaction(s.id,emoji)} style={{background:isActive?'rgba(255,60,60,.2)':'var(--s3)',border:`1px solid ${isActive?'var(--red)':'transparent'}`,borderRadius:20,padding:'5px 10px',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',gap:4,fontFamily:'var(--fb)',transition:'all .15s'}}>
                      {emoji}{count>0&&<span style={{fontSize:11,color:isActive?'var(--red)':'var(--text2)',fontWeight:600}}>{count}</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })
      })()}

      {shareSession && <ShareStory session={shareSession} user={currentUser} onClose={()=>setShareSession(null)} />}
    </>
  )
}
