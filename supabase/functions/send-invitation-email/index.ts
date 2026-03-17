import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationEmailRequest {
  invitedEmail: string;
  roomName: string;
  roomCode: string;
  inviterName: string;
  roomUrl: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Processing invitation email request...");

    const { invitedEmail, roomName, roomCode, inviterName, roomUrl }: InvitationEmailRequest = await req.json();

    console.log(`Sending invitation to ${invitedEmail} for room "${roomName}"`);

    const emailResponse = await resend.emails.send({
      from: "CineSphere <onboarding@resend.dev>",
      to: [invitedEmail],
      subject: `You've been invited to join "${roomName}" on CineSphere!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0a0a; color: #ffffff; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .header { text-align: center; margin-bottom: 40px; }
            .logo { font-size: 28px; font-weight: bold; background: linear-gradient(135deg, #8B5CF6, #EC4899); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
            .card { background: linear-gradient(145deg, #1a1a2e, #16213e); border-radius: 16px; padding: 32px; margin-bottom: 24px; border: 1px solid rgba(139, 92, 246, 0.2); }
            .title { font-size: 24px; font-weight: 600; margin-bottom: 16px; color: #ffffff; }
            .text { font-size: 16px; line-height: 1.6; color: #a0a0a0; margin-bottom: 16px; }
            .highlight { color: #8B5CF6; font-weight: 600; }
            .room-code { display: inline-block; background: rgba(139, 92, 246, 0.2); padding: 8px 16px; border-radius: 8px; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px; color: #8B5CF6; margin: 16px 0; }
            .button { display: inline-block; background: linear-gradient(135deg, #8B5CF6, #EC4899); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-top: 16px; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 32px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🎬 CineSphere</div>
            </div>
            <div class="card">
              <h1 class="title">You're Invited! 🎉</h1>
              <p class="text">
                <span class="highlight">${inviterName}</span> has invited you to join their watch room on CineSphere!
              </p>
              <p class="text">
                <strong>Room Name:</strong> ${roomName}
              </p>
              <p class="text">
                <strong>Room Code:</strong>
              </p>
              <div class="room-code">${roomCode}</div>
              <p class="text">
                Click the button below to accept the invitation and join the room:
              </p>
              <a href="${roomUrl}" class="button">Join Room</a>
            </div>
            <div class="footer">
              <p>If you didn't expect this invitation, you can safely ignore this email.</p>
              <p>© ${new Date().getFullYear()} CineSphere. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invitation email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
