import { Zap, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="pt-32 pb-20 px-6">
      <div className="container mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8 animate-fade-in">
          <Zap className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary">Premium Home Theatre Solutions</span>
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold mb-6 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          Experience Cinema
          <br />
          <span className="text-gradient">Like Never Before</span>
        </h1>
        
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: "0.2s" }}>
          Immerse yourself in a shared virtual home-theatre experience with synchronized playback, 
          surround-style audio controls, and seamless casting — letting everyone enjoy premium sound 
          and crystal-clear visuals together from anywhere.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <Link to="/auth">
            <Button variant="hero" size="lg">
              Get Started Free
            </Button>
          </Link>
          <Link to="/subscribe">
            <Button variant="heroOutline" size="lg">
              <CreditCard className="w-4 h-4 mr-2" />
              Explore Plans
            </Button>
          </Link>
        </div>
        
        {/* Stats */}
        <div className="mt-20 pt-10 border-t border-border/50 grid grid-cols-3 gap-8 max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div>
            <div className="text-3xl md:text-4xl font-display font-bold text-primary">4</div>
            <div className="text-sm text-muted-foreground mt-1">Storage Plans</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-display font-bold text-primary">1000+</div>
            <div className="text-sm text-muted-foreground mt-1">Happy Customers</div>
          </div>
          <div>
            <div className="text-3xl md:text-4xl font-display font-bold text-primary">24/7</div>
            <div className="text-sm text-muted-foreground mt-1">Expert Support</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
