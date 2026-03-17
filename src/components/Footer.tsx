import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="py-8 px-6 border-t border-border/50">
      <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="text-primary font-display font-bold">CINE</span>
          <span className="font-display font-bold text-foreground">SPHERE</span>
        </Link>
        
        <p className="text-sm text-muted-foreground">
          © 2024 CineSphere. All rights reserved.
        </p>
        
        <nav className="flex items-center gap-6">
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Privacy
          </Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Terms
          </Link>
        </nav>
      </div>
    </footer>
  );
};

export default Footer;
