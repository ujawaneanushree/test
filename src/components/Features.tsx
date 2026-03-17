import { Volume2, Zap, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Volume2,
    title: "Immersive Sound",
    description: "Experience multi-channel audio with precision engineering for every frequency band.",
  },
  {
    icon: Zap,
    title: "Without Hardware",
    description: "Enjoy a theatre-like experience without any extra hardware — everything runs virtually using your existing devices.",
  },
  {
    icon: Award,
    title: "Expert Support",
    description: "Professional installation and 24/7 customer support to ensure perfect setup.",
  },
];

const Features = () => {
  return (
    <section className="py-20 px-6 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Why Choose Our Systems?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Premium quality, expert support, and systems designed for your home
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={feature.title} 
              className="glass-card hover:border-primary/30 transition-all duration-300 group animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-8">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-display font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
