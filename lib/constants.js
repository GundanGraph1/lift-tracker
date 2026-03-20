export const BADGES = {
  // ── BADGES CHAMPION MENSUEL 🏆 ───────────────────────────────────────────
  // Ces badges sont attribués automatiquement à la fin de chaque mois
  champion_month: {
    key: 'champion_month',
    name: 'Champion du mois',
    desc: '1er au classement volume sur un mois',
    icon: '👑',
    color: '#fbbf24',
    monthly: true,
    check: () => false // géré manuellement via monthly_champions
  },
  podium_month: {
    key: 'podium_month',
    name: 'Podium du mois',
    desc: 'Top 3 au classement volume sur un mois',
    icon: '🥈',
    color: '#94a3b8',
    monthly: true,
    check: () => false
  },

  // ── BADGES NORMAUX ─────────────────────────────────────────────────────────
  volume_100k: {
    key: 'volume_100k',
    name: '100 000 kg',
    desc: '100 000 kg soulevés au total',
    icon: '🏗️',
    color: '#cd7f32',
    check: (sessions) => sessions.reduce((a, s) => a + (s.total_volume || 0), 0) >= 100000
  },
  volume_1M: {
    key: 'volume_1M',
    name: '1 000 000 kg',
    desc: '1 000 000 kg soulevés au total',
    icon: '💎',
    color: '#a78bfa',
    check: (sessions) => sessions.reduce((a, s) => a + (s.total_volume || 0), 0) >= 1000000
  },
  // Badges bench HOMMES
  bench_60: {
    key: 'bench_60', name: 'Bench 60kg', desc: 'Bench Press à 60 kg',
    icon: '🌱', color: '#86efac', gender: 'male',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 60
    }
  },
  bench_80: {
    key: 'bench_80', name: 'Bench 80kg', desc: 'Bench Press à 80 kg',
    icon: '💪', color: '#6ee7b7', gender: 'male',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 80
    }
  },
  bench_100: {
    key: 'bench_100', name: 'Bench 100kg', desc: 'Bench Press à 100 kg',
    icon: '🥉', color: '#cd7f32', gender: 'male',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 100
    }
  },
  bench_120: {
    key: 'bench_120', name: 'Bench 120kg', desc: 'Bench Press à 120 kg',
    icon: '🥈', color: '#c0c0c0', gender: 'male',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 120
    }
  },
  bench_140: {
    key: 'bench_140', name: 'Bench 140kg', desc: 'Bench Press à 140 kg',
    icon: '🥇', color: '#ffd700', gender: 'male',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 140
    }
  },
  bench_160: {
    key: 'bench_160', name: 'Bench 160kg', desc: 'Bench Press à 160 kg',
    icon: '👑', color: '#f97316', gender: 'male',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 160
    }
  },
  // Badges bench FEMMES
  bench_f30: {
    key: 'bench_f30', name: 'Bench 30kg', desc: 'Bench Press à 30 kg',
    icon: '🌱', color: '#f9a8d4', gender: 'female',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 30
    }
  },
  bench_f40: {
    key: 'bench_f40', name: 'Bench 40kg', desc: 'Bench Press à 40 kg',
    icon: '💪', color: '#f472b6', gender: 'female',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 40
    }
  },
  bench_f60: {
    key: 'bench_f60', name: 'Bench 60kg', desc: 'Bench Press à 60 kg',
    icon: '🥉', color: '#cd7f32', gender: 'female',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 60
    }
  },
  bench_f80: {
    key: 'bench_f80', name: 'Bench 80kg', desc: 'Bench Press à 80 kg',
    icon: '🥈', color: '#c0c0c0', gender: 'female',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 80
    }
  },
  bench_f100: {
    key: 'bench_f100', name: 'Bench 100kg', desc: 'Bench Press à 100 kg',
    icon: '👑', color: '#ffd700', gender: 'female',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 100
    }
  },

  // ── BADGES MYSTÈRE 🔮 ────────────────────────────────────────────────────
  // Condition cachée — l'icône/nom/desc ne sont visibles qu'une fois débloqués
  mystery_early_bird: {
    key: 'mystery_early_bird',
    name: 'Lève-tôt',
    desc: 'Faire une séance avant 7h du matin',
    icon: '🌅',
    color: '#fbbf24',
    secret: true,
    check: (sessions) => sessions.some(s => {
      const t = s.created_at ? new Date(s.created_at).getHours() : -1
      return t >= 0 && t < 7
    })
  },
  mystery_night_owl: {
    key: 'mystery_night_owl',
    name: 'Noctambule',
    desc: 'Faire une séance après 22h',
    icon: '🦉',
    color: '#818cf8',
    secret: true,
    check: (sessions) => sessions.some(s => {
      const t = s.created_at ? new Date(s.created_at).getHours() : -1
      return t >= 22
    })
  },
  mystery_streak_7: {
    key: 'mystery_streak_7',
    name: 'Semaine parfaite',
    desc: '7 jours consécutifs avec une séance',
    icon: '🔥',
    color: '#ef4444',
    secret: true,
    check: (sessions) => {
      if (!sessions.length) return false
      const dates = [...new Set(sessions.map(s => s.session_date))].sort()
      let streak = 1, max = 1
      for (let i = 1; i < dates.length; i++) {
        const diff = (new Date(dates[i]) - new Date(dates[i-1])) / 86400000
        if (diff === 1) { streak++; max = Math.max(max, streak) } else streak = 1
      }
      return max >= 7
    }
  },
  mystery_century: {
    key: 'mystery_century',
    name: 'Centurion',
    desc: '100 séances au compteur',
    icon: '💯',
    color: '#f59e0b',
    secret: true,
    check: (sessions) => sessions.length >= 100
  },
  mystery_volume_beast: {
    key: 'mystery_volume_beast',
    name: "T'ié un tigre",
    desc: 'Plus de 20 000 kg en une seule séance',
    icon: '🐯',
    color: '#dc2626',
    secret: true,
    check: (sessions) => sessions.some(s => (s.total_volume || 0) >= 20000)
  },
  mystery_all_muscles: {
    key: 'mystery_all_muscles',
    name: 'Athlète complet',
    desc: 'Avoir travaillé tous les groupes musculaires',
    icon: '🏆',
    color: '#10b981',
    secret: true,
    check: (sessions) => {
      const muscles = new Set(sessions.flatMap(s => (s.muscle || '').split('+').filter(Boolean)))
      const required = ['Pectoraux','Dos','Épaules','Biceps','Triceps','Jambes']
      return required.every(m => muscles.has(m))
    }
  },
  mystery_monday: {
    key: 'mystery_monday',
    name: 'International Chest Day',
    desc: 'Faire du bench un lundi',
    icon: '📅',
    color: '#6366f1',
    secret: true,
    check: (sessions) => sessions.some(s => {
      const day = new Date(s.session_date + 'T12:00:00').getDay()
      return day === 1 && (s.exercises || []).some(e =>
        normalize(e.name).includes('bench') || normalize(e.name).includes('developpe couche')
      )
    })
  },
  mystery_pr_machine: {
    key: 'mystery_pr_machine',
    name: 'Machine à PRs',
    desc: 'Avoir 10 PRs enregistrés',
    icon: '📈',
    color: '#0ea5e9',
    secret: true,
    check: (sessions, prs) => (prs || []).length >= 10
  },
}

