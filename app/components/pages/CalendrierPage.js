'use client'
import { useState } from 'react'
import { useStore } from '../../../lib/store'
import { MUSCLE_COLORS, MUSCLE_LABELS } from '../../../lib/constants'

export default function CalendrierPage() {
  const sessions = useStore(s => s.sessions)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const blanks = (firstDay+6)%7

  const sessionsByDate = {}
  sessions.forEach(s => {
    if (!sessionsByDate[s.session_date]) sessionsByDate[s.session_date] = []
    sessionsByDate[s.session_date].push(s)
  })

  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
  const dayNames = ['L','M','M','J','V','S','D']

  function prevMonth() { if(month===0){setMonth(11);setYear(y=>y-1)}else setMonth(m=>m-1); setSelected(null) }
  function nextMonth() { if(month===11){setMonth(0);setYear(y=>y+1)}else setMonth(m=>m+1); setSelected(null) }

  const selectedDate = selected ? `${year}-${String(month+1).padStart(2,'0')}-${String(selected).padStart(2,'0')}` : null
  const selectedSessions = selectedDate ? (sessionsByDate[selectedDate]||[]) : []

  // Annual stats
  const currentYear = new Date().getFullYear()
  const yearSessions = sessions.filter(s=>s.session_date.startsWith(currentYear))
  const yearVol = yearSessions.reduce((a,s)=>a+(s.total_volume||0),0)
  const monthCounts = Array(12).fill(0)
  yearSessions.forEach(s=>{ const m=parseInt(s.session_date.split('-')[1])-1; monthCounts[m]++ })
  const bestMonth = monthCounts.indexOf(Math.max(...monthCounts))
  const muscleCounts = {}
  yearSessions.forEach(s=>{ (s.muscle||'').split('+').forEach(m=>{muscleCounts[m]=(muscleCounts[m]||0)+1}) })
  const favMuscle = Object.entries(muscleCounts).sort((a,b)=>b[1]-a[1])[0]

  return (
    <div>
      <div style={{marginBottom:20}}>
        <div className="page-title">CALENDRIER</div>
        <div className="page-sub">Historique visuel</div>
        <hr className="page-divider" />
      </div>

      {/* Monthly nav */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
        <button onClick={prevMonth} style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 14px',color:'var(--text2)',cursor:'pointer',fontSize:16}}>‹</button>
        <div style={{fontFamily:'var(--fm)',fontSize:20,fontWeight:700,letterSpacing:1}}>{monthNames[month]} {year}</div>
        <button onClick={nextMonth} style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 14px',color:'var(--text2)',cursor:'pointer',fontSize:16}}>›</button>
      </div>

      {/* Day names */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:4}}>
        {dayNames.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:11,color:'var(--text3)',fontWeight:600,padding:'4px 0'}}>{d}</div>)}
      </div>

      {/* Calendar grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:4,marginBottom:16}}>
        {Array(blanks).fill(null).map((_,i)=><div key={`b${i}`}/>)}
        {Array(daysInMonth).fill(null).map((_,i)=>{
          const day=i+1
          const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const daySessions=sessionsByDate[dateStr]||[]
          const isSelected=selected===day
          const color=daySessions.length?MUSCLE_COLORS[daySessions[0].muscle]||'var(--red)':null
          return (
            <div key={day} onClick={()=>setSelected(isSelected?null:day)} style={{
              aspectRatio:'1',borderRadius:8,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:daySessions.length?'pointer':'default',
              background:isSelected?'var(--red)':color?`${color}33`:'var(--s2)',
              border:`1px solid ${isSelected?'var(--red)':color?color+'55':'var(--border)'}`,
              fontSize:12,fontWeight:daySessions.length?700:400,
              color:isSelected?'white':daySessions.length?color:'var(--text3)',
              transition:'all 0.15s', padding:2, gap:1
            }}>
              <span>{day}</span>
              {daySessions.length>0&&(
                <span style={{fontSize:7,fontWeight:700,letterSpacing:0.3,textAlign:'center',lineHeight:1.1,opacity:0.85,maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',padding:'0 1px'}}>
                  {daySessions[0].muscle?daySessions[0].muscle.split('+').map(m=>MUSCLE_LABELS[m]||m).join('+').slice(0,8):'💪'}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedSessions.length>0&&(
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:14,padding:16,marginBottom:16}}>
          <div style={{fontFamily:'var(--fm)',fontSize:16,fontWeight:700,marginBottom:12}}>
            {new Date(selectedDate+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
          </div>
          {selectedSessions.map(s=>(
            <div key={s.id} style={{marginBottom:12}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                <span className={`hist-badge m-${(s.muscle||"").split("+")[0]}`}>{(s.muscle||"").split("+").map(m=>MUSCLE_LABELS[m]||m).join(" + ")}</span>
                <span style={{fontFamily:'var(--fm)',fontSize:16,fontWeight:700,color:'var(--green)'}}>{(s.total_volume||0).toLocaleString('fr')} kg</span>
              </div>
              {(s.exercises||[]).map((e,i)=>(
                <div key={i} style={{display:'flex',flexWrap:'wrap',gap:4,marginBottom:4}}>
                  <span style={{fontSize:12,color:'var(--text2)',minWidth:120}}>{e.name}</span>
                  {e.sets.map((st,si)=><span key={si} style={{fontSize:11,color:'var(--text3)'}}>{st.r}×{st.w}kg</span>)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Annual recap */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16}}>
        <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}> Récap {currentYear}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          {[
            {label:'Séances',val:yearSessions.length,color:'var(--red)'},
            {label:'Volume',val:`${(yearVol/1000).toFixed(1)}t`,color:'var(--green)'},
            {label:'Meilleur mois',val:monthNames[bestMonth]?.slice(0,4)||'-',color:'var(--blue)'},
            {label:'Groupe favori',val:favMuscle?MUSCLE_LABELS[favMuscle[0]]||favMuscle[0]:'-',color:'var(--gold)'},
          ].map(k=>(
            <div key={k.label} style={{background:'var(--s2)',borderRadius:12,padding:'12px 14px'}}>
              <div style={{fontSize:10,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{k.label}</div>
              <div style={{fontFamily:'var(--fm)',fontSize:20,fontWeight:700,color:k.color}}>{k.val}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
