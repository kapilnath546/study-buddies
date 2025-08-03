import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Users, User, MessageCircle, LogOut, GraduationCap } from 'lucide-react';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="bg-gradient-to-r from-primary via-primary/95 to-primary/90 shadow-lg border-b border-primary/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <Link to="/" className="text-xl font-bold text-white">
                  SRM Collab
                </Link>
              </div>
            </div>
          
            <div className="hidden sm:flex items-center space-x-6">
              <Link
                to="/feed"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/feed')
                    ? 'text-white bg-white/20 shadow-lg backdrop-blur-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Home className="w-4 h-4 mr-2" />
                Feed
              </Link>
              <Link
                to="/matches"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/matches')
                    ? 'text-white bg-white/20 shadow-lg backdrop-blur-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <Users className="w-4 h-4 mr-2" />
                Matches
              </Link>
              <Link
                to="/profile"
                className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive('/profile')
                    ? 'text-white bg-white/20 shadow-lg backdrop-blur-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <User className="w-4 h-4 mr-2" />
                Profile
              </Link>
              <Button 
                variant="ghost" 
                onClick={signOut} 
                size="sm"
                className="text-white/80 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border/50 z-50 shadow-2xl">
        <div className="grid grid-cols-4 h-16">
          <Link 
            to="/feed" 
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              isActive('/feed') 
                ? 'text-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Feed</span>
          </Link>
          <Link 
            to="/matches" 
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              isActive('/matches') 
                ? 'text-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs font-medium">Matches</span>
          </Link>
          <Link 
            to="/profile" 
            className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
              isActive('/profile') 
                ? 'text-primary bg-primary/5' 
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </Link>
          <button 
            onClick={signOut}
            className="flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-xs font-medium">Logout</span>
          </button>
        </div>
      </div>

      {/* Mobile Spacer */}
      <div className="sm:hidden h-16" />

    </>
  );
};