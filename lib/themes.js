export const THEMES = [
  // ── THÈMES STANDARD ──
  {
    key: 'red',
    name: 'Crimson',
    preview: '#ff3c3c',
    vars: {
      '--red': '#ff3c3c',
      '--accent2': '#ff6b6b',
    }
  },
  {
    key: 'blue',
    name: 'Ice Blue',
    preview: '#3b82f6',
    vars: {
      '--red': '#3b82f6',
      '--accent2': '#60a5fa',
    }
  },
  {
    key: 'purple',
    name: 'Purple Haze',
    preview: '#a855f7',
    vars: {
      '--red': '#a855f7',
      '--accent2': '#c084fc',
    }
  },
  {
    key: 'green',
    name: 'Matrix',
    preview: '#22c55e',
    vars: {
      '--red': '#10b981',
      '--accent2': '#34d399',
    }
  },
  {
    key: 'gold',
    name: 'Gold Rush',
    preview: '#f59e0b',
    vars: {
      '--red': '#f59e0b',
      '--accent2': '#fbbf24',
    }
  },
  {
    key: 'orange',
    name: 'Inferno',
    preview: '#f97316',
    vars: {
      '--red': '#f97316',
      '--accent2': '#fb923c',
    }
  },
  {
    key: 'pink',
    name: 'Rose',
    preview: '#ec4899',
    vars: {
      '--red': '#ec4899',
      '--accent2': '#f472b6',
    }
  },
  {
    key: 'teal',
    name: 'Teal',
    preview: '#14b8a6',
    vars: {
      '--red': '#14b8a6',
      '--accent2': '#2dd4bf',
    }
  },

  // ── THÈMES PREMIUM ──
  {
    key: 'obsidian',
    name: 'Obsidian',
    preview: '#ff3c3c',
    premium: true,
    vars: {
      '--red': '#ff3c3c',
      '--accent2': '#ff6b6b',
      '--bg': '#080808',
      '--s1': '#0d0d0d',
      '--s2': '#111111',
      '--s3': '#161616',
      '--border': '#1e1e1e',
      '--border2': '#252525',
      '--card-glow': '0 0 0 1px rgba(255,60,60,0.08), 0 4px 24px rgba(0,0,0,0.6)',
      '--nav-blur': 'blur(20px)',
      '--nav-bg': 'rgba(8,8,8,0.85)',
      '--accent-glow': '0 0 20px rgba(255,60,60,0.25)',
    }
  },
  {
    key: 'neon',
    name: 'Neon Noir',
    preview: '#00f5ff',
    premium: true,
    vars: {
      '--red': '#00f5ff',
      '--accent2': '#7c3aed',
      '--bg': '#06060f',
      '--s1': '#0a0a18',
      '--s2': '#0f0f22',
      '--s3': '#14142a',
      '--border': '#1a1a35',
      '--border2': '#22224a',
      '--text': '#e2e8ff',
      '--text2': '#7b85c4',
      '--text3': '#404880',
      '--card-glow': '0 0 0 1px rgba(0,245,255,0.1), 0 4px 24px rgba(0,0,0,0.7)',
      '--nav-blur': 'blur(24px)',
      '--nav-bg': 'rgba(6,6,15,0.9)',
      '--accent-glow': '0 0 30px rgba(0,245,255,0.3), 0 0 60px rgba(124,58,237,0.15)',
    }
  },
  {
    key: 'titanium',
    name: 'Titanium',
    preview: '#94a3b8',
    premium: true,
    vars: {
      '--red': '#94a3b8',
      '--accent2': '#cbd5e1',
      '--bg': '#0c0c0e',
      '--s1': '#111114',
      '--s2': '#17171b',
      '--s3': '#1e1e24',
      '--border': '#26262e',
      '--border2': '#2e2e38',
      '--text': '#f1f5f9',
      '--text2': '#94a3b8',
      '--text3': '#475569',
      '--card-glow': '0 0 0 1px rgba(148,163,184,0.08), 0 4px 20px rgba(0,0,0,0.5)',
      '--nav-blur': 'blur(20px)',
      '--nav-bg': 'rgba(12,12,14,0.88)',
      '--accent-glow': '0 0 20px rgba(148,163,184,0.15)',
    }
  },
  {
    key: 'aurora',
    name: 'Aurora',
    preview: '#34d399',
    premium: true,
    vars: {
      '--red': '#34d399',
      '--accent2': '#818cf8',
      '--bg': '#050f0a',
      '--s1': '#081510',
      '--s2': '#0d1e16',
      '--s3': '#12271e',
      '--border': '#1a3526',
      '--border2': '#1f4030',
      '--text': '#ecfdf5',
      '--text2': '#6ee7b7',
      '--text3': '#34785a',
      '--card-glow': '0 0 0 1px rgba(52,211,153,0.1), 0 4px 24px rgba(0,0,0,0.6)',
      '--nav-blur': 'blur(20px)',
      '--nav-bg': 'rgba(5,15,10,0.88)',
      '--accent-glow': '0 0 24px rgba(52,211,153,0.2), 0 0 50px rgba(129,140,248,0.1)',
    }
  },
  {
    key: 'ember',
    name: 'Ember',
    preview: '#f97316',
    premium: true,
    vars: {
      '--red': '#f97316',
      '--accent2': '#fbbf24',
      '--bg': '#0d0800',
      '--s1': '#130d00',
      '--s2': '#1a1100',
      '--s3': '#221600',
      '--border': '#2e1e00',
      '--border2': '#3a2600',
      '--text': '#fff7ed',
      '--text2': '#fdba74',
      '--text3': '#92400e',
      '--card-glow': '0 0 0 1px rgba(249,115,22,0.1), 0 4px 24px rgba(0,0,0,0.6)',
      '--nav-blur': 'blur(20px)',
      '--nav-bg': 'rgba(13,8,0,0.88)',
      '--accent-glow': '0 0 24px rgba(249,115,22,0.25), 0 0 48px rgba(251,191,36,0.1)',
    }
  },
  {
    key: 'phantom',
    name: 'Phantom',
    preview: '#a78bfa',
    premium: true,
    vars: {
      '--red': '#a78bfa',
      '--accent2': '#f472b6',
      '--bg': '#07040f',
      '--s1': '#0c0718',
      '--s2': '#110c22',
      '--s3': '#16102a',
      '--border': '#1e1635',
      '--border2': '#261d42',
      '--text': '#f5f0ff',
      '--text2': '#c4b5fd',
      '--text3': '#6d4ebe',
      '--card-glow': '0 0 0 1px rgba(167,139,250,0.1), 0 4px 24px rgba(0,0,0,0.7)',
      '--nav-blur': 'blur(24px)',
      '--nav-bg': 'rgba(7,4,15,0.9)',
      '--accent-glow': '0 0 28px rgba(167,139,250,0.25), 0 0 56px rgba(244,114,182,0.1)',
    }
  },
]
// Font packs - each has a display name, Google Fonts URL key, and CSS values
export const FONT_PACKS = [
  {
    key: 'barlow',
    name: 'Barlow',
    sub: 'Défaut',
    fm: "'Barlow Condensed', sans-serif",
    fb: "'Barlow', sans-serif",
    import: 'Barlow+Condensed:wght@700;800&family=Barlow:wght@400;500;600;700',
  },
  {
    key: 'oswald',
    name: 'Oswald',
    sub: 'Compact',
    fm: "'Oswald', sans-serif",
    fb: "'Oswald', sans-serif",
    import: 'Oswald:wght@400;600;700',
  },
  {
    key: 'rajdhani',
    name: 'Rajdhani',
    sub: 'Tech',
    fm: "'Rajdhani', sans-serif",
    fb: "'Rajdhani', sans-serif",
    import: 'Rajdhani:wght@400;500;600;700',
  },
  {
    key: 'bebas',
    name: 'Bebas Neue',
    sub: 'Brutal',
    fm: "'Bebas Neue', sans-serif",
    fb: "'Barlow', sans-serif",
    import: 'Bebas+Neue&family=Barlow:wght@400;500;600;700',
  },
  {
    key: 'inter',
    name: 'Inter',
    sub: 'Clean',
    fm: "'Inter', sans-serif",
    fb: "'Inter', sans-serif",
    import: 'Inter:wght@400;500;600;700;800',
  },
  {
    key: 'orbitron',
    name: 'Orbitron',
    sub: 'Cyber',
    fm: "'Orbitron', sans-serif",
    fb: "'Barlow', sans-serif",
    import: 'Orbitron:wght@400;600;700;800&family=Barlow:wght@400;500;600;700',
  },
]

