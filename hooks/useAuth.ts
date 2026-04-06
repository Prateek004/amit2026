import { useState, useEffect } from 'react';
import { supabase, getCurrentSession, getUserProfile } from '@/lib/supabase';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentSession().then(session => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getUserProfile().then(p => setProfile(p));
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await getUserProfile();
          setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
