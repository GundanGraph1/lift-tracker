'use client'
import { useState, useEffect } from 'react'
import { db } from '../../lib/supabase'
import { useStore, actions } from '../../lib/store'
import { BADGES } from '../../lib/constants'

const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']

const RANK_PHRASES = {
  1: [
    "Personne ne t'a arrêté ce mois-ci. 👑",
    "T'as écrasé tout le monde. Mérite.",
    "Le plus lourd du crew. Champion.",
    "Inarrêtable. C'est toi le patron.",
  ],
  2: [
    "Si proche du trône. Le mois prochain c'est toi.",
    "Top 2, c'est pas rien. Reviens plus fort.",
    "Le podium, c'est déjà solide.",
    "T'as failli. La prochaine fois c'est ta couronne.",
  ],
  3: [
    "Top 3 dans le crew, respecte toi.",
    "Sur le podium. La progression continue.",
    "T'es dans la course. Lâche pas.",
  ],
  default: [
    "Ce mois c'était pas le tien. Le prochain le sera.",
    "Le classement t'attend. Reviens plus fort.",
    "C'est dans la régularité que ça se gagne.",
    "Chaque séance compte. Continue.",
  ]
}

function getPhrase(rank) {
  const arr = RANK_PHRASES[rank] || RANK_PHRASES.default
  return arr[Math.floor(Math.random() * arr.length)]
}

function getRankEmoji(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return `#${rank}`
}

