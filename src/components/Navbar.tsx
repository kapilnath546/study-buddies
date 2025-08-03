import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Home, Users, User, MessageCircle, LogOut } from 'lucide-react';

export const Navbar = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="text-xl font-bold text-primary">
              SRM Collab
            </Link>
          </div>
          
          <div className="hidden sm:flex items-center space-x-8">
            <Link
              to="/feed"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                isActive('/feed')
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Home className="w-4 h-4 mr-2" />
              Feed
            </Link>
            <Link
              to="/matches"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                isActive('/matches')
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Matches
            </Link>
            <Link
              to="/profile"
              className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                isActive('/profile')
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Link>
            <Button variant="ghost" onClick={signOut} size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile menu */}
          <div className="sm:hidden flex items-center space-x-2">
            <Link to="/feed">
              <Button variant={isActive('/feed') ? 'default' : 'ghost'} size="sm">
                <Home className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/matches">
              <Button variant={isActive('/matches') ? 'default' : 'ghost'} size="sm">
                <Users className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant={isActive('/profile') ? 'default' : 'ghost'} size="sm">
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" onClick={signOut} size="sm">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};