import { Resend } from "resend";

const apiKey = process.env["RESEND_API_KEY"];
if (!apiKey) {
  throw new Error("RESEND_API_KEY environment variable is required but was not provided.");
}

const resend = new Resend(apiKey);

export async function sendOtpEmail(to: string, otp: string, fullName: string): Promise<void> {
  const digits = otp.split("");
  const html = `
  <div style="margin:0;padding:0;background:#0b1020;font-family:Segoe UI, Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width:480px;margin:0 auto;padding:32px 24px;">
      <div style="background:linear-gradient(135deg,#1e3a8a,#4c1d95);border-radius:20px;padding:32px 24px;text-align:center;color:#fff;">
        <p style="margin:0 0 8px;letter-spacing:2px;font-size:12px;text-transform:uppercase;color:#a5b4fc;">Student Innovation Program</p>
        <h1 style="margin:0 0 4px;font-size:22px;">Welcome to Datanauts SIP</h1>
        <p style="margin:0 0 24px;font-size:14px;color:#c7d2fe;">backed by BigBrains and team.</p>
        <p style="margin:0 0 16px;font-size:14px;color:#e2e8f0;">Hi ${escapeHtml(fullName)}, use the code below to sign in:</p>
        <div style="display:flex;justify-content:center;gap:8px;margin:0 0 8px;">
          ${digits
            .map(
              (d) =>
                `<span style="display:inline-block;width:40px;height:48px;line-height:48px;background:rgba(255,255,255,0.12);border:1px solid rgba(255,255,255,0.25);border-radius:10px;font-size:22px;font-weight:700;">${escapeHtml(d)}</span>`,
            )
            .join("")}
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#a5b4fc;">This code expires in 10 minutes. If you didn't request it, you can ignore this email.</p>
      </div>
      <p style="text-align:center;margin:20px 0 0;font-size:12px;color:#64748b;">Powered by DataNauts · Student Portal</p>
    </div>
  </div>`;

  const { error } = await resend.emails.send({
    from: "DataNauts SIP <onboarding@resend.dev>",
    to,
    subject: `Your Datanauts SIP sign-in code: ${otp}`,
    html,
  });

  if (error) {
    throw new Error(`Failed to send OTP email: ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
