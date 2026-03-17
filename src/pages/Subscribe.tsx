import { useState, useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, HardDrive, Zap, Crown, Loader2, Settings } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link } from "react-router-dom";

// Stripe product/price mapping
const PLAN_TIERS = {
  basic: {
    price_id: "price_1Stn19QrCneZTZl0joyjRowt",
    product_id: "prod_TrW3tsXkHMsauU",
  },
  pro: {
    price_id: "price_1Stn1HQrCneZTZl0zD5ouJPC",
    product_id: "prod_TrW38WyQLjTux6",
  },
  premium: {
    price_id: "price_1Stn1IQrCneZTZl04OcBuLtj",
    product_id: "prod_TrW3w98FBHW5f9",
  },
};

const storagePlans = [
  {
    name: "Free",
    tier: "free",
    price: "₹0",
    period: "forever",
    storage: "4 GB",
    icon: HardDrive,
    features: [
      "4 GB Cloud Storage",
      "Basic Media Upload",
      "Create & Join Rooms",
      "Standard Support",
    ],
    popular: false,
    buttonText: "Current Plan",
  },
  {
    name: "Basic",
    tier: "basic",
    price: "₹83",
    period: "/month",
    storage: "8 GB",
    icon: Zap,
    features: [
      "8 GB Cloud Storage",
      "HD Media Upload",
      "Priority Room Access",
      "Email Support",
      "No Ads",
    ],
    popular: false,
    buttonText: "Upgrade to Basic",
  },
  {
    name: "Pro",
    tier: "pro",
    price: "₹124",
    period: "/month",
    storage: "10 GB",
    icon: Zap,
    features: [
      "10 GB Cloud Storage",
      "4K Media Upload",
      "Unlimited Rooms",
      "Priority Support",
      "No Ads",
      "Advanced Analytics",
    ],
    popular: true,
    buttonText: "Upgrade to Pro",
  },
  {
    name: "Premium",
    tier: "premium",
    price: "₹207",
    period: "/month",
    storage: "20 GB",
    icon: Crown,
    features: [
      "20 GB Cloud Storage",
      "4K + HDR Media Upload",
      "Unlimited Everything",
      "24/7 Priority Support",
      "No Ads",
      "Advanced Analytics",
      "Custom Room Themes",
      "Early Access Features",
    ],
    popular: false,
    buttonText: "Upgrade to Premium",
  },
];

interface SubscriptionStatus {
  subscribed: boolean;
  plan: string;
  storage_gb: number;
  subscription_end?: string;
}

const Subscribe = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionStatus>({
    subscribed: false,
    plan: "free",
    storage_gb: 4,
  });
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  useEffect(() => {
    if (user) {
      checkSubscription();
    } else {
      setCheckingSubscription(false);
    }
  }, [user]);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success) {
      toast({
        title: "Subscription Successful!",
        description: "Your storage plan has been upgraded. Refreshing status...",
      });
      setTimeout(() => checkSubscription(), 2000);
    } else if (canceled) {
      toast({
        title: "Subscription Canceled",
        description: "You can upgrade anytime.",
        variant: "destructive",
      });
    }
  }, [searchParams]);

  const checkSubscription = async () => {
    if (!user) return;
    
    setCheckingSubscription(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      
      if (error) throw error;
      
      setSubscription({
        subscribed: data.subscribed,
        plan: data.plan || "free",
        storage_gb: data.storage_gb || 4,
        subscription_end: data.subscription_end,
      });
    } catch (error: any) {
      console.error("Error checking subscription:", error);
    } finally {
      setCheckingSubscription(false);
    }
  };

  const handleSubscribe = async (planTier: string) => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to subscribe to a plan",
        variant: "destructive",
      });
      return;
    }

    if (planTier === "free") return;

    const tier = PLAN_TIERS[planTier as keyof typeof PLAN_TIERS];
    if (!tier) return;

    setLoading(planTier);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: tier.price_id },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to create checkout session",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    setLoading("manage");

    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error: any) {
      toast({
        title: "Portal Error",
        description: error.message || "Failed to open subscription management",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planTier: string) => {
    return subscription.plan === planTier;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
              Choose Your <span className="text-gradient">Storage Plan</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Upgrade your storage to upload more media and enhance your CineSphere experience
            </p>
            
            {subscription.subscribed && (
              <div className="mt-6">
                <Button 
                  variant="heroOutline" 
                  onClick={handleManageSubscription}
                  disabled={loading === "manage"}
                >
                  {loading === "manage" ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Settings className="w-4 h-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              </div>
            )}
          </div>

          {checkingSubscription ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {storagePlans.map((plan, index) => {
                const IconComponent = plan.icon;
                const isCurrent = isCurrentPlan(plan.tier);
                const isUpgrade = !isCurrent && plan.tier !== "free";
                
                // Determine if this is the recommended upgrade for current plan
                const isRecommendedUpgrade = 
                  (subscription.plan === "basic" && plan.tier === "pro") ||
                  (subscription.plan === "pro" && plan.tier === "premium");
                
                return (
                  <Card
                    key={plan.name}
                    className={`glass-card relative overflow-hidden transition-all duration-300 hover:border-primary/50 animate-fade-in ${
                      plan.popular && !isCurrent ? "border-primary/50 glow-primary" : ""
                    } ${isCurrent ? "border-primary glow-primary" : ""} ${
                      isRecommendedUpgrade ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
                    }`}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    {isRecommendedUpgrade && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-accent text-accent-foreground text-xs font-medium animate-pulse">
                        Recommended
                      </div>
                    )}
                    {plan.popular && !isCurrent && !isRecommendedUpgrade && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        Most Popular
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        Your Plan
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                        <IconComponent className="w-6 h-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl font-display">{plan.name}</CardTitle>
                      <CardDescription className="text-muted-foreground">
                        {plan.storage} Storage
                      </CardDescription>
                      <div className="pt-2">
                        <span className="text-3xl font-display font-bold text-primary">{plan.price}</span>
                        <span className="text-muted-foreground ml-1">{plan.period}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <ul className="space-y-3">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-3 text-sm">
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3 h-3 text-primary" />
                            </div>
                            <span className="text-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button
                        variant={isRecommendedUpgrade || plan.popular || isCurrent ? "hero" : "heroOutline"}
                        className="w-full mt-4"
                        disabled={isCurrent || loading === plan.tier}
                        onClick={() => handleSubscribe(plan.tier)}
                      >
                        {loading === plan.tier ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        {isCurrent ? "Current Plan" : isRecommendedUpgrade ? `Upgrade to ${plan.name}` : plan.buttonText}
                      </Button>
                      {isRecommendedUpgrade && (
                        <p className="text-xs text-accent text-center mt-2">
                          Get {plan.tier === "pro" ? "2GB" : "10GB"} more storage!
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <div className="text-center mt-12">
            <p className="text-muted-foreground text-sm">
              All plans include access to create and join rooms. Need more storage?{" "}
              <Link to="/contact" className="text-primary hover:underline">
                Contact us
              </Link>{" "}
              for custom enterprise plans.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Subscribe;
