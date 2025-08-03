import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Heart, MessageCircle, Upload, Image as ImageIcon, Trash2, Flame, Filter, TrendingUp } from 'lucide-react';
import { CommentSection } from '@/components/CommentSection';
import PollCard from '@/components/PollCard';
import CreatePollModal from '@/components/CreatePollModal';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes: number;
  created_at: string;
  user_id: string;
  profiles?: {
    name: string;
    avatar_url: string | null;
    skills?: string[];
    interests?: string[];
    course?: string;
  };
}

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

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<File | null>(null);
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
  // Filter states
  const [skillFilter, setSkillFilter] = useState<string>('');
  const [interestFilter, setInterestFilter] = useState<string>('');
  const [courseFilter, setCourseFilter] = useState<string>('');
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);

  useEffect(() => {
    fetchPosts();
    fetchPolls();
    fetchTrendingPosts();
    fetchFilterOptions();
    
    // Set up real-time subscription for posts and polls
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
          fetchTrendingPosts();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls'
        },
        () => fetchPolls()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch posts",
        variant: "destructive",
      });
      return;
    }

    // Fetch profiles separately due to relation issues
    const userIds = [...new Set(data?.map(post => post.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url, skills, interests, course')
      .in('user_id', userIds);

    const profilesMap = new Map();
    profilesData?.forEach(profile => {
      profilesMap.set(profile.user_id, profile);
    });

    const postsWithProfiles = data?.map(post => ({
      ...post,
      profiles: profilesMap.get(post.user_id) || null
    })) || [];

    setPosts(postsWithProfiles);
    setLoading(false);
  };

  const fetchPolls = async () => {
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        profiles!polls_user_id_fkey (
          name,
          avatar_url
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch polls:', error);
      return;
    }

    // Transform the data to match our Poll interface
    const transformedPolls = (data || []).map(poll => ({
      ...poll,
      votes: typeof poll.votes === 'object' && poll.votes !== null ? poll.votes as Record<string, number> : {},
      profiles: Array.isArray(poll.profiles) ? poll.profiles[0] : poll.profiles
    }));

    setPolls(transformedPolls);
  };

  const fetchTrendingPosts = async () => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .gte('created_at', twentyFourHoursAgo)
      .order('likes', { ascending: false })
      .limit(3);

    if (error) {
      console.error('Failed to fetch trending posts:', error);
      return;
    }

    // Fetch profiles separately for trending posts
    const userIds = [...new Set(data?.map(post => post.user_id) || [])];
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', userIds);

    const profilesMap = new Map();
    profilesData?.forEach(profile => {
      profilesMap.set(profile.user_id, profile);
    });

    const trendingPostsWithProfiles = data?.map(post => ({
      ...post,
      profiles: profilesMap.get(post.user_id) || null
    })) || [];

    setTrendingPosts(trendingPostsWithProfiles);
  };

  const fetchFilterOptions = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('skills, interests, course');

    if (error) {
      console.error('Failed to fetch filter options:', error);
      return;
    }

    const skills = new Set<string>();
    const interests = new Set<string>();
    const courses = new Set<string>();

    data?.forEach(profile => {
      profile.skills?.forEach((skill: string) => skills.add(skill));
      profile.interests?.forEach((interest: string) => interests.add(interest));
      if (profile.course) courses.add(profile.course);
    });

    setAvailableSkills(Array.from(skills).sort());
    setAvailableInterests(Array.from(interests).sort());
    setAvailableCourses(Array.from(courses).sort());
  };

  const uploadPostImage = async (file: File): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const createPost = async () => {
    if (!user || !newPostContent.trim()) return;
    
    setIsCreatingPost(true);
    try {
      let imageUrl = null;
      
      if (newPostImage) {
        setUploadingImage(true);
        imageUrl = await uploadPostImage(newPostImage);
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPostContent.trim(),
          image_url: imageUrl,
        });

      if (error) throw error;

      setNewPostContent('');
      setNewPostImage(null);
      
      toast({
        title: "Success! 🎉",
        description: "Your post has been shared with the community",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsCreatingPost(false);
      setUploadingImage(false);
    }
  };

  const likePost = async (postId: string, currentLikes: number) => {
    // Optimistic update
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: currentLikes + 1 }
        : post
    ));
    
    setTrendingPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: currentLikes + 1 }
        : post
    ));

    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes: currentLikes + 1 })
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Post liked! ❤️",
        description: "Your like has been recorded",
      });
      
      // Refresh trending posts since likes changed
      fetchTrendingPosts();
    } catch (error) {
      // Revert optimistic update on error
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: currentLikes }
          : post
      ));
      setTrendingPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: currentLikes }
          : post
      ));
      
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('user_id', user?.id); // Extra security check

      if (error) throw error;

      toast({
        title: "Post deleted",
        description: "Your post has been removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSkillFilter('');
    setInterestFilter('');
    setCourseFilter('');
  };

  // Re-fetch posts when filters change
  useEffect(() => {
    fetchPosts();
  }, [skillFilter, interestFilter, courseFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 sm:pb-6">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* Trending Posts Section */}
        {trendingPosts.length > 0 && (
          <Card className="shadow-xl border-border/50 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200 rounded-2xl overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                <h2 className="text-xl font-bold text-orange-800">🔥 Trending</h2>
              </div>
              <p className="text-sm text-orange-600">Most liked posts in the last 24 hours</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {trendingPosts.map((post) => (
                <Card key={`trending-${post.id}`} className="bg-white/80 border-orange-100">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={post.profiles?.avatar_url || ''} />
                        <AvatarFallback className="bg-gradient-to-br from-orange-100 to-red-100 text-orange-700 text-xs">
                          {post.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{post.profiles?.name || 'Anonymous'}</p>
                        <p className="text-sm text-gray-700 mt-1 line-clamp-2">{post.content}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            {post.likes} likes
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Filter Section */}
        <Card className="shadow-lg border-border/50 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-blue-800">Filter Posts</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select value={skillFilter} onValueChange={setSkillFilter}>
                <SelectTrigger className="rounded-xl bg-white/80">
                  <SelectValue placeholder="Select skill" />
                </SelectTrigger>
                <SelectContent>
                  {availableSkills.map(skill => (
                    <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={interestFilter} onValueChange={setInterestFilter}>
                <SelectTrigger className="rounded-xl bg-white/80">
                  <SelectValue placeholder="Select interest" />
                </SelectTrigger>
                <SelectContent>
                  {availableInterests.map(interest => (
                    <SelectItem key={interest} value={interest}>{interest}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={courseFilter} onValueChange={setCourseFilter}>
                <SelectTrigger className="rounded-xl bg-white/80">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {availableCourses.map(course => (
                    <SelectItem key={course} value={course}>{course}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {(skillFilter || interestFilter || courseFilter) && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="mt-3 rounded-xl text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Create Post and Poll Actions */}
        <div className="flex gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 rounded-2xl py-6 text-lg font-semibold"
              >
                <Upload className="w-5 h-5 mr-2" />
                Share Something Amazing
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                  Create New Post
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="content">What's on your mind?</Label>
                  <Textarea
                    id="content"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    placeholder="Share your thoughts, ask questions, or start a discussion..."
                    rows={4}
                    className="rounded-xl bg-muted/50 border-border/50 focus:border-primary/50 transition-colors resize-none"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="image" className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Add an image (optional)
                  </Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewPostImage(e.target.files?.[0] || null)}
                    className="rounded-xl"
                  />
                </div>

                {newPostImage && (
                  <div className="space-y-2">
                    <img
                      src={URL.createObjectURL(newPostImage)}
                      alt="Preview"
                      className="w-full h-48 object-cover rounded-xl shadow-md"
                    />
                  </div>
                )}

                <Button 
                  onClick={createPost} 
                  disabled={isCreatingPost || !newPostContent.trim()}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl py-3 text-base font-semibold"
                >
                  {isCreatingPost ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {uploadingImage ? 'Uploading...' : 'Posting...'}
                    </div>
                  ) : (
                    'Share Post'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <CreatePollModal onPollCreated={() => { fetchPolls(); }} />
        </div>

        {/* Combined Feed: Posts and Polls */}
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-full"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : posts.length === 0 && polls.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No posts or polls yet. Be the first to share!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Render polls first */}
            {polls.map((poll) => (
              <PollCard key={`poll-${poll.id}`} poll={poll} onUpdate={fetchPolls} />
            ))}
            
            {/* Then render posts */}
            {posts.map((post) => (
              <Card key={post.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm rounded-2xl overflow-hidden">
                <CardContent className="p-6">
                  {/* Post Header */}
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                      <AvatarImage src={post.profiles?.avatar_url || ''} />
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                        {post.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{post.profiles?.name || 'Anonymous'}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {/* Delete button for post owner */}
                    {user && post.user_id === user.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePost(post.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  {/* Post Content */}
                  <div className="space-y-4">
                    <p className="text-foreground leading-relaxed">{post.content}</p>
                    
                    {post.image_url && (
                      <div className="rounded-xl overflow-hidden">
                        <img 
                          src={post.image_url} 
                          alt="Post content" 
                          className="w-full h-auto object-cover max-h-96"
                        />
                      </div>
                    )}
                    
                    {/* Post Actions */}
                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                      <div className="flex items-center space-x-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => likePost(post.id, post.likes)}
                          className="flex items-center space-x-2 text-muted-foreground hover:text-red-500 transition-colors rounded-xl"
                        >
                          <Heart className="w-4 h-4" />
                          <span className="text-sm font-medium">{post.likes}</span>
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleComments(post.id)}
                          className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors rounded-xl"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-sm font-medium">Comment</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Comments Section */}
                    {expandedComments.has(post.id) && (
                      <div className="mt-4">
                        <CommentSection postId={post.id} isOpen={expandedComments.has(post.id)} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}