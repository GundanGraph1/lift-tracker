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



  async function draw(ctx, canvas) {
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

    // ── HEADER — Logo typo chargé depuis /public/logo_typo.svg ──
    // -- HEADER -- Logo typo embarque en data URL
    const LOGO_DATA_URL = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20391.99%20115.3%22%3E%3Cg%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M71.84%2C76.86h-12.72c-2.17%2C0-4.08%2C1.48-4.55%2C3.6-1.64%2C7.4-8.26%2C12.95-16.14%2C12.95s-14.77-5.78-16.24-13.41c-.35-1.81-1.87-3.14-3.71-3.14H3.98c-2.25%2C0-4%2C1.96-3.76%2C4.2%2C2.09%2C19.26%2C18.4%2C34.24%2C38.2%2C34.24s35.41-14.35%2C38.05-33.02c.4-2.85-1.75-5.42-4.63-5.42Z%22/%3E%3Cpath%20d%3D%22M82.99%2C0h-44.56C16.3%2C0-1.46%2C18.7.09%2C41.15c1.31%2C18.95%2C16.66%2C34.3%2C35.61%2C35.61%2C22.45%2C1.55%2C41.15-16.21%2C41.15-38.33v-.04c0-2.4-1.95-4.34-4.35-4.34h-13.12c-2.41%2C0-4.43%2C1.92-4.43%2C4.33%2C0%2C.36%2C0%2C.73-.03%2C1.1-.48%2C7.74-6.45%2C14.25-14.14%2C15.33-10.54%2C1.47-19.56-7.08-18.87-17.49.56-8.5%2C8.41-15.42%2C16.93-15.42h44.14c3.33%2C0%2C6.02-2.7%2C6.02-6.02V6.02c0-3.33-2.7-6.02-6.02-6.02Z%22/%3E%3Cpath%20d%3D%22M115.05%2C43.21c-2.04.22-3.98.88-5.81%2C1.98-2.27%2C1.33-4.21%2C3.18-5.81%2C5.51v-5.77c0-.8-.65-1.44-1.44-1.44h-11.38c-.8%2C0-1.44.65-1.44%2C1.44v37.91c0%2C.8.65%2C1.44%2C1.44%2C1.44h11.38c.8%2C0%2C1.44-.65%2C1.44-1.44v-16.37c0-3%2C.76-5.12%2C2.24-6.33%2C1.51-1.21%2C3.82-1.82%2C6.9-1.82h4v-13.68c0-.83-.7-1.53-1.52-1.44Z%22/%3E%3Cpath%20d%3D%22M123.17%2C43.49h11.21c.84%2C0%2C1.51.68%2C1.51%2C1.51v37.77c0%2C.84-.68%2C1.51-1.51%2C1.51h-11.21c-.84%2C0-1.51-.68-1.51-1.51v-37.77c0-.84.68-1.51%2C1.51-1.51Z%22/%3E%3Cpath%20d%3D%22M170.72%2C43.13c-2.76%2C0-5.21.58-7.33%2C1.73-2.15%2C1.12-3.85%2C2.63-5.09%2C4.45v-4.22c0-.88-.71-1.6-1.6-1.6h-11.07c-.88%2C0-1.6.71-1.6%2C1.6v37.6c0%2C.88.71%2C1.6%2C1.6%2C1.6h11.07c.88%2C0%2C1.6-.71%2C1.6-1.6v-20.3c0-2.3.61-4.15%2C1.82-5.48s2.88-2%2C5-2%2C3.66.67%2C4.88%2C2c1.21%2C1.33%2C1.82%2C3.18%2C1.82%2C5.48v20.3c0%2C.88.71%2C1.6%2C1.6%2C1.6h11.04c.88%2C0%2C1.6-.71%2C1.6-1.6v-22.18c0-5.33-1.36-9.57-4.12-12.69-2.79-3.12-6.51-4.69-11.21-4.69Z%22/%3E%3Cpath%20d%3D%22M233.22%2C30.5h-10.36c-1.09%2C0-1.98.89-1.98%2C1.98v16.61c-1.15-1.88-2.79-3.36-4.85-4.45-2.06-1.09-4.39-1.64-7-1.64-3.24%2C0-6.21.85-8.87%2C2.54-2.67%2C1.7-4.76%2C4.12-6.3%2C7.27-1.51%2C3.15-2.27%2C6.81-2.27%2C11.02s.76%2C7.93%2C2.27%2C11.08c1.54%2C3.18%2C3.63%2C5.63%2C6.27%2C7.33%2C2.63%2C1.7%2C5.57%2C2.54%2C8.81%2C2.54%2C2.79%2C0%2C5.18-.58%2C7.21-1.7%2C2.03-1.09%2C3.6-2.6%2C4.72-4.48v3.68c0%2C1.09.89%2C1.98%2C1.98%2C1.98h10.36c1.09%2C0%2C1.98-.89%2C1.98-1.98v-49.83c0-1.09-.89-1.98-1.98-1.98ZM218.81%2C70.11c-1.45%2C1.48-3.21%2C2.24-5.27%2C2.24s-3.91-.76-5.33-2.27c-1.39-1.54-2.09-3.6-2.09-6.24s.7-4.72%2C2.09-6.21c1.42-1.48%2C3.18-2.21%2C5.33-2.21s3.82.76%2C5.27%2C2.24c1.42%2C1.51%2C2.15%2C3.57%2C2.15%2C6.18s-.73%2C4.75-2.15%2C6.27Z%22/%3E%3Cpath%20d%3D%22M270.27%2C61.54c-1.97-.79-4.42-1.48-7.39-2.12-2.45-.55-4.27-1.06-5.36-1.57-1.12-.48-1.7-1.24-1.7-2.21%2C0-.76.3-1.36.94-1.82.58-.42%2C1.48-.64%2C2.63-.64%2C1.51%2C0%2C2.7.33%2C3.6%2C1.03.58.48%2C1.03%2C1.08%2C1.34%2C1.81.31.74%2C1.05%2C1.22%2C1.85%2C1.22h8.9c1.34%2C0%2C2.34-1.28%2C2-2.58-.81-3.09-2.41-5.66-4.82-7.74-3.06-2.6-7.24-3.91-12.57-3.91-3.6%2C0-6.66.58-9.21%2C1.73-2.54%2C1.18-4.45%2C2.73-5.78%2C4.69-1.3%2C1.97-1.94%2C4.15-1.94%2C6.57%2C0%2C2.82.7%2C5.06%2C2.12%2C6.69%2C1.42%2C1.64%2C3.12%2C2.85%2C5.06%2C3.57%2C1.94.73%2C4.36%2C1.36%2C7.27%2C1.94%2C2.57.61%2C4.42%2C1.12%2C5.51%2C1.61%2C1.12.48%2C1.7%2C1.24%2C1.7%2C2.27%2C0%2C.76-.36%2C1.39-1.03%2C1.88-.67.48-1.61.73-2.76.73-1.51%2C0-2.76-.36-3.79-1.09-.69-.49-1.19-1.1-1.5-1.85-.31-.74-1.04-1.21-1.84-1.21h-9.87c-1.33%2C0-2.35%2C1.26-2.01%2C2.55.45%2C1.71%2C1.26%2C3.29%2C2.4%2C4.75%2C1.67%2C2.18%2C3.94%2C3.88%2C6.81%2C5.09%2C2.88%2C1.24%2C6.18%2C1.88%2C9.84%2C1.88%2C3.45%2C0%2C6.45-.55%2C8.99-1.64%2C2.54-1.09%2C4.51-2.6%2C5.88-4.48%2C1.39-1.88%2C2.06-4.03%2C2.06-6.39%2C0-2.97-.73-5.3-2.21-7.03-1.45-1.73-3.18-2.97-5.15-3.73Z%22/%3E%3Cpath%20d%3D%22M313.7%2C45.46c-3.12-1.64-6.66-2.45-10.69-2.45s-7.66.85-10.78%2C2.54c-3.12%2C1.7-5.57%2C4.09-7.3%2C7.21-1.76%2C3.15-2.64%2C6.84-2.64%2C11.08s.88%2C8%2C2.67%2C11.15c1.76%2C3.15%2C4.21%2C5.57%2C7.33%2C7.27%2C3.12%2C1.7%2C6.69%2C2.54%2C10.72%2C2.54%2C3.33%2C0%2C6.39-.64%2C9.18-1.91%2C2.76-1.24%2C5.03-3%2C6.84-5.18%2C1.3-1.58%2C2.3-3.31%2C2.99-5.19.42-1.14-.43-2.35-1.64-2.35h-11.85c-.62%2C0-1.15.36-1.5.87-1.05%2C1.56-2.58%2C2.34-4.59%2C2.34-1.7%2C0-3.09-.55-4.18-1.64-1.09-1.09-1.7-2.76-1.85-5h26.95c.15-1.09.21-2.21.21-3.33%2C0-4.18-.88-7.78-2.6-10.87-1.76-3.06-4.18-5.42-7.27-7.09ZM296.47%2C59.84c.33-1.82%2C1.06-3.21%2C2.18-4.18%2C1.12-.94%2C2.54-1.39%2C4.3-1.39s3.18.48%2C4.36%2C1.48c1.15%2C1%2C1.73%2C2.36%2C1.73%2C4.09h-12.57Z%22/%3E%3Cpath%20d%3D%22M349.31%2C72.14c-1.21%2C0-2.06-.24-2.57-.73s-.76-1.27-.76-2.39v-12.17c0-.82.67-1.49%2C1.49-1.49h4.41c.82%2C0%2C1.49-.67%2C1.49-1.49v-8.89c0-.82-.67-1.49-1.49-1.49h-4.41c-.82%2C0-1.49-.67-1.49-1.49v-6.89c0-.82-.67-1.49-1.49-1.49h-11.34c-.82%2C0-1.49.67-1.49%2C1.49v6.89c0%2C.82-.67%2C1.49-1.49%2C1.49h-2.05c-.82%2C0-1.49.67-1.49%2C1.49v8.89c0%2C.82.67%2C1.49%2C1.49%2C1.49h2.05c.82%2C0%2C1.49.67%2C1.49%2C1.49v11.96c0%2C10.3%2C5.21%2C15.48%2C15.63%2C15.48h4.69c.82%2C0%2C1.49-.67%2C1.49-1.49v-10.65h-4.15Z%22/%3E%3Cpath%20d%3D%22M362.97%2C8.39c-5.18%2C0-9.36%2C4.2-9.36%2C9.38s4.19%2C9.38%2C9.36%2C9.38%2C9.38-4.2%2C9.38-9.38-4.2-9.38-9.38-9.38ZM362.97%2C24.94c-3.95%2C0-7.16-3.21-7.16-7.17s3.21-7.16%2C7.16-7.16%2C7.17%2C3.21%2C7.17%2C7.16-3.21%2C7.17-7.17%2C7.17Z%22/%3E%3Cpath%20d%3D%22M362.42%2C15.09c1.27-.29%2C2.58.34%2C3.14%2C1.58h2.32c-.58-2.5-2.97-4.15-5.49-3.82-2.92.39-4.81%2C3.12-4.2%2C5.99.34%2C1.6%2C1.45%2C2.88%2C2.97%2C3.51%2C1.97.81%2C4.18.3%2C5.58-1.3.57-.65%2C1.01-1.38%2C1.12-2.29l-2.26.02c-.53%2C1.31-1.82%2C1.93-3.11%2C1.69-1.27-.24-2.19-1.35-2.21-2.67-.02-1.28.89-2.43%2C2.15-2.72Z%22/%3E%3Ccircle%20cx%3D%22384.69%22%20cy%3D%2276.97%22%20r%3D%227.31%22/%3E%3C/g%3E%3C/svg%3E"
    const logoImg = new Image()
    logoImg.src = LOGO_DATA_URL
    await new Promise(resolve => {
      logoImg.onload = () => {
        const tmpC = document.createElement('canvas')
        const logoW = 520, logoH = Math.round(520 * 115.3 / 391.99)
        tmpC.width = logoW; tmpC.height = logoH
        const tmpCtx = tmpC.getContext('2d')
        tmpCtx.drawImage(logoImg, 0, 0, logoW, logoH)
        tmpCtx.globalCompositeOperation = 'source-in'
        tmpCtx.fillStyle = muscleCol
        tmpCtx.fillRect(0, 0, logoW, logoH)
        ctx.drawImage(tmpC, M, 100)
        resolve()
      }
      logoImg.onerror = () => {
        ctx.font = '900 88px "Barlow Condensed", sans-serif'
        ctx.fillStyle = muscleCol
        ctx.fillText('GRINDSET', M, 210)
        resolve()
      }
    })

    // Date
    const dateStr = new Date(session.session_date+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})
    ctx.font = '500 28px "Barlow", sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText(dateStr.toUpperCase(), M + 117, 245, 520 - 110)

    // Divider
    ctx.strokeStyle = `rgba(${hex2rgb(muscleCol)},0.5)`
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(M, 285); ctx.lineTo(W-M, 285); ctx.stroke()

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

    // ── LOGO SEUL en bas à droite ──
    const logoSeulData = "data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20viewBox%3D%220%200%20331.8%20383.5%22%3E%3Cg%20fill%3D%22white%22%3E%3Cpath%20d%3D%22M217.25%2C267.27h-38.46c-6.55%2C0-12.34%2C4.48-13.76%2C10.87-4.97%2C22.39-24.98%2C39.17-48.82%2C39.17s-44.66-17.47-49.11-40.54c-1.05-5.46-5.67-9.5-11.23-9.5H12.05c-6.81%2C0-12.1%2C5.93-11.36%2C12.69%2C6.32%2C58.23%2C55.63%2C103.54%2C115.52%2C103.54s107.09-43.4%2C115.05-99.84c1.22-8.63-5.3-16.39-14.01-16.39Z%22/%3E%3Cpath%20d%3D%22M250.96%2C34.86H116.2C49.3%2C34.86-4.4%2C91.4.29%2C159.3c3.95%2C57.3%2C50.38%2C103.72%2C107.67%2C107.67%2C67.9%2C4.68%2C124.44-49.02%2C124.44-115.92v-.14c0-7.26-5.89-13.14-13.14-13.14h-39.67c-7.28%2C0-13.41%2C5.81-13.38%2C13.1%2C0%2C1.1-.03%2C2.21-.1%2C3.33-1.45%2C23.42-19.51%2C43.1-42.74%2C46.35-31.89%2C4.46-59.14-21.4-57.06-52.88%2C1.7-25.7%2C25.42-46.64%2C51.18-46.64h133.47c10.06%2C0%2C18.21-8.15%2C18.21-18.21v-29.77c0-10.06-8.15-18.21-18.21-18.21Z%22/%3E%3Cpath%20d%3D%22M313.05%2C0c-10.35%2C0-18.71%2C8.4-18.71%2C18.74s8.37%2C18.74%2C18.71%2C18.74%2C18.74-8.4%2C18.74-18.74S323.4%2C0%2C313.05%2C0ZM313.05%2C33.08c-7.89%2C0-14.31-6.42-14.31-14.34s6.42-14.31%2C14.31-14.31%2C14.34%2C6.42%2C14.34%2C14.31-6.42%2C14.34-14.34%2C14.34Z%22/%3E%3Cpath%20d%3D%22M322.82%2C20.72c-.23%2C1.82-1.1%2C3.27-2.25%2C4.58-2.8%2C3.19-7.21%2C4.22-11.14%2C2.6-3.05-1.25-5.26-3.82-5.94-7.01-1.21-5.75%2C2.57-11.21%2C8.4-11.98%2C5.04-.67%2C9.81%2C2.62%2C10.96%2C7.63h-4.63c-1.13-2.49-3.74-3.75-6.27-3.17-2.51.57-4.34%2C2.87-4.29%2C5.43.05%2C2.62%2C1.88%2C4.86%2C4.42%2C5.33%2C2.59.48%2C5.17-.76%2C6.22-3.38l4.52-.03Z%22/%3E%3C/g%3E%3C/svg%3E"
    const logoSeulImg = new Image()
    logoSeulImg.src = logoSeulData
    await new Promise(resolve => {
      logoSeulImg.onload = () => {
        const lsW = 100, lsH = Math.round(100 * 383.5 / 331.8)
        const tmpLS = document.createElement('canvas')
        tmpLS.width = lsW; tmpLS.height = lsH
        const tmpLSCtx = tmpLS.getContext('2d')
        tmpLSCtx.drawImage(logoSeulImg, 0, 0, lsW, lsH)
        tmpLSCtx.globalCompositeOperation = 'source-in'
        tmpLSCtx.fillStyle = muscleCol
        tmpLSCtx.fillRect(0, 0, lsW, lsH)
        ctx.drawImage(tmpLS, W - M - lsW, avCY - lsH/2)
        resolve()
      }
      logoSeulImg.onerror = () => resolve()
    })

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
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {/* Thème actuel */}
            {[{c:null, l:'Thème'}].concat(
              THEMES.map(t=>({c:t.preview, l:t.name, premium:t.premium||false}))
            ).map(({c,l,premium})=>{
              const active = customColor === c
              const preview = c || themeAccent
              return (
                <button key={l} onClick={()=>setCustomColor(c)} style={{
                  display:'flex',flexDirection:'column',alignItems:'center',gap:3,
                  padding:'6px 6px',borderRadius:10,border:`2px solid ${active?preview:'var(--border)'}`,
                  background:active?`${preview}15`:'var(--s2)',cursor:'pointer',
                  transition:'all .15s',minWidth:40,position:'relative',
                }}>
                  <div style={{width:18,height:18,borderRadius:'50%',background:preview,boxShadow:active?`0 0 8px ${preview}80`:'none',border:premium?`1.5px solid ${preview}`:'none'}}/>
                  <span style={{fontSize:8,fontWeight:700,color:active?preview:'var(--text3)',maxWidth:36,textAlign:'center',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l}</span>
                  {premium && <span style={{position:'absolute',top:2,right:2,fontSize:6,color:'var(--gold)'}}>★</span>}
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
