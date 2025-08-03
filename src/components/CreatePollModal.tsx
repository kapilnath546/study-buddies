import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { BarChart3, Plus, X } from 'lucide-react';

interface CreatePollModalProps {
  onPollCreated: () => void;
}

export default function CreatePollModal({ onPollCreated }: CreatePollModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => {
    if (options.length < 4) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = async () => {
    if (!user) return;
    
    const validOptions = options.filter(opt => opt.trim());
    if (!question.trim() || validOptions.length < 2) {
      toast({
        title: "Error",
        description: "Please provide a question and at least 2 options",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('polls')
        .insert({
          user_id: user.id,
          question: question.trim(),
          options: validOptions,
          votes: validOptions.reduce((acc, option) => ({ ...acc, [option]: 0 }), {})
        });

      if (error) throw error;

      toast({
        title: "Poll created!",
        description: "Your poll has been shared with the community",
      });

      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setOpen(false);
      onPollCreated();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create poll",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:from-blue-100 hover:to-indigo-100 transition-all duration-200">
          <BarChart3 className="w-4 h-4 mr-2" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Create a Poll
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="question">Question</Label>
            <Input
              id="question"
              placeholder="What's your question?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="rounded-xl"
            />
          </div>
          
          <div className="space-y-3">
            <Label>Options</Label>
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="rounded-xl"
                />
                {options.length > 2 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeOption(index)}
                    className="rounded-xl"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {options.length < 4 && (
              <Button
                variant="outline"
                onClick={addOption}
                className="w-full rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-xl"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/80"
            >
              {loading ? 'Creating...' : 'Create Poll'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}