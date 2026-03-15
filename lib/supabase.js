import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufiinnhwzzlazezgadyq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmaWlubmh3enpsYXplemdhZHlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzNDQwMjIsImV4cCI6MjA4ODkyMDAyMn0.Z-FlYJptQvMv8_4PetztrhQbBn1tboQhUezUcASprE4'

export const db = createClient(supabaseUrl, supabaseKey)
