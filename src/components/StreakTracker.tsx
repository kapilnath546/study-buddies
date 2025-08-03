import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';

export default function StreakTracker() {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      updateStreak();
    }
  }, [user]);

  const updateStreak = async () => {
    if (!user) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get or create streak record
      const { data: existingStreak, error: fetchError } = await supabase
        .from('login_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching streak:', fetchError);
        setLoading(false);
        return;
      }

      let newStreak = 1;
      let maxStreak = 1;

      if (existingStreak) {
        const lastLogin = existingStreak.last_login_date;
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        if (lastLogin === today) {
          // Already logged in today
          newStreak = existingStreak.current_streak;
          maxStreak = existingStreak.max_streak;
        } else if (lastLogin === yesterday) {
          // Consecutive day
          newStreak = existingStreak.current_streak + 1;
          maxStreak = Math.max(newStreak, existingStreak.max_streak);
        } else {
          // Streak broken, reset to 1
          newStreak = 1;
          maxStreak = existingStreak.max_streak;
        }
      }

      // Update or insert streak record
      const { error: upsertError } = await supabase
        .from('login_streaks')
        .upsert({
          user_id: user.id,
          current_streak: newStreak,
          last_login_date: today,
          max_streak: maxStreak
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        console.error('Error updating streak:', upsertError);
      } else {
        setStreak(newStreak);
      }
    } catch (error) {
      console.error('Error in updateStreak:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 animate-pulse">
      <Flame className="w-3 h-3 mr-1" />
      {streak} day streak
    </Badge>
  );
}