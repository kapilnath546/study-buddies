// Update this page (the content is just a fallback if you fail to update the page)

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkProfileAndRedirect = async () => {
      if (!user || loading) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile || !profile.name || !profile.course) {
        navigate('/profile');
      } else {
        navigate('/feed');
      }
    };

    if (!loading) {
      if (!user) {
        navigate('/auth');
      } else {
        checkProfileAndRedirect();
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to SRM Collab</h1>
        <p className="text-xl text-muted-foreground">Redirecting you to the right place...</p>
      </div>
    </div>
  );
};

export default Index;
