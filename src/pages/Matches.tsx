import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageCircle, X, Heart } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  course: string;
  skills: string[];
  interests: string[];
  avatar_url: string | null;
}

interface Match {
  id: string;
  user_id: string;
  matched_user_id: string;
  matched_profile: Profile;
}

export default function Matches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchMatches();
    }
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;

    // Get profiles excluding current user and already matched users
    const { data: matchesData } = await supabase
      .from('matches')
      .select('matched_user_id')
      .eq('user_id', user.id);

    const matchedUserIds = matchesData?.map(m => m.matched_user_id) || [];
    const excludeIds = [user.id, ...matchedUserIds];

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .not('user_id', 'in', `(${excludeIds.join(',')})`)
      .limit(10);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive",
      });
      return;
    }

    setProfiles(data || []);
  };

  const fetchMatches = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        profiles!matches_matched_user_id_fkey (*)
      `)
      .eq('user_id', user.id);

    if (error) {
      // If the join fails, fetch manually
      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('user_id', user.id);

      if (matchesData) {
        const userIds = matchesData.map(m => m.matched_user_id);
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', userIds);

        if (profilesData) {
          const matchesWithProfiles = matchesData.map(match => ({
            ...match,
            matched_profile: profilesData.find(p => p.user_id === match.matched_user_id)!
          }));
          setMatches(matchesWithProfiles);
        }
      }
      return;
    }

    const matchesWithProfiles = data?.map(match => ({
      ...match,
      matched_profile: match.profiles as any
    })) || [];

    setMatches(matchesWithProfiles);
  };

  const swipeRight = async () => {
    if (!user || currentIndex >= profiles.length) return;

    const profile = profiles[currentIndex];
    setLoading(true);

    try {
      const { error } = await supabase
        .from('matches')
        .insert({
          user_id: user.id,
          matched_user_id: profile.user_id,
        });

      if (error) throw error;

      toast({
        title: "It's a match!",
        description: `You matched with ${profile.name}`,
      });

      setCurrentIndex(prev => prev + 1);
      fetchMatches(); // Refresh matches
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create match",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const swipeLeft = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Swipe Cards */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Discover Students</h2>
            
            {currentProfile ? (
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-6">
                  <div className="text-center space-y-4">
                    <Avatar className="w-32 h-32 mx-auto">
                      <AvatarImage src={currentProfile.avatar_url || ''} />
                      <AvatarFallback className="text-2xl">
                        {currentProfile.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="text-xl font-semibold">{currentProfile.name}</h3>
                      <p className="text-muted-foreground">{currentProfile.course}</p>
                    </div>

                    {currentProfile.skills && currentProfile.skills.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium">Skills</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {currentProfile.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {currentProfile.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{currentProfile.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {currentProfile.interests && currentProfile.interests.length > 0 && (
                      <div className="space-y-2">
                        <p className="font-medium">Interests</p>
                        <div className="flex flex-wrap gap-1 justify-center">
                          {currentProfile.interests.slice(0, 3).map((interest) => (
                            <Badge key={interest} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {currentProfile.interests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{currentProfile.interests.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex justify-center space-x-4 pt-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={swipeLeft}
                        className="w-16 h-16 rounded-full"
                      >
                        <X className="w-6 h-6" />
                      </Button>
                      <Button
                        size="lg"
                        onClick={swipeRight}
                        disabled={loading}
                        className="w-16 h-16 rounded-full"
                      >
                        <Heart className="w-6 h-6" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="max-w-sm mx-auto">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No more profiles to show. Check back later!</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Matches List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Your Matches</h2>
            
            {matches.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No matches yet. Keep swiping!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {matches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar className="w-12 h-12">
                            <AvatarImage src={match.matched_profile?.avatar_url || ''} />
                            <AvatarFallback>
                              {match.matched_profile?.name?.charAt(0).toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-semibold">{match.matched_profile?.name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">
                              {match.matched_profile?.course || 'Course not specified'}
                            </p>
                          </div>
                        </div>
                        <Link to={`/chat/${match.id}`}>
                          <Button size="sm">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Chat
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}