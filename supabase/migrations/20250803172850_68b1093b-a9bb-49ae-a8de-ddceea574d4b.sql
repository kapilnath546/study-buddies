-- First check what's in the profiles table
SELECT * FROM profiles LIMIT 5;

-- Check if there are any constraint issues
SELECT 
    conname,
    contype,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'public.profiles'::regclass;

-- Create polls table for the new poll feature
CREATE TABLE public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  votes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on polls
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

-- Create policies for polls
CREATE POLICY "Polls are viewable by everyone" 
ON public.polls 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create polls" 
ON public.polls 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own polls" 
ON public.polls 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own polls" 
ON public.polls 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create login_streaks table for streak tracking
CREATE TABLE public.login_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  last_login_date DATE,
  max_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on login_streaks
ALTER TABLE public.login_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for login_streaks
CREATE POLICY "Users can view their own streak" 
ON public.login_streaks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak" 
ON public.login_streaks 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add updated_at triggers
CREATE TRIGGER update_polls_updated_at
BEFORE UPDATE ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_login_streaks_updated_at
BEFORE UPDATE ON public.login_streaks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for new tables
ALTER TABLE public.polls REPLICA IDENTITY FULL;
ALTER TABLE public.login_streaks REPLICA IDENTITY FULL;

-- Add some sample polls for demo
INSERT INTO public.polls (user_id, question, options, votes) VALUES
('11111111-1111-1111-1111-111111111111', 'What''s your favorite programming language?', 
 ARRAY['JavaScript', 'Python', 'Java', 'C++'], 
 '{"JavaScript": 5, "Python": 8, "Java": 3, "C++": 2}'),
('22222222-2222-2222-2222-222222222222', 'Best time for hackathons?', 
 ARRAY['Weekend', 'Weekday Evening', 'Full Week'], 
 '{"Weekend": 12, "Weekday Evening": 4, "Full Week": 7}'),
('33333333-3333-3333-3333-333333333333', 'Most exciting tech trend?', 
 ARRAY['AI/ML', 'Blockchain', 'IoT', 'AR/VR'], 
 '{"AI/ML": 15, "Blockchain": 6, "IoT": 4, "AR/VR": 9}');