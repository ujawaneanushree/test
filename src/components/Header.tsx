import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/UserAvatar";

const Header = () => {
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-primary font-display font-bold text-xl">CINE</span>
          <span className="font-display font-bold text-xl text-foreground">SPHERE</span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            Home
          </Link>
          <Link to="/subscribe" className="text-muted-foreground hover:text-foreground transition-colors">
            Subscribe
          </Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
            Contact
          </Link>
        </nav>
        
        <div className="flex items-center gap-4">
          {!loading && (
            user ? (
              <UserAvatar />
            ) : (
              <Link to="/auth">
                <Button variant="hero" size="sm">
                  Get Started
                </Button>
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
