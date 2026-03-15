'use client'
import { useEffect, useRef, useState } from 'react'
import { MUSCLE_LABELS, MUSCLE_COLORS } from '../../lib/constants'

const isBW = (name) => (name||'').toLowerCase().includes('pompe') && !(name||'').toLowerCase().includes('lest')

export default function ShareStory({ session, user, prs = [], onClose }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const muscles = (session.muscle||'').split('+').map(m => MUSCLE_LABELS[m]||m)
  const muscleColor = MUSCLE_COLORS[(session.muscle||'').split('+')[0]] || '#ff3c3c'
  const exercises = (session.exercises||[]).filter(ex => !isBW(ex.name))
  const topExos = [...exercises]
    .sort((a,b) => b.sets.reduce((s,st)=>s+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0) - a.sets.reduce((s,st)=>s+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0))
    .slice(0, 4)
  const totalVol = exercises.reduce((a,ex) => a+ex.sets.reduce((b,st)=>b+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0), 0)
  const totalSets = (session.exercises||[]).reduce((a,ex)=>a+ex.sets.length,0)
  const sessionPRs = prs.filter(p => p.date === session.session_date && !p.is_manual)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    // Story format 1080x1920
    canvas.width = 1080
    canvas.height = 1920
    draw(ctx, canvas)
  }, [])

  function hex2rgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `${r},${g},${b}`
  }

  function draw(ctx, canvas) {
    const W = canvas.width, H = canvas.height

    // ── BACKGROUND ──
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    // Subtle grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
    for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

    // Top accent glow
    const glow = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, 600)
    glow.addColorStop(0, `rgba(${hex2rgb(muscleColor)},0.18)`)
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, W, H)

    // Bottom glow
    const glow2 = ctx.createRadialGradient(W/2, H, 0, W/2, H, 500)
    glow2.addColorStop(0, `rgba(${hex2rgb(muscleColor)},0.10)`)
    glow2.addColorStop(1, 'transparent')
    ctx.fillStyle = glow2
    ctx.fillRect(0, 0, W, H)

    // ── HEADER — LOGO ──
    ctx.font = '900 72px "Barlow Condensed", sans-serif'
    ctx.fillStyle = muscleColor
    ctx.letterSpacing = '6px'
    ctx.fillText('LIFT TRACKER', 80, 130)

    // Date
    const dateStr = new Date(session.session_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    ctx.font = '500 34px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText(dateStr.toUpperCase(), 80, 185)

    // Divider line
    ctx.strokeStyle = `rgba(${hex2rgb(muscleColor)},0.4)`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(80, 215); ctx.lineTo(W-80, 215); ctx.stroke()

    // ── MUSCLE BADGE ──
    const badgeY = 260
    const badgeText = muscles.join(' + ').toUpperCase()
    ctx.font = '800 52px "Barlow Condensed", sans-serif'
    const bw = ctx.measureText(badgeText).width
    const bpad = 32
    roundRect(ctx, 80, badgeY, bw+bpad*2, 80, 16)
    ctx.fillStyle = `rgba(${hex2rgb(muscleColor)},0.15)`
    ctx.fill()
    ctx.strokeStyle = muscleColor
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.fillStyle = muscleColor
    ctx.fillText(badgeText, 80+bpad, badgeY+56)

    // ── STATS ROW ──
    const statsY = 420
    const stats = [
      { label: 'VOLUME', value: totalVol >= 1000 ? `${(totalVol/1000).toFixed(1)}T` : `${Math.round(totalVol)}KG` },
      { label: 'SÉRIES', value: String(totalSets) },
      { label: 'EXERCICES', value: String((session.exercises||[]).length) },
    ]
    const colW = (W - 160) / 3
    stats.forEach((s, i) => {
      const x = 80 + i * colW
      // Card bg
      roundRect(ctx, x, statsY, colW - 20, 160, 18)
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1; ctx.stroke()
      // Value
      ctx.font = `900 ${s.value.length > 4 ? 56 : 68}px "Barlow Condensed", sans-serif`
      ctx.fillStyle = muscleColor
      ctx.textAlign = 'center'
      ctx.fillText(s.value, x + (colW-20)/2, statsY + 100)
      // Label
      ctx.font = '600 26px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText(s.label, x + (colW-20)/2, statsY + 142)
    })
    ctx.textAlign = 'left'

    // ── EXERCISES ──
    const exY = 640
    ctx.font = '700 30px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('TOP EXERCICES', 80, exY)

    topExos.forEach((ex, i) => {
      const y = exY + 30 + i * 145
      const exVol = ex.sets.reduce((a,st)=>a+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0)
      const bestSet = ex.sets.reduce((best,st) => (parseFloat(st.w)||0) > (parseFloat(best.w)||0) ? st : best, ex.sets[0]||{r:0,w:0})

      // Card
      roundRect(ctx, 80, y, W-160, 120, 16)
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1; ctx.stroke()

      // Left accent bar
      roundRect(ctx, 80, y, 5, 120, 3)
      ctx.fillStyle = muscleColor
      ctx.fill()

      // Exercise name
      ctx.font = '700 38px "Barlow Condensed", sans-serif'
      ctx.fillStyle = '#ffffff'
      const nameMaxW = W - 340
      let name = ex.name
      while (ctx.measureText(name).width > nameMaxW && name.length > 10) name = name.slice(0,-1)
      if (name !== ex.name) name += '…'
      ctx.fillText(name, 110, y + 52)

      // Sets summary
      const setsStr = `${ex.sets.length} séries · max ${bestSet.w||0}kg`
      ctx.font = '500 28px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText(setsStr, 110, y + 92)

      // Volume
      const volStr = exVol >= 1000 ? `${(exVol/1000).toFixed(1)}t` : `${Math.round(exVol)}kg`
      ctx.font = '800 40px "Barlow Condensed", sans-serif'
      ctx.fillStyle = muscleColor
      ctx.textAlign = 'right'
      ctx.fillText(volStr, W-110, y + 70)
      ctx.textAlign = 'left'
    })

    // ── PRs ──
    if (sessionPRs.length > 0) {
      const prY = exY + 30 + topExos.length * 145 + 30
      roundRect(ctx, 80, prY, W-160, 80 + sessionPRs.length * 70, 16)
      ctx.fillStyle = `rgba(251,191,36,0.08)`
      ctx.fill()
      ctx.strokeStyle = `rgba(251,191,36,0.3)`
      ctx.lineWidth = 1.5; ctx.stroke()

      ctx.font = '700 30px "Barlow", sans-serif'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('🏆  NOUVEAUX PRs', 110, prY + 54)

      sessionPRs.slice(0,2).forEach((pr, i) => {
        ctx.font = '600 28px "Barlow", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(`${pr.exercise}  ·  ${pr.weight}kg × ${pr.reps} rep`, 110, prY + 100 + i * 68)
      })
    }

    // ── NOTES ──
    if (session.notes) {
      const noteY = H - 400
      ctx.font = 'italic 500 34px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      const note = `"${session.notes.slice(0,80)}${session.notes.length>80?'…':'"'}`
      wrapText(ctx, note, 80, noteY, W-160, 44)
    }

    // ── FOOTER ──
    ctx.strokeStyle = `rgba(${hex2rgb(muscleColor)},0.3)`
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(80, H-190); ctx.lineTo(W-80, H-190); ctx.stroke()

    // Avatar circle
    const avX = 80, avY = H - 155
    const drawAvatar = () => {
      ctx.save()
      ctx.beginPath(); ctx.arc(avX+45, avY+45, 45, 0, Math.PI*2)
      ctx.strokeStyle = muscleColor; ctx.lineWidth = 2.5; ctx.stroke()
      ctx.clip()
      if (user?.avatar?.startsWith('http')) {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => {
          ctx.drawImage(img, avX, avY, 90, 90)
          ctx.restore()
          // Redraw text after image loads
          ctx.font = '700 46px "Barlow Condensed", sans-serif'
          ctx.fillStyle = '#ffffff'
          ctx.fillText(user?.username||'', avX+105, avY+35)
          ctx.font = '500 28px "Barlow", sans-serif'
          ctx.fillStyle = 'rgba(255,255,255,0.35)'
          ctx.fillText('LIFT TRACKER  ·  lifttracker.vercel.app', avX+105, avY+75)
          setReady(true)
        }
        img.onerror = () => {
          ctx.restore()
          ctx.fillStyle = 'rgba(255,255,255,0.1)'
          ctx.beginPath(); ctx.arc(avX+45, avY+45, 45, 0, Math.PI*2); ctx.fill()
          ctx.font = '700 38px "Barlow Condensed", sans-serif'
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.textAlign = 'center'
          ctx.fillText('💪', avX+45, avY+57)
          ctx.textAlign = 'left'
          setReady(true)
        }
        img.src = user.avatar
        return // setReady called after image loads
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill()
        ctx.restore()
        ctx.font = '700 38px "Barlow Condensed", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.textAlign = 'center'
        ctx.fillText(user?.avatar||'💪', avX+45, avY+57)
        ctx.textAlign = 'left'
      }
    }
    drawAvatar()

    // Username (always drawn, avatar image redraws on top if http)
    if (!user?.avatar?.startsWith('http')) {
      ctx.font = '700 46px "Barlow Condensed", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(user?.username||'', avX+105, avY+35)

      ctx.font = '500 28px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillText('LIFT TRACKER  ·  lifttracker.vercel.app', avX+105, avY+75)

      setReady(true)
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x+r, y)
    ctx.lineTo(x+w-r, y)
    ctx.quadraticCurveTo(x+w, y, x+w, y+r)
    ctx.lineTo(x+w, y+h-r)
    ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h)
    ctx.lineTo(x+r, y+h)
    ctx.quadraticCurveTo(x, y+h, x, y+h-r)
    ctx.lineTo(x, y+r)
    ctx.quadraticCurveTo(x, y, x+r, y)
    ctx.closePath()
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ')
    let line = ''
    let cy = y
    for (const word of words) {
      const test = line + word + ' '
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line, x, cy); line = word + ' '; cy += lineH
      } else { line = test }
    }
    ctx.fillText(line, x, cy)
  }

  async function share() {
    setDownloading(true)
    const canvas = canvasRef.current
    canvas.toBlob(async blob => {
      const file = new File([blob], `lift-tracker-${session.session_date}.png`, { type: 'image/png' })
      // Try Web Share API (mobile)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Ma séance Lift Tracker',
            text: `${user?.username} vient de s'entraîner 💪`,
          })
          setDownloading(false)
          return
        } catch(e) {
          // User cancelled or error — fallback to download
        }
      }
      // Fallback: direct download
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lift-tracker-${session.session_date}.png`
      a.click()
      URL.revokeObjectURL(url)
      setDownloading(false)
    }, 'image/png')
  }

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--border2)', borderRadius: 20,
        padding: 20, width: '100%', maxWidth: 420, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <div style={{fontFamily:'var(--fm)', fontSize:22, fontWeight:800, color:'var(--red)', letterSpacing:1}}>📸 PARTAGER</div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3)',fontSize:22,cursor:'pointer'}}>×</button>
        </div>

        {/* Preview */}
        <div style={{
          width: '100%', aspectRatio: '9/16', borderRadius: 14, overflow: 'hidden',
          background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative', border: '1px solid var(--border)'
        }}>
          <canvas ref={canvasRef} style={{width:'100%', height:'100%', objectFit:'contain'}} />
          {!ready && <div style={{position:'absolute', fontSize:12, color:'var(--text3)'}}>Génération...</div>}
        </div>

        <button className="btn-primary" onClick={share} disabled={!ready||downloading}>
          {downloading ? '⏳ Préparation...' : '📲 Partager la story'}
        </button>
        <div style={{fontSize:11, color:'var(--text3)', textAlign:'center'}}>
          Sur mobile → ouvre directement le menu de partage 📱<br/>
          Sur PC → télécharge l'image 💻
        </div>
      </div>
    </div>
  )
}
