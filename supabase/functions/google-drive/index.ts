import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GOOGLE-DRIVE] ${step}${detailsStr}`);
};

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: string;
  webViewLink: string;
  webContentLink: string;
  createdTime: string;
}

async function getAccessToken(): Promise<string> {
  const accessToken = Deno.env.get("GOOGLE_ACCESS_TOKEN");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");

  // Try using stored access token first
  if (accessToken) {
    logStep("Using stored access token");
    return accessToken;
  }

  // If no access token, try to refresh
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Google Drive credentials not configured");
  }

  logStep("Refreshing access token");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logStep("Token refresh failed", { error });
    throw new Error("Failed to refresh Google access token");
  }

  const data = await response.json();
  logStep("Token refreshed successfully");
  return data.access_token;
}

async function createUserFolder(accessToken: string, userId: string): Promise<string> {
  logStep("Checking for user folder", { userId });
  
  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='user_${userId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  const searchData = await searchResponse.json();
  
  if (searchData.files && searchData.files.length > 0) {
    logStep("Found existing folder", { folderId: searchData.files[0].id });
    return searchData.files[0].id;
  }

  logStep("Creating new folder for user");
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: `user_${userId}`,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    logStep("Failed to create folder", { error });
    throw new Error("Failed to create user folder");
  }

  const folderData = await createResponse.json();
  logStep("Created folder", { folderId: folderData.id });
  return folderData.id;
}

async function uploadFile(
  accessToken: string,
  folderId: string,
  fileName: string,
  fileContent: ArrayBuffer,
  mimeType: string
): Promise<DriveFile> {
  logStep("Uploading file", { fileName, mimeType });

  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", new Blob([fileContent], { type: mimeType }));

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink,createdTime",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    logStep("Upload failed", { error });
    throw new Error("Failed to upload file to Google Drive");
  }

  const fileData = await response.json();

  // Make file shareable
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  logStep("File uploaded successfully", { fileId: fileData.id });
  return fileData;
}

async function listUserFiles(accessToken: string, folderId: string): Promise<DriveFile[]> {
  logStep("Listing files in folder", { folderId });

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,webViewLink,webContentLink,createdTime)&orderBy=createdTime desc`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error("Failed to list files");
  }

  const data = await response.json();
  logStep("Listed files", { count: data.files?.length || 0 });
  return data.files || [];
}

async function deleteFile(accessToken: string, fileId: string): Promise<void> {
  logStep("Deleting file", { fileId });

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok && response.status !== 404) {
    throw new Error("Failed to delete file");
  }
  
  logStep("File deleted successfully");
}

async function getFileLink(accessToken: string, fileId: string): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=webContentLink,webViewLink`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!response.ok) {
    throw new Error("Failed to get file link");
  }

  const data = await response.json();
  return data.webContentLink || data.webViewLink;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData?.user) {
      logStep("Auth error", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    const accessToken = await getAccessToken();
    const folderId = await createUserFolder(accessToken, userId);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    logStep("Processing action", { action });

    // LIST FILES
    if (req.method === "GET" && action === "list") {
      const files = await listUserFiles(accessToken, folderId);
      
      const filesWithLinks = await Promise.all(
        files.map(async (file) => {
          const shareLink = await getFileLink(accessToken, file.id);
          return {
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: parseInt(file.size || "0"),
            shareLink,
            createdAt: file.createdTime,
          };
        })
      );

      return new Response(JSON.stringify({ files: filesWithLinks }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPLOAD FILE
    if (req.method === "POST" && action === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File;
      
      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await file.arrayBuffer();
      const driveFile = await uploadFile(accessToken, folderId, file.name, arrayBuffer, file.type);
      const shareLink = await getFileLink(accessToken, driveFile.id);

      return new Response(
        JSON.stringify({
          success: true,
          file: {
            id: driveFile.id,
            name: driveFile.name,
            mimeType: driveFile.mimeType,
            size: parseInt(driveFile.size || "0"),
            shareLink,
            createdAt: driveFile.createdTime,
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // DELETE FILE
    if (req.method === "DELETE") {
      const { fileId } = await req.json();
      
      if (!fileId) {
        return new Response(JSON.stringify({ error: "No file ID provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await deleteFile(accessToken, fileId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET FILE LINK
    if (req.method === "GET" && action === "link") {
      const fileId = url.searchParams.get("fileId");
      
      if (!fileId) {
        return new Response(JSON.stringify({ error: "No file ID provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const shareLink = await getFileLink(accessToken, fileId);

      return new Response(JSON.stringify({ shareLink }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Internal error";
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
