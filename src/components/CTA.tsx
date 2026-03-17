import { Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const CTA = () => {
  return (
    <section className="py-20 px-6">
      <div className="container mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
          Ready to Transform Your Home Theatre?
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto mb-10">
          Get in touch with our experts today to discuss your home theatre needs and find the perfect system for your space.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link to="/contact">
            <Button variant="hero" size="lg">
              Schedule Consultation
            </Button>
          </Link>
          <Link to="/compare">
            <Button variant="heroOutline" size="lg">
              View Pricing
            </Button>
          </Link>
        </div>
        
        <div className="pt-8 border-t border-border/50">
          <p className="text-muted-foreground mb-4">Or reach us directly:</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="tel:+918007702377" className="flex items-center gap-2 text-primary hover:underline">
              <Phone className="w-4 h-4" />
              +91 8007702377
            </a>
            <a href="mailto:Sonicly123@Gmail.com" className="flex items-center gap-2 text-primary hover:underline">
              <Mail className="w-4 h-4" />
              Sonicly123@Gmail.com
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
