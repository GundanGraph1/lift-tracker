-- Run this in your Supabase SQL editor:
-- https://supabase.com/dashboard/project/ufiinnhwzzlazezgadyq/sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT NULL;

-- Ajouter le mode privé
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE;
