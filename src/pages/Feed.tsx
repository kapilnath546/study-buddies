import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CommentSection } from '@/components/CommentSection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Heart, MessageCircle, Plus, Upload, ImageIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes: number;
  created_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  } | null;
}

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [postImage, setPostImage] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPosts();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
    // First get posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (postsError) {
      toast({
        title: "Error",
        description: "Failed to fetch posts",
        variant: "destructive",
      });
      return;
    }

    if (!postsData || postsData.length === 0) {
      setPosts([]);
      return;
    }

    // Get unique user IDs
    const userIds = [...new Set(postsData.map(post => post.user_id))];
    
    // Fetch profiles for these users
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, name, avatar_url')
      .in('user_id', userIds);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create profiles map
    const profilesMap = new Map();
    if (profilesData) {
      profilesData.forEach(profile => {
        profilesMap.set(profile.user_id, profile);
      });
    }

    // Combine posts with profiles
    const postsWithProfiles = postsData.map(post => ({
      ...post,
      profiles: profilesMap.get(post.user_id) || null
    }));

    setPosts(postsWithProfiles);
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
    if (!user || !newPost.trim()) return;
    
    setUploading(true);
    try {
      let imageUrl = null;
      
      if (postImage) {
        imageUrl = await uploadPostImage(postImage);
      }

      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content: newPost.trim(),
          image_url: imageUrl,
        });

      if (error) throw error;

      setNewPost('');
      setPostImage(null);
      setDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Post created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const likePost = async (postId: string, currentLikes: number) => {
    if (likedPosts.has(postId)) {
      toast({
        title: "Already liked",
        description: "You can only like a post once",
      });
      return;
    }

    // Optimistic update
    setLikedPosts(prev => new Set(prev).add(postId));
    setPosts(prev => prev.map(post => 
      post.id === postId 
        ? { ...post, likes: post.likes + 1 }
        : post
    ));

    try {
      const { error } = await supabase
        .from('posts')
        .update({ likes: currentLikes + 1 })
        .eq('id', postId);

      if (error) throw error;

      toast({
        title: "Liked!",
        description: "You liked this post",
      });
    } catch (error) {
      // Revert optimistic update on error
      setLikedPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes - 1 }
          : post
      ));
      
      toast({
        title: "Error",
        description: "Failed to like post",
        variant: "destructive",
      });
    }
  };

  const toggleComments = (postId: string) => {
    setOpenComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 pb-20 sm:pb-6">
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Create Post Button */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="w-full bg-gradient-to-r from-primary via-primary/95 to-primary/90 hover:from-primary/90 hover:via-primary/85 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]" 
              size="lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create New Post
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Create a New Post
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="content" className="text-sm font-medium">What's on your mind?</Label>
                <Textarea
                  id="content"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Share your thoughts, ask questions, or start a discussion..."
                  rows={4}
                  className="mt-1 resize-none bg-muted/50 border-border/50 focus:border-primary/50 transition-colors"
                />
              </div>
              
              <div>
                <Label htmlFor="image" className="text-sm font-medium flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Add an image (optional)
                </Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPostImage(e.target.files?.[0] || null)}
                  className="mt-1"
                />
              </div>

              {postImage && (
                <div className="mt-3">
                  <img
                    src={URL.createObjectURL(postImage)}
                    alt="Preview"
                    className="max-w-full h-48 object-cover rounded-xl shadow-md"
                  />
                </div>
              )}

              <Button 
                onClick={createPost} 
                disabled={uploading || !newPost.trim()}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg transition-all duration-200"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Posting...
                  </div>
                ) : (
                  'Post'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Posts Feed */}
        {posts.length === 0 ? (
          <Card className="shadow-lg border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardContent className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-primary/60" />
              </div>
              <p className="text-muted-foreground text-lg">No posts yet. Be the first to share something!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card 
              key={post.id} 
              className="shadow-lg hover:shadow-xl border-border/50 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm transition-all duration-300 hover:scale-[1.01] rounded-2xl overflow-hidden"
            >
              <CardHeader className="flex flex-row items-center space-y-0 pb-3">
                <Avatar className="w-12 h-12 mr-3 shadow-md ring-2 ring-primary/10">
                  <AvatarImage src={post.profiles?.avatar_url || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {post.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{post.profiles?.name || 'Unknown User'}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="mb-4 whitespace-pre-wrap text-foreground leading-relaxed">{post.content}</p>
                
                {post.image_url && (
                  <div className="mb-4 rounded-xl overflow-hidden shadow-md">
                    <img
                      src={post.image_url}
                      alt="Post image"
                      className="w-full max-h-96 object-cover transition-transform duration-300 hover:scale-105"
                    />
                  </div>
                )}
                
                <div className="flex items-center space-x-1 pt-3 border-t border-border/30">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likePost(post.id, post.likes)}
                    className={`flex items-center space-x-2 rounded-xl transition-all duration-200 hover:bg-red-50 hover:text-red-600 ${
                      likedPosts.has(post.id) ? 'text-red-600 bg-red-50' : ''
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? 'fill-current' : ''}`} />
                    <span className="font-medium">{post.likes}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center space-x-2 rounded-xl transition-all duration-200 hover:bg-blue-50 hover:text-blue-600 ${
                      openComments.has(post.id) ? 'text-blue-600 bg-blue-50' : ''
                    }`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="font-medium">Comment</span>
                  </Button>
                </div>

                <CommentSection 
                  postId={post.id} 
                  isOpen={openComments.has(post.id)} 
                />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}