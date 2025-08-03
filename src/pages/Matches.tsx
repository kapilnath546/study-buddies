import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, X, MessageCircle, User, MapPin, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  course?: string;
  skills?: string[];
  interests?: string[];
  avatar_url?: string;
}

interface Match {
  id: string;
  user_id: string;
  matched_user_id: string;
  created_at: string;
  profiles?: Profile;
}

export default function Matches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchMatches();
    }
  }, [user]);

  const fetchProfiles = async () => {
    if (!user) return;

    try {
      // Get existing matches to exclude them
      const { data: existingMatches } = await supabase
        .from('matches')
        .select('matched_user_id')
        .eq('user_id', user.id);

      const excludedUserIds = [user.id, ...(existingMatches?.map(m => m.matched_user_id) || [])];

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .not('user_id', 'in', `(${excludedUserIds.join(',')})`)
        .limit(10);

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
      toast({
        title: "Error",
        description: "Failed to load profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          profiles!matches_matched_user_id_fkey (
            id,
            user_id,
            name,
            course,
            avatar_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedMatches = (data || []).map(match => ({
        ...match,
        profiles: Array.isArray(match.profiles) ? match.profiles[0] : match.profiles
      }));
      
      setMatches(transformedMatches);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const swipeRight = async () => {
    if (!user || currentIndex >= profiles.length) return;
    
    const profile = profiles[currentIndex];
    setSwiping(true);
    setSwipeDirection('right');

    try {
      const { error } = await supabase
        .from('matches')
        .insert({
          user_id: user.id,
          matched_user_id: profile.user_id,
        });

      if (error) throw error;

      toast({
        title: "It's a match! 💫",
        description: `You matched with ${profile.name}`,
      });

      // Refresh matches
      await fetchMatches();
    } catch (error) {
      console.error('Error creating match:', error);
      toast({
        title: "Error",
        description: "Failed to create match",
        variant: "destructive",
      });
    }

    // Move to next profile after animation
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setSwiping(false);
      setSwipeDirection(null);
    }, 300);
  };

  const swipeLeft = () => {
    setSwiping(true);
    setSwipeDirection('left');

    // Move to next profile after animation
    setTimeout(() => {
      setCurrentIndex(prev => prev + 1);
      setSwiping(false);
      setSwipeDirection(null);
    }, 300);
  };

  const currentProfile = profiles[currentIndex];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 sm:pb-6">
      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            Discover Students
          </h1>
          <p className="text-muted-foreground">
            Swipe right to connect, left to skip
          </p>
        </div>

        {/* Main Card Area */}
        <div className="relative h-[600px] flex items-center justify-center">
          {loading ? (
            <Card className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-card/80 border-border/50 rounded-3xl shadow-2xl">
              <div className="text-center space-y-4">
                <div className="w-8 h-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-muted-foreground">Finding awesome students...</p>
              </div>
            </Card>
          ) : !currentProfile ? (
            <Card className="w-full h-full flex items-center justify-center bg-gradient-to-br from-card to-card/80 border-border/50 rounded-3xl shadow-2xl">
              <div className="text-center space-y-4 p-8">
                <User className="w-16 h-16 text-muted-foreground mx-auto" />
                <h3 className="text-xl font-semibold">No more profiles</h3>
                <p className="text-muted-foreground">Check back later for new students to connect with!</p>
                <Button 
                  onClick={fetchProfiles}
                  className="bg-gradient-to-r from-primary to-primary/80 rounded-xl"
                >
                  Refresh
                </Button>
              </div>
            </Card>
          ) : (
            <Card 
              className={`
                w-full h-full bg-gradient-to-br from-white to-gray-50 border-border/50 rounded-3xl shadow-2xl overflow-hidden
                transition-all duration-300 ease-out
                ${swiping && swipeDirection === 'right' 
                  ? 'transform rotate-12 translate-x-full opacity-0 scale-95' 
                  : swiping && swipeDirection === 'left'
                  ? 'transform -rotate-12 -translate-x-full opacity-0 scale-95'
                  : 'transform rotate-0 translate-x-0 opacity-100 scale-100'
                }
              `}
            >
              <CardContent className="p-0 h-full flex flex-col">
                {/* Profile Image/Avatar */}
                <div className="relative h-80 bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                  <Avatar className="w-40 h-40 border-4 border-white shadow-xl">
                    <AvatarImage src={currentProfile.avatar_url || ''} className="object-cover" />
                    <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-primary to-primary/80 text-white">
                      {currentProfile.name?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                {/* Profile Info */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">{currentProfile.name}</h2>
                    {currentProfile.course && (
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <BookOpen className="w-4 h-4" />
                        <span className="text-sm">{currentProfile.course}</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {currentProfile.skills && currentProfile.skills.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-gray-700">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentProfile.skills.map((skill, index) => (
                          <Badge 
                            key={index} 
                            variant="secondary" 
                            className="bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full px-3 py-1"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interests */}
                  {currentProfile.interests && currentProfile.interests.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-gray-700">Interests</h3>
                      <div className="flex flex-wrap gap-2">
                        {currentProfile.interests.map((interest, index) => (
                          <Badge 
                            key={index} 
                            variant="outline" 
                            className="border-green-200 text-green-800 hover:bg-green-50 rounded-full px-3 py-1"
                          >
                            {interest}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="p-6 pt-0">
                  <div className="flex justify-center gap-6">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={swipeLeft}
                      disabled={swiping}
                      className="w-16 h-16 rounded-full border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-all duration-200 shadow-lg"
                    >
                      <X className="w-8 h-8" />
                    </Button>
                    
                    <Button
                      size="lg"
                      onClick={swipeRight}
                      disabled={swiping}
                      className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      <Heart className="w-8 h-8" />
                    </Button>
                  </div>
                  
                  <div className="text-center mt-4">
                    <p className="text-xs text-muted-foreground">
                      ❌ Skip &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ❤️ Match
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Matches Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Your Matches</h2>
            <Badge variant="secondary" className="rounded-full">
              {matches.length} match{matches.length !== 1 ? 'es' : ''}
            </Badge>
          </div>
          
          {matches.length === 0 ? (
            <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 rounded-2xl">
              <CardContent className="p-6 text-center">
                <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No matches yet. Start swiping to connect with students!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {matches.map((match) => (
                <Card 
                  key={match.id} 
                  className="bg-gradient-to-br from-white to-gray-50 border-border/50 rounded-2xl hover:shadow-lg transition-all duration-200 overflow-hidden"
                >
                  <CardContent className="p-4">
                    <div className="text-center space-y-3">
                      <Avatar className="w-16 h-16 mx-auto border-2 border-white shadow-md">
                        <AvatarImage src={match.profiles?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white font-semibold">
                          {match.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="space-y-1">
                        <h3 className="font-semibold text-sm text-gray-900">
                          {match.profiles?.name || 'Unknown'}
                        </h3>
                        {match.profiles?.course && (
                          <p className="text-xs text-muted-foreground">
                            {match.profiles.course}
                          </p>
                        )}
                      </div>

                      <Link to={`/chat/${match.id}`}>
                        <Button 
                          size="sm" 
                          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-xl text-xs"
                        >
                          <MessageCircle className="w-3 h-3 mr-1" />
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
  );
}