export default function MonthlyRecap({ onClose }) {
  const currentUser = useStore(s => s.currentUser)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecap()
  }, [])

  async function loadRecap() {
    setLoading(true)
    try {
      // Mois précédent
      const now = new Date()
      const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
      const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      const monthStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`

      // Calculer le classement du mois précédent
      const { data: sessions } = await db.from('sessions')
        .select('user_id, total_volume')
        .gte('session_date', `${monthStr}-01`)
        .lte('session_date', `${monthStr}-31`)

      if (!sessions?.length) { setLoading(false); return }

      // Agréger par user
      const volumeByUser = {}
      sessions.forEach(s => {
        volumeByUser[s.user_id] = (volumeByUser[s.user_id] || 0) + (s.total_volume || 0)
      })

      // Récupérer les profils
      const userIds = Object.keys(volumeByUser).map(Number)
      const { data: users } = await db.from('users').select('id, username, avatar').in('id', userIds)

      // Trier
      const ranked = Object.entries(volumeByUser)
        .map(([uid, vol]) => ({
          user: users?.find(u => u.id === parseInt(uid)),
          volume: vol,
        }))
        .filter(r => r.user)
        .sort((a, b) => b.volume - a.volume)
        .map((r, i) => ({ ...r, rank: i + 1 }))

      const myRank = ranked.find(r => r.user.id === currentUser.id)

      // Sauvegarder le champion en base si pas encore fait
      if (ranked.length > 0) {
        await saveChampions(ranked.slice(0, 3), prevYear, prevMonth + 1)
      }

      setData({ ranked: ranked.slice(0, 5), myRank, month: prevMonth, year: prevYear })
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  async function saveChampions(top3, year, month) {
    // Vérifier si déjà enregistré
    const { data: existing } = await db.from('monthly_champions')
      .select('id').eq('year', year).eq('month', month).limit(1)
    if (existing?.length) return

    // Insérer le podium
    const rows = top3.map((r, i) => ({
      user_id: r.user.id,
      year,
      month,
      rank: i + 1,
      total_volume: r.volume,
    }))
    await db.from('monthly_champions').insert(rows)

    // Attribuer badges
    for (const r of top3) {
      const badgeKey = r.rank === 1 ? 'champion_month' : 'podium_month'
      const badgeLabel = r.rank === 1 ? `champion_month_${year}_${month}` : `podium_month_${year}_${month}`
      const { data: existing } = await db.from('badges')
        .select('id').eq('user_id', r.user.id).eq('badge_key', badgeLabel).limit(1)
      if (!existing?.length) {
        await db.from('badges').insert([{
          user_id: r.user.id,
          badge_key: badgeLabel,
          unlocked_at: new Date().toISOString().split('T')[0],
        }])
      }
    }
  }

  async function markSeen() {
    const now = new Date()
    await db.from('monthly_recap_seen').upsert([{
      user_id: currentUser.id,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }])
    onClose()
  }

  if (loading) return null
  if (!data) return null

  const { ranked, myRank, month, year } = data
  const phrase = getPhrase(myRank?.rank)
  const champion = ranked[0]

  return (
    <div style={{
      position:'fixed',inset:0,zIndex:1000,
      background:'rgba(0,0,0,0.85)',
      display:'flex',alignItems:'center',justifyContent:'center',
      padding:20,
    }}>
      <div style={{
        background:'var(--s1)',border:'1px solid var(--border2)',
        borderRadius:24,padding:24,width:'100%',maxWidth:400,
        maxHeight:'85vh',overflowY:'auto',
      }}>

        {/* Header */}
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:48,marginBottom:8}}>🏆</div>
          <div style={{fontFamily:'var(--fm)',fontSize:28,fontWeight:900,letterSpacing:3,color:'var(--text)',textTransform:'uppercase'}}>
            Récap {MONTH_NAMES[month]}
          </div>
          <div style={{fontSize:13,color:'var(--text3)',marginTop:4}}>{year}</div>
        </div>

        {/* Champion du mois */}
        {champion && (
          <div style={{
            background:'linear-gradient(135deg,rgba(251,191,36,.12),rgba(251,191,36,.04))',
            border:'1px solid rgba(251,191,36,.3)',
            borderRadius:16,padding:'16px',marginBottom:16,textAlign:'center',
          }}>
            <div style={{fontSize:11,fontWeight:700,letterSpacing:2,color:'#fbbf24',textTransform:'uppercase',marginBottom:8}}>Champion du mois</div>
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:12}}>
              <div style={{width:48,height:48,borderRadius:'50%',background:'var(--s3)',overflow:'hidden',border:'2px solid #fbbf24',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>
                {champion.user.avatar?.startsWith('http') || champion.user.avatar?.startsWith('data:')
                  ? <img src={champion.user.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                  : <span>{champion.user.avatar || '💪'}</span>
                }
              </div>
              <div>
                <div style={{fontFamily:'var(--fm)',fontSize:22,fontWeight:800,color:'#fbbf24'}}>{champion.user.username}</div>
                <div style={{fontSize:12,color:'var(--text3)'}}>{(champion.volume/1000).toFixed(1)}t soulevées</div>
              </div>
              <div style={{fontSize:32,filter:'drop-shadow(0 0 8px rgba(251,191,36,.6))'}}>👑</div>
            </div>
          </div>
        )}

        {/* Podium complet */}
        <div style={{marginBottom:16}}>
          {ranked.map((r, i) => {
            const isMe = r.user.id === currentUser.id
            return (
              <div key={r.user.id} style={{
                display:'flex',alignItems:'center',gap:12,
                padding:'10px 12px',borderRadius:12,marginBottom:6,
                background:isMe?'rgba(255,7,59,.08)':'var(--s2)',
                border:`1px solid ${isMe?'rgba(255,7,59,.3)':'var(--border)'}`,
              }}>
                <div style={{width:28,textAlign:'center',fontSize:i<3?18:13,fontWeight:700,color:i===0?'#fbbf24':i===1?'#94a3b8':i===2?'#cd7c2e':'var(--text3)'}}>
                  {getRankEmoji(r.rank)}
                </div>
                <div style={{width:32,height:32,borderRadius:'50%',background:'var(--s3)',overflow:'hidden',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>
                  {r.user.avatar?.startsWith('http') || r.user.avatar?.startsWith('data:')
                    ? <img src={r.user.avatar} style={{width:'100%',height:'100%',objectFit:'cover'}} alt=""/>
                    : <span>{r.user.avatar || '💪'}</span>
                  }
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:isMe?'var(--red)':'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r.user.username}{isMe?' (toi)':''}
                  </div>
                </div>
                <div style={{fontFamily:'var(--fm)',fontSize:15,fontWeight:700,color:'var(--text2)',flexShrink:0}}>
                  {(r.volume/1000).toFixed(1)}t
                </div>
              </div>
            )
          })}
        </div>

        {/* Message perso */}
        {myRank && (
          <div style={{
            background:'var(--s2)',border:'1px solid var(--border)',
            borderRadius:14,padding:'14px 16px',marginBottom:20,
            textAlign:'center',
          }}>
            <div style={{fontSize:24,marginBottom:6}}>{getRankEmoji(myRank.rank)}</div>
            <div style={{fontFamily:'var(--fm)',fontSize:18,fontWeight:800,color:'var(--text)',marginBottom:4}}>
              Tu étais {myRank.rank === 1 ? '1er' : myRank.rank === 2 ? '2ème' : myRank.rank === 3 ? '3ème' : `${myRank.rank}ème`}
            </div>
            <div style={{fontSize:13,color:'var(--text2)',fontStyle:'italic'}}>
              {phrase}
            </div>
            {myRank.rank <= 3 && (
              <div style={{marginTop:8,fontSize:11,color:'#fbbf24',fontWeight:700}}>
                🏅 Badge {myRank.rank === 1 ? 'Champion du mois' : 'Podium du mois'} débloqué !
              </div>
            )}
          </div>
        )}

        <button
          onClick={markSeen}
          style={{
            width:'100%',padding:'14px',borderRadius:14,
            background:'var(--red)',border:'none',
            color:'white',fontFamily:'var(--fm)',fontWeight:800,
            fontSize:16,letterSpacing:1,cursor:'pointer',
            textTransform:'uppercase',
          }}
        >
          Let&apos;s go {MONTH_NAMES[new Date().getMonth()]} 🔥
        </button>
      </div>
    </div>
  )
}
