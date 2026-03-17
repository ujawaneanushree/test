-- User storage tracking table
CREATE TABLE public.user_storage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  storage_plan TEXT NOT NULL DEFAULT 'free',
  storage_limit_gb NUMERIC NOT NULL DEFAULT 4,
  storage_used_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- User media files table
CREATE TABLE public.user_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Site analytics table
CREATE TABLE public.site_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Admin credentials table (simple auth for admin panel)
CREATE TABLE public.admin_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_storage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_credentials ENABLE ROW LEVEL SECURITY;

-- User storage policies
CREATE POLICY "Users can view their own storage"
ON public.user_storage FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own storage"
ON public.user_storage FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own storage"
ON public.user_storage FOR UPDATE
USING (auth.uid() = user_id);

-- User media policies
CREATE POLICY "Users can view their own media"
ON public.user_media FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own media"
ON public.user_media FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own media"
ON public.user_media FOR DELETE
USING (auth.uid() = user_id);

-- Analytics policies (insert only for tracking)
CREATE POLICY "Anyone can insert analytics"
ON public.site_analytics FOR INSERT
WITH CHECK (true);

-- Admin credentials policies (no direct access from client)
CREATE POLICY "No direct access to admin credentials"
ON public.admin_credentials FOR SELECT
USING (false);

-- Create function to auto-create storage record for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_storage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_storage (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Create trigger for new user storage
CREATE TRIGGER on_auth_user_created_storage
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_storage();

-- Insert default admin credentials (admin / admin123)
INSERT INTO public.admin_credentials (admin_id, password_hash)
VALUES ('admin', 'admin123');

-- Add triggers for updated_at
CREATE TRIGGER update_user_storage_updated_at
  BEFORE UPDATE ON public.user_storage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();