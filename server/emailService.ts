import nodemailer, { type Transporter } from "nodemailer";

interface SendInvitationEmailParams {
  toEmail: string;
  teacherName: string;
  schoolName: string;
  activationLink: string;
  expiresInDays?: number;
}

let cachedTransporter: Transporter | null = null;

function getEmailTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  try {
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      },
      tls: {
        rejectUnauthorized: true
      }
    });
    return cachedTransporter;
  } catch (err) {
    console.error("Failed to initialize email transporter:", err);
    return null;
  }
}

export async function sendTeacherInvitationEmail({
  toEmail,
  teacherName,
  schoolName,
  activationLink,
  expiresInDays = 7
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string; simulated?: boolean }> {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@dugsigapro.edu";
  const cleanEmail = toEmail.trim().toLowerCase();

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Casuumaad: Ku soo dhowow ${schoolName}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 4px solid #7c3aed; }
    .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: #94a3b8; margin: 6px 0 0; font-size: 13px; }
    .content { padding: 32px 28px; line-height: 1.6; }
    .greeting { font-size: 17px; font-weight: 600; color: #0f172a; margin-bottom: 12px; }
    .message { font-size: 14px; color: #475569; margin-bottom: 24px; }
    .btn-container { text-align: center; margin: 32px 0; }
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(124, 58, 237, 0.25); }
    .expiry-note { font-size: 12px; color: #64748b; background-color: #f1f5f9; padding: 12px; border-radius: 6px; border-left: 3px solid #7c3aed; margin-bottom: 20px; }
    .link-alt { font-size: 12px; color: #64748b; word-break: break-all; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
    .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${schoolName}</h1>
      <p>Nidaamka Maamulka Dugsiga – DUGSI PRO 2026</p>
    </div>
    <div class="content">
      <div class="greeting">Ku soo dhowow, Macallin ${teacherName}!</div>
      <p class="message">
        Maamulka dugsiga <strong>${schoolName}</strong> ayaa kugu soo daray nidaamka maamulka waxbarashada ee DUGSI PRO 2026 adigoo ah <strong>Macallin (Teacher)</strong>.
      </p>
      <p class="message">
        Si aad u gasho akoonkaaga, u aragto fasallada iyo maadooyinka laguu xilsaaray, uguna calaamadayso xaadirinta iyo dhibcaha ardaydaada, fadlan riix batoonka hoose si aad u samaysato furahaaga sirta ah (password):
      </p>
      
      <div class="btn-container">
        <a href="${activationLink}" class="btn" target="_blank">Dhaqaaji Akoonkaaga (Activate Account)</a>
      </div>

      <div class="expiry-note">
        ⏰ <strong>Ogeysiis Muhiim ah:</strong> Link-gan casuumaaddu wuxuu shaqeynayaa <strong>${expiresInDays} maalmood</strong> gudahood. Maamulka dugsigu ma oga mana geli karo password-kaaga, adiga ayaa toos u samaysanaya.
      </div>

      <div class="link-alt">
        Haddii batoonka kore uusan shaqeynin, fadlan ku koobi garee link-gan browser-kaaga:<br>
        <a href="${activationLink}" style="color: #7c3aed;">${activationLink}</a>
      </div>
    </div>
    <div class="footer">
      Farriintan waxaa si toos ah kuugu soo dirtay ${schoolName} iyada oo loo marayo DUGSI PRO 2026.<br>
      Fadlan ha ka jawaabin email-kan.
    </div>
  </div>
</body>
</html>
  `;

  const textContent = `
Ku soo dhowow ${schoolName}, Macallin ${teacherName}!

Maamulka dugsiga ayaa kugu soo daray nidaamka DUGSI PRO 2026 adigoo ah Macallin.
Fadlan guji link-gan si aad u dhaqaajiso akoonkaaga oo aad u samaysato password-kaaga:

${activationLink}

Link-gani wuxuu dhacayaa ${expiresInDays} maalmood gudahood.
  `.trim();

  const transporter = getEmailTransporter();
  if (!transporter) {
    console.log(`[Email Service Notice] SMTP not configured. Simulating invitation email to ${cleanEmail}:`);
    console.log(`[Activation Link]: ${activationLink}`);
    return {
      success: true,
      simulated: true
    };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${schoolName}" <${fromEmail}>`,
      to: cleanEmail,
      subject: `Casuumaad Macallin: Ku soo dhowow ${schoolName} (Dhaqaaji Akoonkaaga)`,
      text: textContent,
      html: htmlContent
    });

    console.log(`[Email Service] Invitation email sent to ${cleanEmail}: ${info.messageId}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[Email Service Error] Failed to send email to ${cleanEmail}:`, err?.message || err);
    return { success: false, error: err?.message || "Email sending failed" };
  }
}


interface SendPasswordResetEmailParams {
  toEmail: string;
  resetLink: string;
  expiresInMinutes?: number;
}

function escapeEmailHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character] || character;
  });
}

/**
 * Password-reset tokens are bearer secrets: never log them or return them from
 * the API. Delivery is reported as failed when SMTP is not configured.
 */
export async function sendPasswordResetEmail({
  toEmail,
  resetLink,
  expiresInMinutes = 30
}: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@dugsigapro.edu";
  const cleanEmail = toEmail.trim().toLowerCase();
  const safeLink = escapeEmailHtml(resetLink);
  const safeRecipient = escapeEmailHtml(cleanEmail);
  const transporter = getEmailTransporter();

  if (!transporter) {
    return { success: false, error: "SMTP is not configured." };
  }

  const html = `
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DUGSI PRO password reset</title></head>
<body style="margin:0;padding:24px;background:#f8fafc;color:#0f172a;font-family:Arial,sans-serif">
  <main style="max-width:560px;margin:0 auto;padding:28px;background:#fff;border:1px solid #e2e8f0;border-radius:14px">
    <p style="font-size:12px;font-weight:700;letter-spacing:.1em;color:#6d28d9">DUGSI PRO 2026</p>
    <h1 style="font-size:24px;line-height:1.3">Reset your password</h1>
    <p style="font-size:14px;line-height:1.7;color:#475569">A request was made to reset the password for ${safeRecipient}. Use the secure link below to choose a new password.</p>
    <p style="margin:28px 0"><a href="${safeLink}" style="display:inline-block;padding:13px 20px;border-radius:8px;background:#6d28d9;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p>
    <p style="font-size:12px;line-height:1.6;color:#64748b">This one-time link expires in ${expiresInMinutes} minutes. If you did not request a reset, you can ignore this message; your password will not change.</p>
    <p style="font-size:11px;line-height:1.6;color:#94a3b8;word-break:break-all">If the button does not work, copy this link into your browser: ${safeLink}</p>
  </main>
</body>
</html>`;

  const textContent = [
    "DUGSI PRO 2026 — Password reset",
    "",
    "A request was made to reset the password for " + cleanEmail + ".",
    "Use this one-time link to choose a new password:",
    resetLink,
    "",
    "The link expires in " + expiresInMinutes + " minutes.",
    "If you did not request this, ignore this message."
  ].join("\n");

  try {
    await transporter.sendMail({
      from: `"DUGSI PRO 2026" <${fromEmail}>`,
      to: cleanEmail,
      subject: "DUGSI PRO 2026 — Reset your password",
      text: textContent,
      html
    });
    return { success: true };
  } catch (error: any) {
    console.error("[Password Reset Email] Delivery failed:", error?.message || error);
    return { success: false, error: error?.message || "Email sending failed." };
  }
}
