'use client'
import { createContext, useContext, useState, useEffect, useRef } from 'react'

// Simple pub/sub store - no external deps needed
const _state = {
  currentUser: null,
  sessions: [],
  customExercises: [],
  presets: [],
  userPRs: [],
  userBadges: [],
  cardioSessions: [],
  currentPage: (typeof window !== 'undefined' && localStorage.getItem('lt_page')) || 'saisie',
}
const _listeners = new Set()

export function getState() { return { ..._state } }

export function subscribe(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export const actions = {
  setCurrentUser: (v) => { _state.currentUser = v; _listeners.forEach(l => l({ ..._state })) },
  setSessions: (v) => { _state.sessions = v; _listeners.forEach(l => l({ ..._state })) },
  setCustomExercises: (v) => { _state.customExercises = v; _listeners.forEach(l => l({ ..._state })) },
  setPresets: (v) => { _state.presets = v; _listeners.forEach(l => l({ ..._state })) },
  setUserPRs: (v) => { _state.userPRs = v; _listeners.forEach(l => l({ ..._state })) },
  setUserBadges: (v) => { _state.userBadges = v; _listeners.forEach(l => l({ ..._state })) },
  setCardioSessions: (v) => { _state.cardioSessions = v; _listeners.forEach(l => l({ ..._state })) },
  setCurrentPage: (v) => { _state.currentPage = v; _listeners.forEach(l => l({ ..._state })) },
}

export function useStore(selector) {
  const [val, setVal] = useState(() => selector ? selector(_state) : { ..._state })
  useEffect(() => {
    return subscribe((s) => setVal(selector ? selector(s) : s))
  }, [])
  return val
}
