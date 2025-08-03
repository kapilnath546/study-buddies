import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X } from 'lucide-react';

interface Profile {
  id: string;
  user_id: string;
  name: string;
  course: string;
  skills: string[];
  interests: string[];
  avatar_url: string | null;
}

const skillOptions = [
  'JavaScript', 'Python', 'Java', 'C++', 'React', 'Node.js', 'Machine Learning',
  'Data Science', 'Web Development', 'Mobile Development', 'UI/UX Design',
  'Project Management', 'Marketing', 'Content Writing', 'Photography'
];

const interestOptions = [
  'Technology', 'Startups', 'Research', 'Sports', 'Music', 'Art', 'Travel',
  'Gaming', 'Reading', 'Coding', 'Innovation', 'Entrepreneurship', 'Science'
];

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    course: '',
    skills: [] as string[],
    interests: [] as string[],
    avatar_url: null as string | null,
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      toast({
        title: "Error",
        description: "Failed to fetch profile",
        variant: "destructive",
      });
      return;
    }

    if (data) {
      setProfile(data);
      setFormData({
        name: data.name || '',
        course: data.course || '',
        skills: data.skills || [],
        interests: data.interests || [],
        avatar_url: data.avatar_url || null,
      });
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/avatar.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, avatar_url: publicUrl }));
      
      toast({
        title: "Success",
        description: "Avatar uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const saveProfile = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const profileData = {
        user_id: user.id,
        name: formData.name,
        course: formData.course,
        skills: formData.skills,
        interests: formData.interests,
        avatar_url: formData.avatar_url,
      };

      // Use upsert with onConflict to handle the unique constraint properly
      const { error } = await supabase
        .from('profiles')
        .upsert(profileData, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Profile save error:', error);
        throw error;
      }

      toast({
        title: "✅ Profile Updated!",
        description: "Your profile has been saved successfully",
        className: "bg-green-50 border-green-200 text-green-800",
      });
      
      // Don't navigate away, let user stay on profile page
      fetchProfile(); // Refresh the profile data
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 sm:pb-6">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <Card className="shadow-xl border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm rounded-2xl">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              {profile ? 'Edit Your Profile' : 'Complete Your Profile'}
            </CardTitle>
            <CardDescription className="text-base">
              Let other students know about you and your interests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Avatar Upload */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <Avatar className="w-28 h-28 shadow-xl ring-4 ring-primary/20">
                  <AvatarImage src={formData.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary text-lg font-semibold">
                    {formData.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-2 -right-2">
                  <Label htmlFor="avatar" className="cursor-pointer">
                    <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow">
                      <Upload className="w-4 h-4" />
                    </div>
                  </Label>
                </div>
              </div>
              <div className="text-center">
                <Label htmlFor="avatar" className="cursor-pointer">
                  <Button variant="outline" disabled={uploading} asChild className="rounded-xl">
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Avatar'}
                    </span>
                  </Button>
                </Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  onChange={uploadAvatar}
                  className="hidden"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter your full name"
                className="rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Course */}
            <div className="space-y-3">
              <Label htmlFor="course" className="text-sm font-semibold">Course/Department</Label>
              <Input
                id="course"
                value={formData.course}
                onChange={(e) => setFormData(prev => ({ ...prev, course: e.target.value }))}
                placeholder="e.g., Computer Science Engineering"
                className="rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Skills */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Skills</Label>
              <div className="flex flex-wrap gap-2">
                {skillOptions.map((skill) => (
                  <Badge
                    key={skill}
                    variant={formData.skills.includes(skill) ? "default" : "outline"}
                    className="cursor-pointer rounded-full px-3 py-1 transition-all duration-200 hover:scale-105 hover:shadow-md"
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                    {formData.skills.includes(skill) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click to add/remove skills</p>
            </div>

            {/* Interests */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Interests</Label>
              <div className="flex flex-wrap gap-2">
                {interestOptions.map((interest) => (
                  <Badge
                    key={interest}
                    variant={formData.interests.includes(interest) ? "default" : "outline"}
                    className="cursor-pointer rounded-full px-3 py-1 transition-all duration-200 hover:scale-105 hover:shadow-md"
                    onClick={() => toggleInterest(interest)}
                  >
                    {interest}
                    {formData.interests.includes(interest) && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Click to add/remove interests</p>
            </div>

            <Button 
              onClick={saveProfile} 
              className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl py-3 text-base font-semibold" 
              disabled={loading || !formData.name}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </div>
              ) : (
                'Save Profile'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}