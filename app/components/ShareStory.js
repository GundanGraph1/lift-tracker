'use client'
import { useEffect, useRef, useState } from 'react'
import { MUSCLE_LABELS, MUSCLE_COLORS } from '../../lib/constants'
import { THEMES, getThemeFromUser } from '../../lib/themes'

const isBW = (name) => (name||'').toLowerCase().includes('pompe') && !(name||'').toLowerCase().includes('lest')

export default function ShareStory({ session, user, prs = [], onClose }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [customColor, setCustomColor] = useState(null)

  const muscles = (session.muscle||'').split('+').map(m => MUSCLE_LABELS[m]||m)
  const muscleColor = MUSCLE_COLORS[(session.muscle||'').split('+')[0]] || '#ff3c3c'
  // Use user's theme accent color if set, otherwise fallback to muscle color
  const { themeKey } = getThemeFromUser(user)
  const themeAccent = THEMES.find(t=>t.key===themeKey)?.preview || muscleColor
  const storyColor = customColor || themeAccent
  const exercises = (session.exercises||[]).filter(ex => !isBW(ex.name))
  const topExos = [...exercises]
    .sort((a,b) => b.sets.reduce((s,st)=>s+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0) - a.sets.reduce((s,st)=>s+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0))
  const totalVol = exercises.reduce((a,ex) => a+ex.sets.reduce((b,st)=>b+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0), 0)
  const totalSets = (session.exercises||[]).reduce((a,ex)=>a+ex.sets.length,0)
  const sessionPRs = prs.filter(p => p.date === session.session_date && !p.is_manual)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    setReady(false)
    const ctx = canvas.getContext('2d')
    canvas.width = 1080
    canvas.height = 1920
    draw(ctx, canvas)
  }, [customColor])

  function hex2rgb(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16)
    return `${r},${g},${b}`
  }

  function draw(ctx, canvas) {
    const muscleCol = storyColor
    const W = canvas.width, H = canvas.height
    // Safe zone: Instagram crops ~60px top/bottom, ~30px sides on some phones
    // We use 100px margin on all sides to be safe
    const M = 100 // margin left/right
    const CONTENT_W = W - M * 2

    // ── BACKGROUND ──
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, W, H)

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'
    ctx.lineWidth = 1
    for (let x = 0; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke() }
    for (let y = 0; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke() }

    // Top glow
    const glow = ctx.createRadialGradient(W/2, 0, 0, W/2, 0, 700)
    glow.addColorStop(0, `rgba(${hex2rgb(muscleCol)},0.2)`)
    glow.addColorStop(1, 'transparent')
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)

    // Bottom glow
    const glow2 = ctx.createRadialGradient(W/2, H, 0, W/2, H, 600)
    glow2.addColorStop(0, `rgba(${hex2rgb(muscleCol)},0.12)`)
    glow2.addColorStop(1, 'transparent')
    ctx.fillStyle = glow2; ctx.fillRect(0, 0, W, H)

    // ── HEADER (y: 120 to 380) ──
    // Logo
    ctx.font = '900 88px "Barlow Condensed", sans-serif'
    ctx.fillStyle = muscleCol
    ctx.textAlign = 'left'
    ctx.fillText('GRINDSET', M, 210)

    // Date
    const dateStr = new Date(session.session_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    ctx.font = '500 36px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(dateStr.toUpperCase(), M, 270)

    // Divider
    ctx.strokeStyle = `rgba(${hex2rgb(muscleCol)},0.5)`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(M, 300); ctx.lineTo(W-M, 300); ctx.stroke()

    // ── MUSCLE BADGE (y: 320) ──
    const badgeText = muscles.join(' + ').toUpperCase()
    ctx.font = '800 56px "Barlow Condensed", sans-serif'
    const bw = ctx.measureText(badgeText).width
    const bpad = 36
    roundRect(ctx, M, 320, bw + bpad*2, 90, 18)
    ctx.fillStyle = `rgba(${hex2rgb(muscleCol)},0.15)`; ctx.fill()
    ctx.strokeStyle = muscleCol; ctx.lineWidth = 2; ctx.stroke()
    ctx.fillStyle = muscleCol
    ctx.fillText(badgeText, M + bpad, 385)

    // ── STATS ROW (y: 450) ──
    const stats = [
      { label: 'VOLUME', value: totalVol >= 1000 ? `${(totalVol/1000).toFixed(1)}T` : `${Math.round(totalVol)}KG` },
      { label: 'SÉRIES', value: String(totalSets) },
      { label: 'EXERCICES', value: String((session.exercises||[]).length) },
    ]
    const colW = CONTENT_W / 3
    stats.forEach((s, i) => {
      const x = M + i * colW
      roundRect(ctx, x + 8, 450, colW - 16, 170, 18)
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke()
      ctx.font = `900 ${s.value.length > 4 ? 60 : 72}px "Barlow Condensed", sans-serif`
      ctx.fillStyle = muscleCol
      ctx.textAlign = 'center'
      ctx.fillText(s.value, x + colW/2, 450 + 108)
      ctx.font = '600 28px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fillText(s.label, x + colW/2, 450 + 152)
    })
    ctx.textAlign = 'left'

    // ── EXERCISES (y: 670 onwards) ──
    let curY = 670
    ctx.font = '700 32px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('TOP EXERCICES', M, curY)
    curY += 20

    // Show ALL exercises, adjust card height to fit
    const allExos = [...topExos, ...(session.exercises||[]).filter(ex => isBW(ex.name))]
    const maxExos = allExos.length
    // Dynamically shrink cards if many exercises
    const availH = H - curY - 300 // leave room for footer
    const exCardH = Math.max(80, Math.min(118, Math.floor(availH / Math.max(maxExos, 1)) - 12))
    allExos.forEach((ex, i) => {
      const y = curY + i * (exCardH + 12)
      const exVol = ex.sets.reduce((a,st)=>a+(parseFloat(st.r)||0)*(parseFloat(st.w)||0),0)
      const bestSet = ex.sets.reduce((best,st) => (parseFloat(st.w)||0) > (parseFloat(best.w)||0) ? st : best, ex.sets[0]||{r:0,w:0})

      roundRect(ctx, M, y, CONTENT_W, exCardH, 16)
      ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1; ctx.stroke()

      // Accent bar
      roundRect(ctx, M, y, 5, exCardH, 3)
      ctx.fillStyle = muscleCol; ctx.fill()

      // Name (truncate if needed)
      const nameFontSize = Math.max(26, Math.floor(exCardH * 0.34))
      ctx.font = `700 ${nameFontSize}px "Barlow Condensed", sans-serif`
      ctx.fillStyle = '#ffffff'
      const nameMaxW = CONTENT_W - 260
      let name = ex.name
      while (ctx.measureText(name).width > nameMaxW && name.length > 8) name = name.slice(0,-1)
      if (name !== ex.name) name += '…'
      ctx.fillText(name, M + 22, y + Math.floor(exCardH * 0.44))

      // Sets info
      const setsStr = `${ex.sets.length} séries · max ${bestSet.w||0}kg`
      ctx.font = `500 ${Math.max(20, Math.floor(exCardH * 0.23))}px "Barlow", sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.45)'
      ctx.fillText(setsStr, M + 22, y + Math.floor(exCardH * 0.78))

      // Volume right
      const volStr = exVol >= 1000 ? `${(exVol/1000).toFixed(1)}t` : `${Math.round(exVol)}kg`
      ctx.font = `800 ${Math.max(28, Math.floor(exCardH * 0.36))}px "Barlow Condensed", sans-serif`
      ctx.fillStyle = muscleCol
      ctx.textAlign = 'right'
      ctx.fillText(volStr, W - M, y + Math.floor(exCardH * 0.60))
      ctx.textAlign = 'left'
    })

    curY += allExos.length * (exCardH + 12) + 20

    // ── PRs ──
    if (sessionPRs.length > 0 && curY < H - 350) {
      roundRect(ctx, M, curY, CONTENT_W, 75 + sessionPRs.slice(0,2).length * 65, 16)
      ctx.fillStyle = `rgba(251,191,36,0.08)`; ctx.fill()
      ctx.strokeStyle = `rgba(251,191,36,0.3)`; ctx.lineWidth = 1.5; ctx.stroke()
      ctx.font = '700 32px "Barlow", sans-serif'
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('🏆  NOUVEAUX PRs', M + 28, curY + 50)
      sessionPRs.slice(0,2).forEach((pr, i) => {
        ctx.font = '500 28px "Barlow", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.7)'
        ctx.fillText(`${pr.exercise}  ·  ${pr.weight}kg × ${pr.reps} rep`, M + 28, curY + 95 + i * 62)
      })
      curY += 75 + sessionPRs.slice(0,2).length * 65 + 20
    }

    // ── NOTES ──
    if (session.notes && curY < H - 330) {
      ctx.font = 'italic 500 32px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      const note = `"${session.notes.slice(0,70)}${session.notes.length>70?'…':'"'}`
      wrapText(ctx, note, M, curY + 40, CONTENT_W, 44)
    }

    // ── FOOTER (fixed at bottom, safe zone) ──
    const footerY = H - 220
    ctx.strokeStyle = `rgba(${hex2rgb(muscleCol)},0.35)`
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(M, footerY); ctx.lineTo(W-M, footerY); ctx.stroke()

    // Avatar
    const avCX = M + 52, avCY = footerY + 75
    const drawAvatar = () => {
      ctx.save()
      ctx.beginPath(); ctx.arc(avCX, avCY, 52, 0, Math.PI*2)
      ctx.strokeStyle = muscleCol; ctx.lineWidth = 3; ctx.stroke()
      ctx.clip()
      if (user?.avatar?.startsWith('http')) {
        const img = new Image(); img.crossOrigin = 'anonymous'
        img.onload = () => {
          // object-fit: cover — crop image to fill circle without stretching
          const r = 52
          const iW = img.naturalWidth, iH = img.naturalHeight
          const scale = Math.max((r*2) / iW, (r*2) / iH)
          const dW = iW * scale, dH = iH * scale
          const dx = avCX - r - (dW - r*2) / 2
          const dy = avCY - r - (dH - r*2) / 2
          ctx.drawImage(img, dx, dy, dW, dH)
          ctx.restore()
          drawFooterText()
          setReady(true)
        }
        img.onerror = () => {
          ctx.restore()
          ctx.beginPath(); ctx.arc(avCX, avCY, 52, 0, Math.PI*2)
          ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill()
          ctx.font = '700 42px "Barlow Condensed", sans-serif'
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.textAlign = 'center'
          ctx.fillText(user?.avatar||'💪', avCX, avCY+14)
          ctx.textAlign = 'left'
          drawFooterText()
          setReady(true)
        }
        img.src = user.avatar
        return
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.1)'; ctx.fill()
        ctx.restore()
        ctx.font = '700 42px "Barlow Condensed", sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.textAlign = 'center'
        ctx.fillText(user?.avatar||'💪', avCX, avCY+14)
        ctx.textAlign = 'left'
        drawFooterText()
        setReady(true)
      }
    }

    const drawFooterText = () => {
      ctx.font = '700 48px "Barlow Condensed", sans-serif'
      ctx.fillStyle = '#ffffff'
      ctx.fillText(user?.username||'', avCX + 72, footerY + 62)
      ctx.font = '500 30px "Barlow", sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.fillText('grindset.app', avCX + 72, footerY + 105)
    }

    drawAvatar()
    if (!user?.avatar?.startsWith('http')) {
      // already called inside drawAvatar
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
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
      const isAndroid = /Android/i.test(navigator.userAgent)
      const isMobile = isIOS || isAndroid

      // Sur mobile : Web Share API avec fichier → donne accès direct à Instagram Stories
      if (isMobile && navigator.canShare) {
        const file = new File([blob], 'lift-story.png', { type: 'image/png' })
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Ma séance Grindset',
            })
            setDownloading(false)
            return
          } catch (err) {
            // Annulé par l'utilisateur ou refusé — on fallback sur téléchargement
            if (err.name === 'AbortError') { setDownloading(false); return }
          }
        }
      }

      // Fallback : téléchargement + ouvrir Instagram
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = 'lift-tracker-story.png'
      a.click()
      URL.revokeObjectURL(blobUrl)
      if (isMobile) {
        setTimeout(() => { window.location.href = 'instagram://story-camera' }, 1200)
      }
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

        {/* Sélecteur de couleur */}
        <div>
          <div style={{fontSize:11,color:'var(--text3)',letterSpacing:1,textTransform:'uppercase',marginBottom:8,fontWeight:700}}>Couleur de la story</div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {[
              {c:null,    l:'Thème'},
              {c:'#ff073b',l:'Rouge'},
              {c:'#3b82f6',l:'Bleu'},
              {c:'#22c55e',l:'Vert'},
              {c:'#f97316',l:'Orange'},
              {c:'#a855f7',l:'Violet'},
              {c:'#fbbf24',l:'Or'},
              {c:'#ec4899',l:'Rose'},
              {c:'#14b8a6',l:'Teal'},
            ].map(({c,l})=>{
              const active = customColor === c
              const preview = c || themeAccent
              return (
                <button key={l} onClick={()=>setCustomColor(c)} style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:4,
                  padding:'6px 8px',borderRadius:10,border:`2px solid ${active?preview:'var(--border)'}`,
                  background:active?`${preview}15`:'var(--s2)',cursor:'pointer',
                  transition:'all .15s',minWidth:44,
                }}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:preview,boxShadow:active?`0 0 6px ${preview}60`:'none'}}/>
                  <span style={{fontSize:9,fontWeight:700,color:active?preview:'var(--text3)'}}>{l}</span>
                </button>
              )
            })}
          </div>
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
