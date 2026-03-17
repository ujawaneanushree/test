-- Add room_code to rooms table
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_code TEXT UNIQUE;

-- Create a function to generate unique room codes
CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Create trigger to auto-generate room code
CREATE OR REPLACE FUNCTION public.set_room_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.room_code IS NULL THEN
    NEW.room_code := public.generate_room_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_room_code_trigger
BEFORE INSERT ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_room_code();

-- Create room_invitations table
CREATE TABLE public.room_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL,
  invited_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room_members table to track who joined and when
CREATE TABLE public.room_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- Enable RLS on new tables
ALTER TABLE public.room_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for room_invitations
CREATE POLICY "Users can view invitations they sent or received"
ON public.room_invitations
FOR SELECT
USING (
  auth.uid() = invited_by OR 
  auth.email() = invited_email
);

CREATE POLICY "Room hosts can create invitations"
ON public.room_invitations
FOR INSERT
WITH CHECK (
  auth.uid() = invited_by AND
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND host_id = auth.uid())
);

CREATE POLICY "Hosts can update their invitations"
ON public.room_invitations
FOR UPDATE
USING (
  auth.uid() = invited_by OR 
  auth.email() = invited_email
);

CREATE POLICY "Hosts can delete their invitations"
ON public.room_invitations
FOR DELETE
USING (auth.uid() = invited_by);

-- RLS policies for room_members
CREATE POLICY "Anyone can view room members of active rooms"
ON public.room_members
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.rooms WHERE id = room_id AND is_active = true)
);

CREATE POLICY "Authenticated users can join rooms"
ON public.room_members
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership"
ON public.room_members
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
ON public.room_members
FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_room_invitations_updated_at
BEFORE UPDATE ON public.room_invitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing rooms with room codes
UPDATE public.rooms SET room_code = public.generate_room_code() WHERE room_code IS NULL;