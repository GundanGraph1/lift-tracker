'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/supabase'
import { normalize } from '../../../lib/constants'

export default function LeaderboardPage() {
  const [tab, setTab] = useState('volume')
  const [genderFilter, setGenderFilter] = useState('all') // 'all' | 'male' | 'female'
  const [period, setPeriod] = useState('all') // 'all' | 'month' | 'week'
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [usersRes, sessRes, prsRes, cardioRes] = await Promise.all([
      db.from('users').select('*'),
      db.from('sessions').select('*'),
      db.from('prs').select('*'),
      db.from('cardio_sessions').select('*'),
    ])
    const sessions = (sessRes.data||[]).map(s=>({...s,exercises:typeof s.exercises==='string'?JSON.parse(s.exercises):(s.exercises||[])}))
    setData({ users: (usersRes.data||[]).filter(u=>!u.is_private), sessions, prs: prsRes.data||[], cardio: cardioRes.data||[] })
    setLoading(false)
  }

  function Avatar({user,size=40}) {
    const isImg = user?.avatar?.startsWith('http')||user?.avatar?.startsWith('data:')
    return isImg
      ? <div style={{width:size,height:size,borderRadius:'50%',backgroundImage:`url(${user.avatar})`,backgroundSize:'cover',backgroundPosition:'center',flexShrink:0}}/>
      : <div style={{width:size,height:size,borderRadius:'50%',background:'var(--s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:size*0.4,flexShrink:0}}>{user?.avatar||'💪'}</div>
  }

  function Row({user,rank,value,detail,color}) {
    const medals = ['🥇','🥈','🥉']
    const medalColors = ['#fbbf24','#94a3b8','#cd7c2e']
    const genderIcon = user.gender === 'female' ? '♀' : user.gender === 'other' ? '·' : '♂'
    const isTop3 = rank < 3
    return (
      <div style={{
        display:'flex',alignItems:'center',gap:12,
        padding: isTop3 ? '14px 16px' : '11px 14px',
        borderBottom:'1px solid var(--border)',
        background: rank===0 ? 'linear-gradient(90deg,rgba(251,191,36,.08),transparent)' : rank===1 ? 'linear-gradient(90deg,rgba(148,163,184,.05),transparent)' : rank===2 ? 'linear-gradient(90deg,rgba(205,124,46,.05),transparent)' : 'transparent',
        transition:'background .2s',
      }}>
        <div style={{width:28,textAlign:'center',flexShrink:0}}>
          {isTop3
            ? <div style={{fontSize:20,filter:rank===0?'drop-shadow(0 0 6px rgba(251,191,36,.6))':rank===1?'drop-shadow(0 0 4px rgba(148,163,184,.4))':'drop-shadow(0 0 4px rgba(205,124,46,.4))'}}>{medals[rank]}</div>
            : <div style={{fontSize:13,fontWeight:700,color:'var(--text3)',fontFamily:'var(--fm)'}}>{rank+1}</div>
          }
        </div>
        <Avatar user={user} size={isTop3?42:36}/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:700,fontSize:isTop3?15:13,display:'flex',alignItems:'center',gap:4,color:rank===0?'#fbbf24':rank===1?'#e2e8f0':rank===2?'#cd7c2e':'var(--text)'}}>
            <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.username}</span>
            {genderFilter==='all'&&<span style={{fontSize:10,opacity:0.4,flexShrink:0}}>{genderIcon}</span>}
          </div>
          <div style={{fontSize:11,color:'var(--text3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{detail}</div>
        </div>
        <div style={{fontFamily:'var(--fm)',fontSize:isTop3?22:18,fontWeight:800,color:isTop3?medalColors[rank]:(color||'var(--text)'),flexShrink:0,textShadow:rank===0?'0 0 12px rgba(251,191,36,.4)':'none'}}>{value}</div>
      </div>
    )
  }

  function buildRows() {
    if (!data) return []
    const { users, sessions: allSessions, prs, cardio: allCardio } = data

    // Filtre période
    const now = new Date()
    const sessions = allSessions.filter(s => {
      if (period === 'all') return true
      const d = new Date(s.session_date + 'T12:00:00')
      if (period === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      }
      if (period === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }
      return true
    })

    // Filtre période sur cardio
    const cardio = allCardio.filter(c => {
      if (period === 'all') return true
      const d = new Date(c.session_date + 'T12:00:00')
      if (period === 'week') {
        const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7)
        return d >= weekAgo
      }
      if (period === 'month') {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      }
      return true
    })

    // Filtre genre
    const filteredUsers = genderFilter === 'all'
      ? users
      : genderFilter === 'male'
        ? users.filter(u => !u.gender || u.gender === 'male')
        : users.filter(u => u.gender === 'female')

    if (tab==='volume') {
      return filteredUsers.map(u=>{
        const us=sessions.filter(s=>s.user_id===u.id)
        if(!us.length) return null
        const best=us.reduce((a,s)=>s.total_volume>a.total_volume?s:a,us[0])
        const dateStr=new Date(best.session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})
        const muscleLabel=(best.muscle||'').split('+').map(m=>m).join('+').slice(0,12)
        return {user:u,val:best.total_volume,detail:`${muscleLabel} — le ${dateStr}`,color:'var(--red)',display:`${best.total_volume.toLocaleString('fr')} kg`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    if (tab==='total') {
      return filteredUsers.map(u=>{
        const us=sessions.filter(s=>s.user_id===u.id)
        if(!us.length) return null
        const total=us.reduce((a,s)=>a+(s.total_volume||0),0)
        return {user:u,val:total,detail:`${us.length} séances au total`,color:'var(--green)',display:`${(total/1000).toFixed(1)}t`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    // Mots-clés stricts — pas de leg press, hack squat, romanian dans les big 3
    const PR_KEYWORDS = {
      bench: {
        include: ['bench','developpe couche','développé couché','presse inclinee','presse inclinée'],
        exclude: ['haltere','haltère','cable','poulie'],
      },
      squat: {
        include: ['squat barre','back squat','front squat','squat'],
        exclude: ['hack','leg press','goblet','smith','bulgare','bulgarian','overhead'],
      },
      deadlift: {
        include: ['deadlift','soulevé de terre','souleve de terre'],
        exclude: ['romanian','roumain','jambe tendue','sumo'] // sumo est un vrai deadlift mais différent
      },
    }
    const prCat = PR_KEYWORDS[tab]
    if (prCat) {
      const colors = {bench:'var(--gold)',squat:'var(--blue)',deadlift:'var(--purple)'}
      const matchesEx = (name) => {
        const n = normalize(name)
        const included = prCat.include.some(k => n.includes(normalize(k)))
        const excluded = prCat.exclude.some(k => n.includes(normalize(k)))
        return included && !excluded
      }
      return filteredUsers.map(u=>{
        let best=0,bestReps=0,bestDate=''
        // D'abord les PRs enregistrés
        prs.filter(p=>p.user_id===u.id).forEach(p=>{
          if(matchesEx(p.exercise) && parseFloat(p.weight)>best){
            best=parseFloat(p.weight);bestReps=p.reps;bestDate=p.date
          }
        })
        // Puis scanner toutes les séances (déjà filtrées par période)
        sessions.filter(s=>s.user_id===u.id).forEach(s=>(s.exercises||[]).forEach(e=>{
          if(matchesEx(e.name)) e.sets.forEach(st=>{
            const w = e.unilateral ? Math.max(parseFloat(st.wL)||0, parseFloat(st.wR)||0) : parseFloat(st.w)||0
            if(w>best){best=w;bestReps=e.unilateral?(st.rL||st.rR):st.r;bestDate=s.session_date}
          })
        }))
        if(!best) return null
        const dateStr=bestDate?new Date(bestDate+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}):''
        return {user:u,val:best,detail:`${bestReps} rep${bestReps>1?'s':''} — le ${dateStr}`,color:colors[tab],display:`${best} kg`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    if (tab==='sessions') {
      return filteredUsers.map(u=>{
        const us=sessions.filter(s=>s.user_id===u.id)
        if(!us.length) return null
        const sorted=[...us].sort((a,b)=>b.session_date.localeCompare(a.session_date))
        return {user:u,val:us.length,detail:`Dernière le ${new Date(sorted[0].session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})}`,color:'var(--purple)',display:`${us.length}`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    if (tab==='cardio') {
      return filteredUsers.map(u=>{
        const uc = cardio.filter(c=>c.user_id===u.id)
        if (!uc.length) return null
        // Points = minutes totales pondérées par les kcal (si dispo)
        const totalMins = uc.reduce((a,c)=>a+(parseInt(c.duration_min)||0),0)
        const totalKcal = uc.reduce((a,c)=>a+(parseInt(c.calories_burned)||0),0)
        const pts = totalKcal > 0 ? totalKcal : totalMins * 8 // fallback 8pts/min si pas de kcal
        const detail = `${uc.length} séance${uc.length>1?'s':''} · ${totalMins} min`
        return {user:u,val:pts,detail,color:'var(--green)',display:totalKcal>0?`${pts.toLocaleString('fr')} kcal`:`${totalMins} min`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    return []
  }

  const tabs = [
    {k:'volume',  l:'Volume',    group:'muscu'},
    {k:'sessions',l:'Séances',   group:'muscu'},
    {k:'bench',   l:'🏋️ Bench',  group:'pr'},
    {k:'squat',   l:'🦵 Squat',  group:'pr'},
    {k:'deadlift',l:'⛓️ Deadlift',group:'pr'},
    {k:'cardio',  l:'🏃 Cardio', group:'cardio'},
  ]
  const rows = buildRows()

  const genderTabs = [
    {k:'all',   l:'Tous'},
    {k:'male',  l:'Hommes'},
    {k:'female',l:'Femmes'},
  ]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="page-title">TOP</div>
        <div className="page-sub">{period === 'week' ? 'Classement de la semaine' : period === 'month' ? 'Classement du mois' : 'Classement général'}</div>
        <hr className="page-divider" />
      </div>

      {/* Filtre période */}
      <div style={{display:'flex',gap:6,marginBottom:10}}>
        {[{k:'all',l:'Tout le temps'},{k:'month',l:'Ce mois'},{k:'week',l:'Cette semaine'}].map(p=>(
          <button key={p.k} onClick={()=>setPeriod(p.k)} style={{
            flex:1,padding:'8px 4px',fontSize:11,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:10,
            border:`1px solid ${period===p.k?'var(--red)':'var(--border)'}`,
            background:period===p.k?'rgba(255,60,60,.12)':'var(--s1)',
            color:period===p.k?'var(--red)':'var(--text3)',
            transition:'all .15s'
          }}>{p.l}</button>
        ))}
      </div>

      {/* Filtre genre */}
      <div style={{display:'flex',gap:6,marginBottom:12}}>
        {genderTabs.map(g=>(
          <button key={g.k} onClick={()=>setGenderFilter(g.k)}
            style={{flex:1,padding:'8px 4px',fontSize:12,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:12,
              border:`1px solid ${genderFilter===g.k?'var(--red)':'var(--border)'}`,
              background:genderFilter===g.k?'var(--red)':'var(--s1)',
              color:genderFilter===g.k?'white':'var(--text2)',
              transition:'all .15s'}}>
            {g.l}
          </button>
        ))}
      </div>

      {/* Filtre catégorie — groupé */}
      <div style={{marginBottom:16}}>
        {[{g:'muscu',l:'Muscu'},{g:'pr',l:'PRs'},{g:'cardio',l:'Cardio'}].map(group=>(
          <div key={group.g} style={{marginBottom:6}}>
            <div style={{fontSize:9,fontWeight:700,letterSpacing:2,color:'var(--text3)',textTransform:'uppercase',marginBottom:4}}>{group.l}</div>
            <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
              {tabs.filter(t=>t.group===group.g).map(t=>(
                <button key={t.k} onClick={()=>setTab(t.k)} style={{
                  padding:'7px 12px',fontSize:11,fontFamily:'var(--fb)',fontWeight:700,cursor:'pointer',borderRadius:10,
                  border:`1px solid ${tab===t.k?'var(--red)':'var(--border)'}`,
                  background:tab===t.k?'var(--red)':'var(--s1)',
                  color:tab===t.k?'white':'var(--text2)',
                  transition:'all .15s'
                }}>{t.l}</button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {loading&&<div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>⏳ Chargement...</div>}
      {!loading&&rows.length===0&&(
        <div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>
          
          <p>Pas encore de données{period!=='all'?` pour ${period==='week'?'cette semaine':'ce mois'}`:''}{genderFilter!=='all'?' dans cette catégorie':''}</p>
        </div>
      )}
      {!loading&&rows.length>0&&(
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
          {rows.map((r,i)=><Row key={r.user.id} user={r.user} rank={i} value={r.display} detail={r.detail} color={r.color}/>)}
        </div>
      )}
    </div>
  )
}
