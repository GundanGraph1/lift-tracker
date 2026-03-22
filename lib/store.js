'use client'
import { useState, useEffect, useRef } from 'react'

// Simple pub/sub store - no external deps needed
const _state = {
  currentUser: null,
  sessions: [],
  customExercises: [],
  presets: [],
  userPRs: [],
  userBadges: [],
  cardioSessions: [],
  currentPage: 'saisie',
}
const _listeners = new Set()

function _notify() { const s = _state; _listeners.forEach(l => l(s)) }

export function getState() { return _state }

export function subscribe(fn) {
  _listeners.add(fn)
  return () => _listeners.delete(fn)
}

export const actions = {
  setCurrentUser: (v) => { _state.currentUser = v; _notify() },
  setSessions: (v) => { _state.sessions = v; _notify() },
  setCustomExercises: (v) => { _state.customExercises = v; _notify() },
  setPresets: (v) => { _state.presets = v; _notify() },
  setUserPRs: (v) => { _state.userPRs = v; _notify() },
  setUserBadges: (v) => { _state.userBadges = v; _notify() },
  setCardioSessions: (v) => { _state.cardioSessions = v; _notify() },
  setCurrentPage: (v) => { _state.currentPage = v; _notify() },
}

export function useStore(selector) {
  const selectorRef = useRef(selector)
  selectorRef.current = selector
  const [val, setVal] = useState(() => selector ? selector(_state) : _state)
  useEffect(() => {
    return subscribe((s) => {
      const sel = selectorRef.current
      if (!sel) { setVal(s); return }
      const next = sel(s)
      setVal(prev => {
        // Shallow equality: skip update if same reference or same primitive
        if (prev === next) return prev
        // For arrays/objects, compare by reference (selectors should return store slices directly)
        return next
      })
    })
  }, [])
  return val
}
