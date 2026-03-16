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
      <div style={{fontFamily:'var(--fm)',fontSize:48,fontWeight:900,color:'var(--red)',letterSpacing:3,lineHeight:1}}>LIFT</div>
      <div style={{fontFamily:'var(--fm)',fontSize:48,fontWeight:900,letterSpacing:3,lineHeight:1,marginBottom:4}}>TRACKER</div>
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
