// src/supabaseClient.js - Supabase PostgreSQL Connection & Local Fallback

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/**
 * Fetch schemes from Supabase or fallback to local dataset
 */
export async function getSchemes(localFallbackSchemes) {
  if (!isSupabaseConfigured || !supabase) {
    console.log('⚡ Using local scheme dataset (Supabase env not configured).');
    return localFallbackSchemes;
  }

  try {
    const { data, error } = await supabase.from('schemes').select('*').eq('is_active', true);
    if (error || !data || data.length === 0) {
      console.warn('Supabase fetch returned empty, using local fallback:', error);
      return localFallbackSchemes;
    }
    return data;
  } catch (err) {
    console.error('Failed to query Supabase schemes:', err);
    return localFallbackSchemes;
  }
}
