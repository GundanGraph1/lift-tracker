export const THEMES = [
  {
    key: 'red',
    name: 'Crimson',
    preview: '#ff3c3c',
    vars: {
      '--red': '#ff3c3c',
      '--accent2': '#ff6b6b',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'blue',
    name: 'Ice Blue',
    preview: '#3b82f6',
    vars: {
      '--red': '#3b82f6',
      '--accent2': '#60a5fa',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'purple',
    name: 'Purple Haze',
    preview: '#a855f7',
    vars: {
      '--red': '#a855f7',
      '--accent2': '#c084fc',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'green',
    name: 'Matrix',
    preview: '#22c55e',
    vars: {
      '--red': '#10b981',
      '--accent2': '#34d399',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'gold',
    name: 'Gold Rush',
    preview: '#f59e0b',
    vars: {
      '--red': '#f59e0b',
      '--accent2': '#fbbf24',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'orange',
    name: 'Inferno',
    preview: '#f97316',
    vars: {
      '--red': '#f97316',
      '--accent2': '#fb923c',
      '--fm': "'Oswald', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'pink',
    name: 'Rose',
    preview: '#ec4899',
    vars: {
      '--red': '#ec4899',
      '--accent2': '#f472b6',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
    }
  },
  {
    key: 'teal',
    name: 'Teal',
    preview: '#14b8a6',
    vars: {
      '--red': '#14b8a6',
      '--accent2': '#2dd4bf',
      '--fm': "'Barlow Condensed', sans-serif",
      '--fb': "'Barlow', sans-serif",
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

  // Apply color vars
  Object.entries(theme.vars).forEach(([k, v]) => {
    if (k !== '--fm' && k !== '--fb') root.style.setProperty(k, v)
  })

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
