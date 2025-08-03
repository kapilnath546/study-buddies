-- Create comments table for post comments
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Comments are viewable by everyone" 
ON public.comments 
FOR SELECT 
USING (true);

CREATE POLICY "Users can create comments" 
ON public.comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

-- Insert sample users for demo
INSERT INTO public.profiles (user_id, name, course, skills, interests, avatar_url) VALUES
('11111111-1111-1111-1111-111111111111', 'Aditya Sharma', 'Computer Science Engineering', ARRAY['Python', 'Machine Learning', 'React'], ARRAY['Technology', 'Research', 'Coding'], 'https://randomuser.me/api/portraits/men/1.jpg'),
('22222222-2222-2222-2222-222222222222', 'Priya Patel', 'Information Technology', ARRAY['Java', 'Web Development', 'UI/UX Design'], ARRAY['Design', 'Innovation', 'Startups'], 'https://randomuser.me/api/portraits/women/2.jpg'),
('33333333-3333-3333-3333-333333333333', 'Rahul Kumar', 'Electronics Engineering', ARRAY['C++', 'Mobile Development', 'IoT'], ARRAY['Technology', 'Innovation', 'Electronics'], 'https://randomuser.me/api/portraits/men/3.jpg'),
('44444444-4444-4444-4444-444444444444', 'Sneha Reddy', 'Mechanical Engineering', ARRAY['Project Management', 'CAD Design', 'Python'], ARRAY['Engineering', 'Innovation', 'Research'], 'https://randomuser.me/api/portraits/women/4.jpg'),
('55555555-5555-5555-5555-555555555555', 'Arjun Singh', 'Civil Engineering', ARRAY['JavaScript', 'Photography', 'Content Writing'], ARRAY['Travel', 'Photography', 'Writing'], 'https://randomuser.me/api/portraits/men/5.jpg'),
('66666666-6666-6666-6666-666666666666', 'Kavya Nair', 'Biotechnology', ARRAY['Data Science', 'Research', 'Python'], ARRAY['Science', 'Research', 'Healthcare'], 'https://randomuser.me/api/portraits/women/6.jpg');

-- Insert sample posts
INSERT INTO public.posts (user_id, content, image_url, likes) VALUES
('11111111-1111-1111-1111-111111111111', 'Excited to present our AI project at the upcoming SRM Tech Fest! Our team has been working on a machine learning model that can predict student performance. Looking for feedback and collaborators! 🚀', 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&h=300&fit=crop', 15),
('22222222-2222-2222-2222-222222222222', 'Beautiful sunset view from SRM campus today! Sometimes you need to take a break from coding and enjoy the moment. The new library building looks amazing in this light. 📸', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop', 23),
('33333333-3333-3333-3333-333333333333', 'Hackathon prep mode ON! Our team is building an IoT solution for smart campus management. 48 hours to go and we are super pumped! Who else is participating? #SRMHackathon', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500&h=300&fit=crop', 31),
('44444444-4444-4444-4444-444444444444', 'Group study session at the new study pods! These collaborative spaces are perfect for team projects. Love how SRM is constantly improving student facilities. Anyone want to join our Thermodynamics study group?', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=500&h=300&fit=crop', 18),
('55555555-5555-5555-5555-555555555555', 'Just finished an amazing photography workshop conducted by the Visual Arts Club. Captured some incredible shots around campus. SRM truly has some hidden gems for photography enthusiasts! 📷', 'https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=500&h=300&fit=crop', 27),
('66666666-6666-6666-6666-666666666666', 'Research paper published! Our biotech team research on sustainable agriculture techniques got accepted in an international journal. Grateful for the amazing mentorship from SRM faculty! 🎓', 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=500&h=300&fit=crop', 42);