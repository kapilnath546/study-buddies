import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart3 } from 'lucide-react';

interface Poll {
  id: string;
  user_id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  created_at: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
  };
}

interface PollCardProps {
  poll: Poll;
  onUpdate: () => void;
}

export default function PollCard({ poll, onUpdate }: PollCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const totalVotes = Object.values(poll.votes || {}).reduce((sum, count) => sum + count, 0);

  const handleVote = async (option: string) => {
    if (!user || hasVoted || isVoting) return;

    setIsVoting(true);
    try {
      // Get current votes
      const currentVotes = poll.votes || {};
      const newVotes = {
        ...currentVotes,
        [option]: (currentVotes[option] || 0) + 1
      };

      const { error } = await supabase
        .from('polls')
        .update({ votes: newVotes })
        .eq('id', poll.id);

      if (error) throw error;

      setHasVoted(true);
      onUpdate();
      
      toast({
        title: "Vote recorded!",
        description: `You voted for "${option}"`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record vote",
        variant: "destructive",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const getPercentage = (option: string) => {
    if (totalVotes === 0) return 0;
    return Math.round(((poll.votes?.[option] || 0) / totalVotes) * 100);
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm rounded-2xl overflow-hidden">
      <CardContent className="p-6 space-y-4">
        {/* Author */}
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10 ring-2 ring-primary/20">
            <AvatarImage src={poll.profiles?.avatar_url || ''} />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
              {poll.profiles?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-semibold text-sm">{poll.profiles?.name || 'Anonymous'}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(poll.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">
            <BarChart3 className="w-3 h-3 mr-1" />
            Poll
          </Badge>
        </div>

        {/* Question */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-foreground">{poll.question}</h3>
          
          {/* Options */}
          <div className="space-y-3">
            {poll.options.map((option, index) => {
              const percentage = getPercentage(option);
              const voteCount = poll.votes?.[option] || 0;
              
              return (
                <div key={index} className="space-y-1">
                  <Button
                    variant={hasVoted ? "outline" : "ghost"}
                    className="w-full justify-between p-4 h-auto rounded-xl hover:scale-105 transition-transform"
                    onClick={() => handleVote(option)}
                    disabled={hasVoted || isVoting}
                  >
                    <span className="font-medium">{option}</span>
                    {hasVoted && (
                      <span className="text-sm text-muted-foreground">
                        {voteCount} votes ({percentage}%)
                      </span>
                    )}
                  </Button>
                  
                  {hasVoted && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total votes */}
          <p className="text-sm text-muted-foreground text-center">
            {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}