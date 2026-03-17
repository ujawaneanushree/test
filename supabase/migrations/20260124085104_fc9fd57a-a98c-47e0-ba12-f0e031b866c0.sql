-- Create storage bucket for user media
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-media', 'user-media', true);

-- Storage policies for user media bucket
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own media"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
ON storage.objects FOR DELETE
USING (bucket_id = 'user-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public can view user media"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-media');