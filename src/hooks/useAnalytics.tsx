import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackEvent = async (
    eventType: "page_view" | "login" | "interaction" | "search",
    metadata?: Record<string, any>
  ) => {
    try {
      await supabase.from("site_analytics").insert({
        event_type: eventType,
        user_id: user?.id || null,
        metadata: metadata || null,
      });
    } catch (error) {
      console.error("Analytics tracking error:", error);
    }
  };

  const trackPageView = (page: string) => {
    trackEvent("page_view", { page });
  };

  const trackLogin = () => {
    trackEvent("login");
  };

  const trackInteraction = (action: string, details?: Record<string, any>) => {
    trackEvent("interaction", { action, ...details });
  };

  const trackSearch = (query: string) => {
    trackEvent("search", { query });
  };

  return {
    trackEvent,
    trackPageView,
    trackLogin,
    trackInteraction,
    trackSearch,
  };
};
