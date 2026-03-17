import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  HardDrive,
  Upload,
  Video,
  Music,
  Trash2,
  Loader2,
  FolderOpen,
  Zap,
  Play,
  Pause,
  X,
  Cloud,
} from "lucide-react";
import { Link } from "react-router-dom";
import audioCover from "@/assets/audio-cover.png";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  shareLink: string;
  createdAt: string;
}

interface StorageInfo {
  storage_plan: string;
  storage_limit_gb: number;
  storage_used_bytes: number;
}

interface UploadProgress {
  fileName: string;
  progress: number;
  isUploading: boolean;
}

const StoragePanel = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<DriveFile[]>([]);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    storage_plan: "free",
    storage_limit_gb: 4,
    storage_used_bytes: 0,
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [playingFile, setPlayingFile] = useState<DriveFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      fetchStorageInfo();
      fetchMediaFiles();
    }
  }, [user, isOpen]);

  const fetchStorageInfo = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_storage")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data) {
      setStorageInfo({
        storage_plan: data.storage_plan,
        storage_limit_gb: Number(data.storage_limit_gb),
        storage_used_bytes: Number(data.storage_used_bytes),
      });
    } else if (!data) {
      await supabase.from("user_storage").insert({ user_id: user.id });
    }
  };

  const fetchMediaFiles = async () => {
    if (!user || !session?.access_token) return;
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive?action=list`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (res.ok) {
        const data = await res.json();
        setMediaFiles(data.files || []);
        
        // Calculate total storage used
        const totalBytes = (data.files || []).reduce((acc: number, file: DriveFile) => acc + file.size, 0);
        await supabase
          .from("user_storage")
          .update({ storage_used_bytes: totalBytes })
          .eq("user_id", user.id);
        
        setStorageInfo(prev => ({ ...prev, storage_used_bytes: totalBytes }));
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user || !session?.access_token) return;

    const file = files[0];
    
    // Validate file type - only audio and video
    const allowedTypes = ['audio/', 'video/'];
    const isAllowed = allowedTypes.some(type => file.type.startsWith(type));
    
    if (!isAllowed) {
      toast({
        title: "Invalid File Type",
        description: "Only audio and video files are allowed.",
        variant: "destructive",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const maxSize = storageInfo.storage_limit_gb * 1024 * 1024 * 1024;
    const newUsed = storageInfo.storage_used_bytes + file.size;

    if (newUsed > maxSize) {
      toast({
        title: "Storage Limit Exceeded",
        description: "Please upgrade your plan to upload more files.",
        variant: "destructive",
      });
      return;
    }

    setUploadProgress({ fileName: file.name, progress: 0, isUploading: true });

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (!prev || prev.progress >= 90) return prev;
          return { ...prev, progress: prev.progress + 10 };
        });
      }, 300);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive?action=upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      clearInterval(progressInterval);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      setUploadProgress(prev => prev ? { ...prev, progress: 100 } : null);

      toast({
        title: "File Uploaded!",
        description: `${file.name} has been uploaded to Google Drive.`,
      });

      setTimeout(() => {
        setUploadProgress(null);
        fetchMediaFiles();
      }, 500);

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
      setUploadProgress(null);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const deleteFile = async (file: DriveFile) => {
    if (!user || !session?.access_token) return;

    try {
      if (playingFile?.id === file.id) {
        stopPlayback();
      }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ fileId: file.id }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Delete failed");
      }

      toast({
        title: "File Deleted",
        description: `${file.name} has been removed.`,
      });

      fetchMediaFiles();
    } catch (error: any) {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const playFile = (file: DriveFile) => {
    setPlayingFile(file);
    setIsPlaying(true);
  };

  const stopPlayback = () => {
    if (audioRef.current) audioRef.current.pause();
    if (videoRef.current) videoRef.current.pause();
    setPlayingFile(null);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    const mediaElement = playingFile?.mimeType?.startsWith('video/') 
      ? videoRef.current 
      : audioRef.current;
    
    if (mediaElement) {
      if (isPlaying) {
        mediaElement.pause();
      } else {
        mediaElement.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType?.startsWith("video/")) return <Video className="w-5 h-5 text-accent" />;
    return <Music className="w-5 h-5 text-primary" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const usedPercentage = (storageInfo.storage_used_bytes / (storageInfo.storage_limit_gb * 1024 * 1024 * 1024)) * 100;
  const isAudioPlaying = playingFile?.mimeType?.startsWith('audio/');
  const isVideoPlaying = playingFile?.mimeType?.startsWith('video/');

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="heroOutline" size="lg" className="w-full sm:w-auto">
          <HardDrive className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
          <span className="hidden sm:inline">My Storage</span>
          <span className="sm:hidden">Storage</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg bg-card border-border overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display flex items-center gap-2 text-lg sm:text-xl">
            <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            Google Drive Storage
          </SheetTitle>
          <SheetDescription className="text-sm">Manage your uploaded media files</SheetDescription>
        </SheetHeader>

        <div className="mt-4 sm:mt-6 space-y-4 sm:space-y-6">
          {/* Storage Usage */}
          <Card className="glass-card">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
                <span className="text-xs sm:text-sm text-muted-foreground">Storage Used</span>
                <span className="text-xs sm:text-sm font-medium capitalize">
                  {storageInfo.storage_plan} Plan
                </span>
              </div>
              <Progress value={usedPercentage} className="h-2 mb-2" />
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">
                  {formatBytes(storageInfo.storage_used_bytes)} used
                </span>
                <span className="text-muted-foreground">
                  {storageInfo.storage_limit_gb} GB total
                </span>
              </div>
              {usedPercentage > 80 && (
                <Link to="/subscribe">
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-primary text-xs sm:text-sm">
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                    Upgrade for more storage
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Upload Progress */}
          {uploadProgress && (
            <Card className="glass-card border-primary/30">
              <CardContent className="pt-3 pb-3 sm:pt-4 sm:pb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{uploadProgress.fileName}</p>
                    <Progress value={uploadProgress.progress} className="h-1.5 mt-1" />
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      Uploading to Google Drive... {uploadProgress.progress}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Media Player */}
          {playingFile && (
            <Card className="glass-card border-primary/30 overflow-hidden">
              <CardContent className="p-0">
                {isVideoPlaying && playingFile.shareLink && (
                  <video
                    ref={videoRef}
                    src={playingFile.shareLink}
                    className="w-full aspect-video bg-black"
                    controls
                    autoPlay
                    onEnded={() => setIsPlaying(false)}
                  />
                )}
                {isAudioPlaying && (
                  <div className="relative">
                    {/* Audio Cover with nano background */}
                    <div className="relative w-full aspect-square bg-gradient-to-br from-background via-secondary/20 to-background overflow-hidden">
                      {/* Nano particles background */}
                      <div className="absolute inset-0 opacity-20">
                        {[...Array(20)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute w-1 h-1 bg-primary/50 rounded-full animate-pulse"
                            style={{
                              left: `${Math.random() * 100}%`,
                              top: `${Math.random() * 100}%`,
                              animationDelay: `${Math.random() * 2}s`,
                              animationDuration: `${2 + Math.random() * 3}s`,
                            }}
                          />
                        ))}
                      </div>
                      {/* Decorative lines */}
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                        <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                        <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
                      </div>
                      {/* Cover image */}
                      <img
                        src={audioCover}
                        alt="Audio Cover"
                        className="absolute inset-0 w-full h-full object-contain p-8 opacity-80"
                      />
                      {/* Play/Pause overlay */}
                      <button
                        onClick={togglePlayPause}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                      >
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/90 flex items-center justify-center shadow-lg">
                          {isPlaying ? (
                            <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" />
                          ) : (
                            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground ml-1" />
                          )}
                        </div>
                      </button>
                    </div>
                    <audio
                      ref={audioRef}
                      src={playingFile.shareLink}
                      autoPlay
                      onEnded={() => setIsPlaying(false)}
                    />
                  </div>
                )}
                <div className="p-3 flex items-center justify-between bg-secondary/30">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium truncate">{playingFile.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">Now Playing</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={stopPlayback}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept="audio/*,video/*"
            />
            <Button
              variant="hero"
              className="w-full"
              onClick={() => fileInputRef.current?.click()}
              disabled={!!uploadProgress}
            >
              {uploadProgress ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Upload Audio/Video
            </Button>
            <p className="text-[10px] sm:text-xs text-muted-foreground text-center mt-2">
              Files are securely stored in Google Drive
            </p>
          </div>

          {/* Media Library */}
          <div>
            <h3 className="text-xs sm:text-sm font-medium mb-3 flex items-center gap-2">
              <FolderOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              Media Library ({mediaFiles.length})
            </h3>
            
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : mediaFiles.length === 0 ? (
              <Card className="glass-card text-center py-6 sm:py-8">
                <CardContent>
                  <FolderOpen className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground text-xs sm:text-sm">No media files yet</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">Upload audio or video to get started</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-[350px] sm:max-h-[400px] overflow-y-auto pr-1">
                {mediaFiles.map((file) => {
                  const isVideo = file.mimeType?.startsWith('video/');
                  const isCurrentlyPlaying = playingFile?.id === file.id;
                  
                  return (
                    <Card 
                      key={file.id} 
                      className={`glass-card overflow-hidden group cursor-pointer transition-all hover:scale-[1.02] ${
                        isCurrentlyPlaying ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                      }`}
                      onClick={() => playFile(file)}
                    >
                      <div className="relative aspect-square bg-gradient-to-br from-secondary/50 via-background to-secondary/30 flex items-center justify-center">
                        {/* Thumbnail background */}
                        <div className="absolute inset-0 opacity-30">
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
                        </div>
                        
                        {/* Media icon */}
                        <div className={`relative z-10 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${
                          isVideo ? 'bg-accent/20' : 'bg-primary/20'
                        }`}>
                          {isVideo ? (
                            <Video className="w-5 h-5 sm:w-6 sm:h-6 text-accent" />
                          ) : (
                            <Music className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                          )}
                        </div>
                        
                        {/* Play overlay */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform">
                            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground ml-0.5" />
                          </div>
                        </div>
                        
                        {/* Currently playing indicator */}
                        {isCurrentlyPlaying && (
                          <div className="absolute top-1 left-1 sm:top-2 sm:left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-medium">
                            Playing
                          </div>
                        )}
                        
                        {/* Delete button */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-1 right-1 sm:top-2 sm:right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-destructive/80 hover:bg-destructive text-white h-6 w-6 sm:h-7 sm:w-7 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card border-border max-w-[90vw] sm:max-w-lg">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base sm:text-lg">Delete File</AlertDialogTitle>
                              <AlertDialogDescription className="text-xs sm:text-sm">
                                Are you sure you want to delete "{file.name}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="gap-2 sm:gap-0">
                              <AlertDialogCancel className="bg-secondary text-xs sm:text-sm">Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFile(file)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs sm:text-sm"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      
                      {/* File info */}
                      <CardContent className="p-1.5 sm:p-2">
                        <p className="text-[10px] sm:text-xs font-medium truncate">{file.name}</p>
                        <p className="text-[8px] sm:text-[10px] text-muted-foreground">
                          {formatBytes(file.size)}
                        </p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default StoragePanel;
