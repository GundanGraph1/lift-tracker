export const MUSCLE_LABELS = {
  Dos: 'Dos', Pec: 'Pec', BrasBi: 'Bras Bi', BrasTri: 'Bras Tri',
  Epaule: 'Épaule', Quad: 'Quad', Jambes: 'Jambes', FullBody: 'Full Body',
  Ischio: 'Ischio', Fessiers: 'Fessiers', Mollets: 'Mollets', Abdos: 'Abdos'
}

export const MUSCLE_COLORS = {
  Dos: '#3b82f6', Pec: '#ef4444', BrasBi: '#f59e0b', BrasTri: '#f97316',
  Epaule: '#8b5cf6', Quad: '#10b981', Jambes: '#06b6d4', FullBody: '#ec4899',
  Ischio: '#84cc16', Fessiers: '#f43f5e', Mollets: '#14b8a6', Abdos: '#6366f1'
}

export const ALL_EXERCISES = {
  Pectoraux: ['Développé Couché (Bench Press)', 'Développé Incliné', 'Développé Décliné', 'Pec Fly Machine', 'Fly Haltères', 'Écartés Poulie', 'Pompes', 'Dips', 'Smith Incliné', 'Push-Up Lesté', 'Bench Press Prise Serrée'],
  Dos: ['Tractions', 'Tirage Horizontal', 'Tirage Poulie Haute', 'Rowing Barre', 'Rowing Haltère', 'Tirage Vertical', 'Pull-Over', 'Soulevé de terre (Deadlift)', 'Good Morning', 'Hyper Extension', 'Traction Prise Serrée', 'Rowing Machine'],
  Épaules: ['Développé Militaire', 'Élévation Latérale Haltères', 'Élévation Latérale Poulie', 'Oiseau / Rear Delt', 'Face Pull', 'Arnold Press', 'Élévation Frontale', 'Shrugs', 'Upright Row'],
  Biceps: ['Curl Barre', 'Curl Haltères', 'Curl Marteau', 'Curl Pupitre Machine', 'Curl Pupitre Haltère', 'Curl Poulie Basse', 'Curl Concentré', 'Curl Incliné'],
  Triceps: ['Barre Frontale (Skullcrusher)', 'Dips Triceps', 'Pushdown Corde', 'Pushdown Barre', 'Extension Overhead Haltère', 'Carter Extension (Triceps)', 'Kick Back', 'Extension Overhead Poulie'],
  Quadriceps: ['Squat', 'Leg Press', 'Hack Squat Machine', 'Presse à Cuisses', 'Leg Extension', 'Fentes', 'Goblet Squat', 'Bulgarian Split Squat', 'Front Squat'],
  'Ischio-jambiers': ['Romanian Deadlift', 'Leg Curl Couché', 'Leg Curl Assis', 'Good Morning', 'Nordic Curl', 'Sumo Deadlift'],
  Fessiers: ['Hip Thrust', 'Kickback Poulie', 'Abducteur Machine', 'Fentes Arrière', 'Step Up'],
  Mollets: ['Mollets Debout', 'Mollets Assis', 'Leg Press Mollets', 'Donkey Calf Raise'],
  Abdos: ['Crunch', 'Planche', 'Crunch Poulie', 'Relevé de Jambes', 'Ab Wheel', 'Russian Twist', 'Gainage Latéral'],
  'Full Body': ['Deadlift', 'Clean & Press', 'Thruster', 'Kettlebell Swing', 'Burpees'],
  'Avant-bras': ['Curl Poignet', 'Extension Poignet', 'Pinch Grip', 'Farmer Walk']
}

export const BADGES = {
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
  bench_100: {
    key: 'bench_100',
    name: 'Bench 100kg',
    desc: 'Bench Press à 100 kg',
    icon: '🥉',
    color: '#cd7f32',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 100
    }
  },
  bench_120: {
    key: 'bench_120',
    name: 'Bench 120kg',
    desc: 'Bench Press à 120 kg',
    icon: '🥈',
    color: '#c0c0c0',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 120
    }
  },
  bench_140: {
    key: 'bench_140',
    name: 'Bench 140kg',
    desc: 'Bench Press à 140 kg',
    icon: '🥇',
    color: '#ffd700',
    check: (sessions, prs) => {
      const bench = prs.find(p => normalize(p.exercise).includes('bench') || normalize(p.exercise).includes('developpe couche'))
      return bench && bench.weight >= 140
    }
  }
}

export function normalize(str) {
  return (str || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '')
}

export const REST_TIMERS = [60, 90, 120, 180]
