import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ContactRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactRequest = await req.json();

    if (!name || !email || !subject || !message) {
      throw new Error("All fields are required");
    }

    // Send email to the team
    const emailResponse = await resend.emails.send({
      from: "Contact Form <onboarding@resend.dev>",
      to: ["datanauts.sphn@gmail.com"],
      subject: `[datanauts SPHN] ${subject}`,
      html: `
        <div style="font-family: 'Courier New', monospace; background: #0a0a0a; color: #00ff88; padding: 40px; border: 1px solid #00ff88;">
          <h1 style="color: #00ff88; border-bottom: 1px solid #00ff88; padding-bottom: 10px;">New Contact Form Submission</h1>
          
          <div style="margin: 20px 0;">
            <p style="color: #666;"><strong style="color: #00d4ff;">From:</strong></p>
            <p style="margin-left: 20px;">${name} &lt;${email}&gt;</p>
          </div>
          
          <div style="margin: 20px 0;">
            <p style="color: #666;"><strong style="color: #00d4ff;">Subject:</strong></p>
            <p style="margin-left: 20px;">${subject}</p>
          </div>
          
          <div style="margin: 20px 0;">
            <p style="color: #666;"><strong style="color: #00d4ff;">Message:</strong></p>
            <div style="margin-left: 20px; white-space: pre-wrap; background: #111; padding: 15px; border-left: 3px solid #00ff88;">
              ${message}
            </div>
          </div>
          
          <hr style="border-color: #333; margin: 30px 0;" />
          <p style="color: #666; font-size: 12px;">This message was sent from the ALPHABAY X contact form.</p>
        </div>
      `,
    });

    console.log("Contact email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    console.error("Error in send-contact-email function:", error);
    const message = error instanceof Error ? error.message : "Unexpected error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
