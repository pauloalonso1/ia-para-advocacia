import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const CACHE_KEY = 'whatsapp-profile-pics';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  url: string | null;
  fetchedAt: number;
}

function loadCache(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCache(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore quota errors */ }
}

export const useProfilePictures = () => {
  const [pictures, setPictures] = useState<Record<string, string | null>>(() => {
    const cache = loadCache();
    const now = Date.now();
    const pics: Record<string, string | null> = {};
    for (const [phone, entry] of Object.entries(cache)) {
      if (now - entry.fetchedAt < CACHE_TTL) {
        pics[phone] = entry.url;
      }
    }
    return pics;
  });

  const pendingRef = useRef<Set<string>>(new Set());

  const fetchPicture = useCallback(async (phone: string) => {
    // Skip if already fetched or pending
    if (pendingRef.current.has(phone)) return;
    
    const cache = loadCache();
    const existing = cache[phone];
    if (existing && Date.now() - existing.fetchedAt < CACHE_TTL) return;

    pendingRef.current.add(phone);

    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'fetch-profile-pic', phone },
      });

      const url = error ? null : (data?.profilePictureUrl || null);

      // Update cache
      cache[phone] = { url, fetchedAt: Date.now() };
      saveCache(cache);

      setPictures(prev => ({ ...prev, [phone]: url }));
    } catch {
      // Silently fail - just show initials
    } finally {
      pendingRef.current.delete(phone);
    }
  }, []);

  const fetchMultiple = useCallback((phones: string[]) => {
    // Limit concurrent fetches
    const toFetch = phones.filter(p => {
      const cache = loadCache();
      const entry = cache[p];
      return !entry || Date.now() - entry.fetchedAt >= CACHE_TTL;
    }).slice(0, 10);

    toFetch.forEach(phone => fetchPicture(phone));
  }, [fetchPicture]);

  return { pictures, fetchPicture, fetchMultiple };
};
