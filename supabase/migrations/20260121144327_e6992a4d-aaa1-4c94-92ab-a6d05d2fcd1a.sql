-- Add room_access_requests table for join requests
CREATE TABLE public.room_access_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

-- Enable RLS
ALTER TABLE public.room_access_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own requests"
ON public.room_access_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Hosts can view requests for their rooms"
ON public.room_access_requests FOR SELECT
USING (EXISTS (
  SELECT 1 FROM rooms WHERE rooms.id = room_access_requests.room_id AND rooms.host_id = auth.uid()
));

CREATE POLICY "Users can create requests"
ON public.room_access_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts can update requests for their rooms"
ON public.room_access_requests FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM rooms WHERE rooms.id = room_access_requests.room_id AND rooms.host_id = auth.uid()
));

CREATE POLICY "Users can delete their own requests"
ON public.room_access_requests FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_room_access_requests_updated_at
BEFORE UPDATE ON public.room_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add realtime for access requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_access_requests;