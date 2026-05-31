import nodemailer from "nodemailer";

function createTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: Number(SMTP_PORT) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return null;
}

export async function sendVerificationEmail(email, token) {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  const verifyUrl = `${clientUrl}/verify-email/${token}`;
  const transporter = createTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@quizcraft.app",
      to: email,
      subject: "QuizCraft — Verify Your Email Address",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">Welcome to QuizCraft!</h2>
          <p>Thanks for signing up. Please verify your email address to get started.</p>
          <a href="${verifyUrl}"
             style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: #fff;
                    text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
            Verify Email
          </a>
          <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
          <p style="color: #999; font-size: 12px;">If you did not create an account, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`[VERIFICATION EMAIL] ${email} -> verification link dispatched`);
    return;
  }
  console.warn(`[VERIFICATION EMAIL] ${email} -> SMTP not configured; verification email skipped`);
}

export async function sendResetEmail(email, token) {
  const clientUrl = (process.env.CLIENT_URL || "http://localhost:5173").replace(/\/+$/, "");
  const resetUrl = `${clientUrl}/reset-password/${token}`;
  const transporter = createTransporter();
  if (transporter) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || "noreply@quizcraft.app",
      to: email,
      subject: "QuizCraft — Password Reset Request",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #8b5cf6;">Password Reset</h2>
          <p>You requested a password reset. Click the button below to set a new password.</p>
          <a href="${resetUrl}"
             style="display: inline-block; padding: 12px 24px; background: #8b5cf6; color: #fff;
                    text-decoration: none; border-radius: 8px; font-weight: bold; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`[RESET LINK] ${email} -> password reset link dispatched`);
    return;
  }
  console.warn(`[RESET LINK] ${email} -> SMTP not configured; password reset email skipped`);
}
