'use client'
import { useState } from 'react'
import { useStore } from '../../../lib/store'
import { MUSCLE_COLORS, MUSCLE_LABELS, getMuscleColor, getMuscleLabel } from '../../../lib/constants'

export default function CalendrierPage() {
  const sessions = useStore(s => s.sessions)
  const [month, setMonth] = useState(new Date().getMonth())
  const [year, setYear] = useState(new Date().getFullYear())
  const [selected, setSelected] = useState(null)

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month+1, 0).getDate()
  const blanks = (firstDay+6)%7
  const today = new Date()
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year
  const todayDay = isCurrentMonth ? today.getDate() : null

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

  // Stats du mois
  const monthStr = `${year}-${String(month+1).padStart(2,'0')}`
  const monthSessions = sessions.filter(s => s.session_date.startsWith(monthStr))
  const monthVol = monthSessions.reduce((a,s)=>a+(s.total_volume||0),0)

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

      {/* Stats rapides du mois */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:16}}>
        {[
          {label:'Séances',val:monthSessions.length,color:'var(--red)'},
          {label:'Volume',val:monthVol>0?`${(monthVol/1000).toFixed(1)}t`:'—',color:'var(--green)'},
          {label:'Ce mois',val:monthNames[month].slice(0,4),color:'var(--text2)'},
        ].map(k=>(
          <div key={k.label} style={{background:'var(--s2)',borderRadius:12,padding:'10px 12px',textAlign:'center',border:'1px solid var(--border)'}}>
            <div style={{fontFamily:'var(--fm)',fontSize:22,fontWeight:800,color:k.color,lineHeight:1}}>{k.val}</div>
            <div style={{fontSize:10,color:'var(--text3)',marginTop:3,letterSpacing:1,textTransform:'uppercase'}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Nav mois */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
        <button onClick={prevMonth} style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:10,width:36,height:36,color:'var(--text2)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
        <div style={{fontFamily:'var(--fm)',fontSize:18,fontWeight:800,letterSpacing:2,textTransform:'uppercase'}}>{monthNames[month]} {year}</div>
        <button onClick={nextMonth} style={{background:'var(--s2)',border:'1px solid var(--border)',borderRadius:10,width:36,height:36,color:'var(--text2)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
      </div>

      {/* Noms des jours */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:3}}>
        {dayNames.map((d,i)=><div key={i} style={{textAlign:'center',fontSize:10,color:'var(--text3)',fontWeight:700,padding:'4px 0',letterSpacing:1}}>{d}</div>)}
      </div>

      {/* Grille calendrier */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:3,marginBottom:16}}>
        {Array(blanks).fill(null).map((_,i)=><div key={`b${i}`}/>)}
        {Array(daysInMonth).fill(null).map((_,i)=>{
          const day=i+1
          const dateStr=`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const daySessions=sessionsByDate[dateStr]||[]
          const isSelected=selected===day
          const isToday=todayDay===day
          const hasSession=daySessions.length>0
          const color=hasSession?getMuscleColor(daySessions[0].muscle||''):null
          return (
            <div key={day} onClick={()=>hasSession?setSelected(isSelected?null:day):null} style={{
              aspectRatio:'1',borderRadius:8,display:'flex',flexDirection:'column',
              alignItems:'center',justifyContent:'center',gap:1,
              cursor:hasSession?'pointer':'default',
              background:isSelected?(color||'var(--red)'):hasSession?`${color}30`:'transparent',
              border:`1.5px solid ${isSelected?(color||'var(--red)'):isToday?'var(--red)':hasSession?(color||'transparent'):'transparent'}`,
              transition:'all .15s',overflow:'hidden',padding:2,
            }}>
              <span style={{
                fontSize:12,fontWeight:hasSession||isToday?700:400,lineHeight:1,
                color:isSelected?'white':isToday?'var(--red)':hasSession?(color||'var(--text)'):'var(--text3)',
              }}>{day}</span>
              {hasSession && (
                <span style={{
                  fontSize:6,fontWeight:800,lineHeight:1,letterSpacing:0.2,
                  color:isSelected?'rgba(255,255,255,0.9)':(color||'var(--red)'),
                  textAlign:'center',maxWidth:'100%',overflow:'hidden',
                  textOverflow:'ellipsis',whiteSpace:'nowrap',padding:'0 1px',
                }}>
                  {daySessions.length > 1
                    ? `${daySessions.length}×`
                    : getMuscleLabel(daySessions[0].muscle||'').slice(0,5)
                  }
                </span>
              )}
              {hasSession && daySessions.length > 1 && (
                <div style={{display:'flex',gap:1.5,justifyContent:'center'}}>
                  {daySessions.slice(0,3).map((ds,si)=>{
                    const dc=getMuscleColor(ds.muscle||'')
                    return <div key={si} style={{width:3,height:3,borderRadius:'50%',background:isSelected?'rgba(255,255,255,0.7)':dc,flexShrink:0}}/>
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Détail du jour sélectionné */}
      {selectedSessions.length>0&&(
        <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16,marginBottom:16}}>
          <div style={{fontFamily:'var(--fm)',fontSize:16,fontWeight:800,marginBottom:12,letterSpacing:1}}>
            {new Date(selectedDate+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'}).toUpperCase()}
          </div>
          {selectedSessions.map(s=>(
            <div key={s.id} style={{marginBottom:12,paddingBottom:12,borderBottom:'1px solid var(--border)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <span className={`hist-badge m-${(s.muscle||"").split("+")[0]}`}>{(s.muscle||"").split("+").map(m=>MUSCLE_LABELS[m]||m).join(" + ")}</span>
                <span style={{fontFamily:'var(--fm)',fontSize:16,fontWeight:700,color:'var(--green)'}}>{(s.total_volume||0).toLocaleString('fr')} kg</span>
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {(s.exercises||[]).map((e,i)=>(
                  <div key={i} style={{background:'var(--s2)',borderRadius:8,padding:'4px 10px',fontSize:11}}>
                    <span style={{color:'var(--text2)',fontWeight:600}}>{e.name}</span>
                    <span style={{color:'var(--text3)',marginLeft:6}}>{e.sets.length} série{e.sets.length>1?'s':''}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Récap annuel */}
      <div style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:16}}>
        <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',letterSpacing:2,textTransform:'uppercase',marginBottom:12}}>Récap {currentYear}</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
          {[
            {label:'Séances totales',val:yearSessions.length,color:'var(--red)'},
            {label:'Volume total',val:`${(yearVol/1000).toFixed(1)}t`,color:'var(--green)'},
            {label:'Meilleur mois',val:monthNames[bestMonth]?.slice(0,4)||'—',color:'var(--blue)'},
            {label:'Groupe favori',val:favMuscle?((MUSCLE_LABELS[favMuscle[0]]||favMuscle[0]).slice(0,8)):' —',color:'var(--gold)'},
          ].map(k=>(
            <div key={k.label} style={{background:'var(--s2)',borderRadius:12,padding:'12px 14px',border:'1px solid var(--border)'}}>
              <div style={{fontSize:10,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{k.label}</div>
              <div style={{fontFamily:'var(--fm)',fontSize:22,fontWeight:800,color:k.color}}>{k.val}</div>
            </div>
          ))}
        </div>

        {/* Heatmap mensuelle */}
        {yearSessions.length > 0 && (
          <div style={{marginTop:14}}>
            <div style={{fontSize:10,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>Activité par mois</div>
            <div style={{display:'flex',gap:3,alignItems:'flex-end',height:40}}>
              {monthCounts.map((count,mi)=>{
                const maxCount = Math.max(...monthCounts,1)
                const h = Math.max(4, Math.round((count/maxCount)*36))
                const isCurrentM = mi === today.getMonth() && year === today.getFullYear()
                return (
                  <div key={mi} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                    <div style={{
                      width:'100%',height:`${h}px`,borderRadius:3,
                      background:count>0?(isCurrentM?'var(--red)':`rgba(255,60,60,${0.2+0.8*(count/maxCount)})`):'var(--s3)',
                      transition:'height .3s',
                    }}/>
                    <div style={{fontSize:8,color:'var(--text3)',fontWeight:600}}>{monthNames[mi].slice(0,1)}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
