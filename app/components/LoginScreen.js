'use client'
import { useEffect, useState } from 'react'
import { db } from '../../lib/supabase'
import { actions } from '../../lib/store'
import Toast, { showToast } from './Toast'

export default function LoginScreen() {
  const [users, setUsers] = useState([])
  const [screen, setScreen] = useState('profiles')
  const [pinTarget, setPinTarget] = useState(null)
  const [pinBuffer, setPinBuffer] = useState('')
  const [pinError, setPinError] = useState('')
  const [search, setSearch] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newPhoto, setNewPhoto] = useState(null)
  const [newPhotoFile, setNewPhotoFile] = useState(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [newGender, setNewGender] = useState('male')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadUsers() }, [])

  useEffect(() => {
    if (screen !== 'pin') return
    const handler = (e) => {
      if (e.key >= '0' && e.key <= '9') handlePin(e.key)
      else if (e.key === 'Backspace') delPin()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [screen, pinBuffer, pinTarget])

  async function loadUsers() {
    const { data } = await db.from('users').select('*').order('created_at')
    setUsers(data || [])
  }

  function selectProfile(user) {
    setPinTarget(user); setPinBuffer(''); setPinError(''); setScreen('pin')
  }

  function handlePin(digit) {
    if (pinBuffer.length >= 4) return
    const next = pinBuffer + digit
    setPinBuffer(next)
    if (next.length === 4) setTimeout(() => checkPin(next), 150)
  }

  function delPin() { setPinBuffer(p => p.slice(0,-1)); setPinError('') }

  function checkPin(buf) {
    if (buf === String(pinTarget.pin)) {
      localStorage.setItem('lt_user_id', pinTarget.id)
      actions.setCurrentUser(pinTarget)
    } else {
      setPinError('Code incorrect, réessaie')
      setPinBuffer('')
    }
  }

  function previewPhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    setNewPhotoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setNewPhoto(ev.target.result)
    reader.readAsDataURL(file)
  }

  // Liste de mots interdits dans les pseudos
  const BANNED_WORDS = [
    'hitler','nazi','heil','nigger','nigga','nègre','pédophile','pedophile',
    'pedo','isis','daesh','террорист','admin','pornhub','xxx','sex','porn',
    'fuck','putain','fdp','connard','enculé','salope','pute','merde',
  ]

  function checkBannedWords(username) {
    const lower = username.toLowerCase().replace(/[^a-z0-9]/g,'')
    return BANNED_WORDS.some(w => lower.includes(w.replace(/[^a-z0-9]/g,'')))
  }

  async function createProfile() {
    if (!newUsername.trim()) { showToast('Entre un pseudo !', 'var(--orange)'); return }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { showToast('PIN = 4 chiffres !', 'var(--orange)'); return }

    // Vérification mots interdits
    if (checkBannedWords(newUsername)) {
      showToast('❌ Ce pseudo n\'est pas autorisé', 'var(--red)'); return
    }

    // Vérification pseudo unique (insensible à la casse)
    const alreadyExists = users.some(u => u.username.trim().toLowerCase() === newUsername.trim().toLowerCase())
    if (alreadyExists) {
      showToast('❌ Ce pseudo est déjà pris !', 'var(--orange)'); return
    }

    setCreating(true)
    let avatarUrl = '💪'
    if (newPhotoFile) {
      const ext = newPhotoFile.name.split('.').pop()
      const fname = `${Date.now()}.${ext}`
      const { error: upErr } = await db.storage.from('avatars').upload(fname, newPhotoFile, { upsert: true })
      if (!upErr) {
        const { data: urlData } = db.storage.from('avatars').getPublicUrl(fname)
        avatarUrl = urlData.publicUrl
      }
    }
    const { data, error } = await db.from('users').insert([{ username: newUsername.trim(), pin: newPin, avatar: avatarUrl, is_private: isPrivate, gender: newGender }]).select().single()
    setCreating(false)
    if (error) { showToast('Erreur : ' + error.message, 'var(--red)'); return }
    showToast('✅ Profil créé !')
    setScreen('profiles'); setNewUsername(''); setNewPin(''); setNewPhoto(null); setNewPhotoFile(null); setIsPrivate(false); setNewGender('male')
    loadUsers()
  }

  const filtered = users.filter(u => u.username.toLowerCase().includes(search.toLowerCase()))

  if (screen === 'pin' && pinTarget) {
    const isImg = pinTarget.avatar?.startsWith('http') || pinTarget.avatar?.startsWith('data:')
    return (
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'100vh',padding:24,background:'var(--bg)'}}>
        <Toast />
        <button onClick={() => setScreen('profiles')} style={{position:'absolute',top:20,left:20,background:'none',border:'none',color:'var(--text2)',fontSize:24,cursor:'pointer'}}>←</button>
        {isImg
          ? <div style={{width:72,height:72,borderRadius:'50%',backgroundImage:`url(${pinTarget.avatar})`,backgroundSize:'cover',backgroundPosition:'center',marginBottom:12,border:'3px solid var(--border2)'}} />
          : <div style={{width:72,height:72,borderRadius:'50%',background:'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,marginBottom:12}}>{pinTarget.avatar||'💪'}</div>
        }
        <div style={{fontFamily:'var(--fm)',fontSize:24,fontWeight:700,marginBottom:8}}>{pinTarget.username}</div>
        <div style={{fontSize:13,color:'var(--text2)',marginBottom:32}}>Entre ton code PIN</div>
        <div style={{display:'flex',gap:16,marginBottom:32}}>
          {[0,1,2,3].map(i => <div key={i} className={`pin-dot${i < pinBuffer.length ? ' filled' : ''}`} />)}
        </div>
        {pinError && <div style={{color:'var(--red)',fontSize:13,marginBottom:16}}>{pinError}</div>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,maxWidth:280,width:'100%'}}>
          {['1','2','3','4','5','6','7','8','9'].map(d => (
            <button key={d} className="pin-btn" onClick={() => handlePin(d)}>{d}</button>
          ))}
          <div />
          <button className="pin-btn" onClick={() => handlePin('0')}>0</button>
          <button className="pin-btn" style={{fontSize:18,color:'var(--text2)'}} onClick={delPin}>⌫</button>
        </div>
      </div>
    )
  }

  if (screen === 'create') {
    return (
      <div style={{maxWidth:400,margin:'0 auto',padding:24,paddingTop:60}}>
        <Toast />
        <button onClick={() => setScreen('profiles')} style={{background:'none',border:'none',color:'var(--text2)',fontSize:24,cursor:'pointer',marginBottom:24}}>←</button>
        <div style={{fontFamily:'var(--fm)',fontSize:28,fontWeight:900,color:'var(--red)',letterSpacing:2,marginBottom:24}}>NOUVEAU PROFIL</div>
        <div style={{display:'flex',flexDirection:'column',gap:16}}>
          <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
            <label style={{cursor:'pointer'}}>
              <div style={{width:80,height:80,borderRadius:'50%',background:'var(--s2)',border:'2px dashed var(--border2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:newPhoto?0:28,backgroundImage:newPhoto?`url(${newPhoto})`:'none',backgroundSize:'cover',backgroundPosition:'center'}}>
                {!newPhoto && '📷'}
              </div>
              <input type="file" accept="image/*" style={{display:'none'}} onChange={previewPhoto} />
            </label>
            <div style={{fontSize:12,color:'var(--text3)'}}>Ajouter une photo</div>
          </div>
          <div>
            <label className="field-label">Pseudo</label>
            <input value={newUsername} onChange={e => setNewUsername(e.target.value)} placeholder="Ex: Gundan" maxLength={20} />
            {newUsername.trim().length >= 2 && (() => {
              const taken = users.some(u => u.username.trim().toLowerCase() === newUsername.trim().toLowerCase())
              const banned = checkBannedWords(newUsername)
              if (banned) return <div style={{fontSize:11,color:'var(--red)',marginTop:3}}>❌ Pseudo non autorisé</div>
              if (taken) return <div style={{fontSize:11,color:'var(--orange)',marginTop:3}}>❌ Pseudo déjà pris</div>
              return <div style={{fontSize:11,color:'var(--green)',marginTop:3}}>✅ Pseudo disponible</div>
            })()}
          </div>
          <div>
            <label className="field-label">Code PIN (4 chiffres)</label>
            <input type="password" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g,'').slice(0,4))} placeholder="****" inputMode="numeric" maxLength={4} />
          </div>
          <div>
            <label className="field-label">Genre (pour les badges et classements)</label>
            <div style={{display:'flex',gap:8,marginTop:6}}>
              {[{v:'male',l:'👨 Homme'},{v:'female',l:'👩 Femme'},{v:'other',l:'🧑 Autre'}].map(g=>(
                <button key={g.v} onClick={()=>setNewGender(g.v)} style={{flex:1,padding:'8px 4px',fontSize:12,fontFamily:'var(--fb)',fontWeight:600,cursor:'pointer',borderRadius:10,border:`1px solid ${newGender===g.v?'var(--red)':'var(--border)'}`,background:newGender===g.v?'var(--red)':'var(--s2)',color:newGender===g.v?'white':'var(--text2)',transition:'all .15s'}}>{g.l}</button>
              ))}
            </div>
          </div>
          <button className="btn-primary" onClick={createProfile} disabled={creating}>
            {creating ? '⏳ Création...' : '✅ Créer le profil'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{maxWidth:480,margin:'0 auto',padding:'60px 24px 24px'}}>
      <Toast />
      <svg viewBox="0 0 320 120" xmlns="http://www.w3.org/2000/svg" style={{width:220,marginBottom:8}}>
        {/* Carré rouge avec icône */}
        <rect x="0" y="0" width="76.11" height="76.11" rx="9.38" ry="9.38" fill="var(--red)"/>
        <path d="M51.72,31.49l-10.63-.02h0s-.76,0-.76,0c-.87,0-1.66-.35-2.22-.92-.57-.57-.92-1.36-.92-2.22,0-1.63,1.25-2.96,2.85-3.11l8.61-.04c1.08,0,1.89-.96,1.89-1.94l1.89-7.06c0-1.16-.92-2.01-2.09-2.01h-11.89c-.74,0-1.93.59-2.44,1.11l-12.79,15.89c-.68.67-1,1.86-1,2.85v1.61h0v18.58h.02c-.01.12-.02.24-.02.37v6.54h0c0,.47.38.85.85.85.18,0,.34-.05.47-.15l9.24-7.14c.96-.65,1.53-1.73,1.53-2.89v-13.28c0-.98.71-1.75,1.57-1.94.64-.13,1.45.18,1.92.76.05.06.09.12.13.18l.83,1.15.05.06,3.03,4.06c.28.38.54.79.81,1.18.62.91,1.64,1.38,2.92,1.38h6.03c1.1,0,2.15-.75,2.15-1.94l.13-9.87c0-1.21-1-2.04-2.17-2.05z" fill="white"/>
        {/* Texte LIFT à droite */}
        <g fill="var(--text)" transform="translate(86, -688) scale(0.98)">
          <polygon points="33 787.77 38.96 787.77 38.96 777.53 48.07 777.53 48.07 772.54 38.96 772.54 38.96 766.43 49.62 766.43 49.62 761.44 33 761.44 33 787.77"/>
          <rect x="54.18" y="761.44" width="5.95" height="26.33"/>
          <polygon points="64.24 766.43 71.49 766.43 71.49 787.77 77.45 787.77 77.45 766.43 84.69 766.43 84.69 761.44 64.24 761.44 64.24 766.43"/>
          <polygon points="94.76 776.71 103.74 776.71 103.74 771.72 94.76 771.72 94.76 766.43 105.31 766.43 105.31 761.44 88.81 761.44 88.81 787.77 105.71 787.77 105.71 782.78 94.76 782.78 94.76 776.71"/>
          <path d="M130.6,769.64c0-6.26-4.58-8.2-10.16-8.2h-9.48v26.33h5.95v-9.48h3.27l5.03,9.48h6.66l-5.96-10.54c2.81-1.27,4.69-3.73,4.69-7.6ZM116.9,766.17h3.05c3.13,0,4.81.87,4.81,3.47s-1.68,3.93-4.81,3.93h-3.05v-7.4Z"/>
          <path d="M149.39,787.77h6.3l-8.27-26.33h-7.12l-8.27,26.33h6.09l1.63-6.27h8.03l1.62,6.27ZM140.94,776.87l.63-2.44c.73-2.63,1.44-5.71,2.07-8.49h.16c.7,2.75,1.41,5.86,2.14,8.49l.63,2.44h-5.63Z"/>
        </g>
        {/* Texte TRACKER en dessous */}
        <g fill="var(--text2)" fontSize="11" fontFamily="sans-serif" letterSpacing="4">
          <text x="88" y="72">TRACKER</text>
        </g>
      </svg>
      <div style={{fontSize:11,color:'var(--text3)',letterSpacing:2,textTransform:'uppercase',marginBottom:32}}>Choisis ton profil</div>
      {users.length >= 4 && (
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{marginBottom:16}} />
      )}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill, minmax(130px, 1fr))',gap:12,marginBottom:16}}>
        {filtered.map(u => {
          const isImg = u.avatar?.startsWith('http') || u.avatar?.startsWith('data:')
          return (
            <button key={u.id} onClick={() => selectProfile(u)} style={{background:'var(--s1)',border:'1px solid var(--border)',borderRadius:16,padding:'20px 12px',cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}
              onMouseEnter={e => e.currentTarget.style.borderColor='var(--red)'}
              onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}
            >
              {isImg
                ? <div style={{width:56,height:56,borderRadius:'50%',backgroundImage:`url(${u.avatar})`,backgroundSize:'cover',backgroundPosition:'center',margin:'0 auto 8px'}} />
                : <div style={{width:56,height:56,borderRadius:'50%',background:'var(--s2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 8px'}}>{u.avatar||'💪'}</div>
              }
              <div style={{fontWeight:700,fontSize:14,color:'var(--text)'}}>{u.username}</div>
            </button>
          )
        })}
        <button onClick={() => setScreen('create')} style={{background:'transparent',border:'1px dashed var(--border2)',borderRadius:16,padding:'20px 12px',cursor:'pointer',color:'var(--text2)',fontSize:13,fontFamily:'var(--fb)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,transition:'all 0.2s'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='var(--orange)';e.currentTarget.style.color='var(--orange)'}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border2)';e.currentTarget.style.color='var(--text2)'}}
        >
          <span style={{fontSize:24}}>＋</span><span>Nouveau profil</span>
        </button>
      </div>
    </div>
  )
}