export function applyTheme(themeKey, fontKey) {
  const theme = THEMES.find(t => t.key === themeKey) || THEMES[0]
  const font = FONT_PACKS.find(f => f.key === fontKey) || FONT_PACKS[0]
  const root = document.documentElement

  // Reset premium vars to defaults first
  const premiumVars = ['--bg','--s1','--s2','--s3','--border','--border2','--text','--text2','--text3','--card-glow','--nav-blur','--nav-bg','--accent-glow']
  const defaults = {
    '--bg':'#0a0a0a','--s1':'#111111','--s2':'#1a1a1a','--s3':'#222222',
    '--border':'#2a2a2a','--border2':'#333333','--text':'#f0f0f0',
    '--text2':'#888888','--text3':'#555555',
    '--card-glow':'none','--nav-blur':'blur(0px)','--nav-bg':'rgba(10,10,10,0.95)',
    '--accent-glow':'none',
  }
  premiumVars.forEach(k => root.style.setProperty(k, defaults[k] || ''))

  // Apply theme vars
  Object.entries(theme.vars).forEach(([k, v]) => {
    if (k !== '--fm' && k !== '--fb') root.style.setProperty(k, v)
  })

  // Mark premium theme on body
  document.body.dataset.theme = themeKey
  document.body.dataset.premium = theme.premium ? '1' : '0'

  // Apply font vars
  root.style.setProperty('--fm', font.fm)
  root.style.setProperty('--fb', font.fb)

  // Load Google Font if not already loaded
  const fontId = `gfont-${font.key}`
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link')
    link.id = fontId
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?family=${font.import}&display=swap`
    document.head.appendChild(link)
  }
}

export function getThemeFromUser(user) {
  try {
    if (!user?.theme) return { themeKey: 'red', fontKey: 'barlow' }
    const parsed = typeof user.theme === 'string' ? JSON.parse(user.theme) : user.theme
    return { themeKey: parsed.themeKey || 'red', fontKey: parsed.fontKey || 'barlow' }
  } catch { return { themeKey: 'red', fontKey: 'barlow' } }
}