export function normalize(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
}

export const REST_TIMERS = [60, 90, 120, 180]

// Couleurs par grande famille musculaire
// Toutes les variantes/alias pointent vers la même couleur de groupe
export const MUSCLE_COLORS = {
  // ── DOS (bleu)
  Dos: '#3b82f6',

  // ── PECTORAUX (rouge)
  Pectoraux: '#ef4444',
  Pec: '#ef4444',

  // ── ÉPAULES (orange)
  Épaules: '#f97316',
  Epaule: '#f97316',
  Épaule: '#f97316',

  // ── BRAS — biceps/triceps regroupés (violet)
  Biceps: '#8b5cf6',
  Triceps: '#8b5cf6',
  BrasBi: '#8b5cf6',
  BrasTri: '#8b5cf6',
  Bras: '#8b5cf6',

  // ── JAMBES — tout ce qui est bas du corps (vert)
  Jambes: '#22c55e',
  Quad: '#16a34a',
  Ischio: '#15803d',
  Mollets: '#22c55e',
  Quadriceps: '#16a34a',
  Ischio_jambiers: '#15803d',

  // ── FESSIERS (rose)
  Fessiers: '#ec4899',

  // ── ABDOS (jaune)
  Abdominaux: '#eab308',
  Abdos: '#eab308',

  // ── AVANT-BRAS (ambre)
  Avant_bras: '#f59e0b',

  // ── FULL BODY (blanc)
  FullBody: '#94a3b8',
}

export const MUSCLE_LABELS = {
  Dos: 'Dos',
  Pectoraux: 'Pec',
  Pec: 'Pec',
  Épaules: 'Épaules',
  Épaule: 'Épaules',
  Epaule: 'Épaules',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  BrasBi: 'Bras',
  BrasTri: 'Bras',
  Bras: 'Bras',
  Jambes: 'Jambes',
  Quad: 'Quad',
  Ischio: 'Ischio',
  Quadriceps: 'Quad',
  Ischio_jambiers: 'Ischio',
  Abdominaux: 'Abdos',
  Abdos: 'Abdos',
  Fessiers: 'Fessiers',
  Mollets: 'Mollets',
  Avant_bras: 'Avant-bras',
  FullBody: 'Full',
}



