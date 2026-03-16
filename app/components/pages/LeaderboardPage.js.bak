'use client'
import { useState, useEffect } from 'react'
import { db } from '../../../lib/supabase'
import { normalize } from '../../../lib/constants'

export default function LeaderboardPage() {
  const [tab, setTab] = useState('volume')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const [usersRes, sessRes, prsRes] = await Promise.all([
      db.from('users').select('*'),
      db.from('sessions').select('*'),
      db.from('prs').select('*')
    ])
    const sessions = (sessRes.data||[]).map(s=>({...s,exercises:typeof s.exercises==='string'?JSON.parse(s.exercises):(s.exercises||[])}))
    setData({ users: (usersRes.data||[]).filter(u=>!u.is_private), sessions, prs: prsRes.data||[] })
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
    return (
      <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
        <div style={{width:28,textAlign:'center',fontSize:rank<3?20:14,color:rank>=3?'var(--text3)':'inherit'}}>{rank<3?medals[rank]:rank+1}</div>
        <Avatar user={user}/>
        <div style={{flex:1}}>
          <div style={{fontWeight:700,fontSize:14}}>{user.username}</div>
          <div style={{fontSize:11,color:'var(--text3)'}}>{detail}</div>
        </div>
        <div style={{fontFamily:'var(--fm)',fontSize:20,fontWeight:700,color:color||'var(--text)'}}>{value}</div>
      </div>
    )
  }

  function buildRows() {
    if (!data) return []
    const { users, sessions, prs } = data

    if (tab==='volume') {
      return users.map(u=>{
        const us=sessions.filter(s=>s.user_id===u.id)
        if(!us.length) return null
        const best=us.reduce((a,s)=>s.total_volume>a.total_volume?s:a,us[0])
        const dateStr=new Date(best.session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})
        const muscleLabel=(best.muscle||'').split('+').map(m=>m).join('+').slice(0,12)
        return {user:u,val:best.total_volume,detail:`${muscleLabel} — le ${dateStr}`,color:'var(--red)',display:`${best.total_volume.toLocaleString('fr')} kg`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    if (tab==='total') {
      return users.map(u=>{
        const us=sessions.filter(s=>s.user_id===u.id)
        if(!us.length) return null
        const total=us.reduce((a,s)=>a+(s.total_volume||0),0)
        return {user:u,val:total,detail:`${us.length} séances au total`,color:'var(--green)',display:`${(total/1000).toFixed(1)}t`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    const prTab = (tab==='bench')?['bench','developpe couche']:(tab==='squat')?['squat','hack squat','leg press']:(tab==='deadlift')?['deadlift','souleve de terre','romanian']:null
    if (prTab) {
      const colors = {bench:'var(--gold)',squat:'var(--blue)',deadlift:'var(--purple)'}
      return users.map(u=>{
        let best=0,bestReps=0,bestDate=''
        prs.filter(p=>p.user_id===u.id).forEach(p=>{
          if(prTab.some(k=>normalize(p.exercise).includes(k))&&p.weight>best){best=p.weight;bestReps=p.reps;bestDate=p.date}
        })
        sessions.filter(s=>s.user_id===u.id).forEach(s=>(s.exercises||[]).forEach(e=>{
          if(prTab.some(k=>normalize(e.name).includes(k)))e.sets.forEach(st=>{if(parseFloat(st.w)>best){best=parseFloat(st.w);bestReps=st.r;bestDate=s.session_date}})
        }))
        if(!best) return null
        const dateStr=bestDate?new Date(bestDate+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'}):''
        return {user:u,val:best,detail:`${bestReps} rep${bestReps>1?'s':''} — le ${dateStr}`,color:colors[tab],display:`${best} kg`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    if (tab==='sessions') {
      return users.map(u=>{
        const us=sessions.filter(s=>s.user_id===u.id)
        if(!us.length) return null
        const sorted=[...us].sort((a,b)=>b.session_date.localeCompare(a.session_date))
        return {user:u,val:us.length,detail:`Dernière le ${new Date(sorted[0].session_date+'T12:00:00').toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit',year:'2-digit'})}`,color:'var(--purple)',display:`${us.length}`}
      }).filter(Boolean).sort((a,b)=>b.val-a.val)
    }
    return []
  }

  const tabs = [{k:'volume',l:'🔥 Volume'},{k:'total',l:'📦 Total'},{k:'bench',l:'🏋️ Bench'},{k:'squat',l:'🦵 Squat'},{k:'deadlift',l:'⛓️ Deadlift'},{k:'sessions',l:'📅 Séances'}]
  const rows = buildRows()

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="page-title">TOP</div>
        <div className="page-sub">Classement général</div>
        <hr className="page-divider" />
      </div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
        {tabs.map(t=><button key={t.k} onClick={()=>setTab(t.k)} className={`lb-tab${tab===t.k?' active':''}`}>{t.l}</button>)}
      </div>
      {loading&&<div style={{textAlign:'center',padding:40,color:'var(--text3)'}}>⏳ Chargement...</div>}
      {!loading&&rows.length===0&&<div style={{textAlign:'center',padding:40,color:'var(--text3)'}}><div style={{fontSize:40,marginBottom:12}}>🏆</div><p>Pas encore de données</p></div>}
      {!loading&&rows.length>0&&(
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden'}}>
          {rows.map((r,i)=><Row key={r.user.id} user={r.user} rank={i} value={r.display} detail={r.detail} color={r.color}/>)}
        </div>
      )}
    </div>
  )
}