// Groupes musculaires canoniques à afficher dans l'UI (sans alias)
export const MUSCLE_GROUPS = [
  'Dos',
  'Pectoraux',
  'Épaules',
  'Biceps',
  'Triceps',
  'Jambes',
  'Quadriceps',
  'Ischio',
  'Fessiers',
  'Abdominaux',
  'Mollets',
  'Avant_bras',
]

// Raccourcis de groupes — sélectionnent plusieurs muscles d'un coup
export const MUSCLE_SHORTCUTS = [
  { key: 'Upper',    label: '💪 Upper',    muscles: ['Dos','Pectoraux','Épaules','Biceps','Triceps'] },
  { key: 'Lower',    label: '🦵 Lower',    muscles: ['Jambes','Quadriceps','Ischio','Fessiers','Mollets'] },
  { key: 'Push',     label: '⬆️ Push',     muscles: ['Pectoraux','Épaules','Triceps'] },
  { key: 'Pull',     label: '⬇️ Pull',     muscles: ['Dos','Biceps'] },
  { key: 'FullBody', label: '🔥 Full Body', muscles: ['Dos','Pectoraux','Épaules','Biceps','Triceps','Jambes','Fessiers'] },
]

// Résoudre la couleur principale d'une chaîne muscle (peut être composite)
export function getMuscleColor(muscleStr) {
  if (!muscleStr) return '#94a3b8'
  const first = (muscleStr||'').split('+')[0].trim()
  return MUSCLE_COLORS[first] || '#94a3b8'
}

// Résoudre le label principal
export function getMuscleLabel(muscleStr) {
  if (!muscleStr) return ''
  const first = (muscleStr||'').split('+')[0].trim()
  return MUSCLE_LABELS[first] || first
}
export const ALL_EXERCISES = {
  Dos: [
    'Tractions', 'Rowing Barre', 'Rowing Haltère', 'Tirage Poulie Haute',
    'Tirage Poitrine', 'Tirage Nuque', 'Rowing Machine', 'Soulevé de Terre',
    'Shrugs', 'Pull-Over', 'Tirage Horizontal Poulie', 'Rowing T-Bar',
    'Face Pull', 'Hyperextensions', 'Tirage Unilatéral Poulie',
  ],
  Pectoraux: [
    'Développé Couché (Bench Press)', 'Développé Incliné', 'Développé Décliné',
    'Pec Fly Machine', 'Fly Haltères', 'Écartés Poulie', 'Pompes',
    'Dips', 'Smith Incliné', 'Push-Up Lesté', 'Bench Press Prise Serrée',
  ],
  Épaules: [
    'Développé Militaire', 'Développé Arnold', 'Élévations Latérales',
    'Élévations Frontales', 'Oiseau', 'Face Pull Épaules', 'Upright Row',
    'Machine Épaules', 'Développé Haltères Assis',
  ],
  Biceps: [
    'Curl Barre', 'Curl Haltères', 'Curl Marteau', 'Curl Incliné',
    'Curl Concentré', 'Curl Poulie', 'Curl Barre EZ', 'Curl Machine',
  ],
  Triceps: [
    'Dips Triceps', 'Extension Nuque', 'Pushdown Poulie', 'Barre au Front',
    'Extension Haltère', 'Kick-Back', 'Développé Couché Prise Serrée',
    'Extension Poulie Haute',
  ],
  Jambes: [
    'Squat', 'Presse à Cuisses', 'Leg Extension', 'Leg Curl',
    'Fentes', 'Romanian Deadlift', 'Hip Thrust', 'Hack Squat',
    'Goblet Squat', 'Sumo Squat', 'Bulgarian Split Squat',
    'Good Morning', 'Leg Press 45°',
  ],
  Abdominaux: [
    'Crunchs', 'Planche', 'Relevé de Jambes', 'Torsions Russes',
    'Ab Wheel', 'Crunch Machine', 'Gainage Latéral', 'Dragon Flag',
  ],
  Fessiers: [
    'Hip Thrust', 'Kick-Back Fessiers', 'Abducteurs', 'Clamshell',
    'Fentes Fessiers', 'Squat Sumo',
  ],
  Mollets: [
    'Mollets Debout', 'Mollets Assis', 'Mollets Presse', 'Saut à la Corde',
  ],
  Avant_bras: [
    'Curl Poignet', 'Reverse Curl', 'Farmer Walk', 'Pinch Grip',
  ],
}
