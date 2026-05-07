const nodemailer = require("nodemailer");

// In-memory OTP store: { email: { otp, expiresAt } }
const otpStore = new Map();

const OTP_EXPIRY_MINUTES = 5;

// Create Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "vibely2006@gmail.com",
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

/**
 * Generate a 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to email
 */
async function sendOTP(email) {
  const otp = generateOTP();
  const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

  // Store OTP
  otpStore.set(email.toLowerCase(), { otp, expiresAt });

  // Send email
  const mailOptions = {
    from: `"Vibely" <${process.env.GMAIL_USER || "vibely2006@gmail.com"}>`,
    to: email,
    subject: "🔐 Vibely - Email Verification Code",
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 500px; margin: 0 auto; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">💜 Vibely</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0;">Verify Your Email</p>
        </div>
        <div style="padding: 30px; text-align: center;">
          <p style="color: #ccc; font-size: 16px; margin-bottom: 24px;">
            Use the code below to verify your email address:
          </p>
          <div style="background: rgba(108,92,231,0.15); border: 2px solid #6C5CE7; border-radius: 12px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 36px; font-weight: bold; color: #a855f7; letter-spacing: 8px;">${otp}</span>
          </div>
          <p style="color: #888; font-size: 14px; margin-top: 24px;">
            This code will expire in <strong style="color: #a855f7;">${OTP_EXPIRY_MINUTES} minutes</strong>.
          </p>
          <p style="color: #666; font-size: 12px; margin-top: 16px;">
            If you didn't request this code, please ignore this email.
          </p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP sent to ${email} via email: ${otp}`);
  } catch (err) {
    console.error(`❌ Email sending failed: ${err.message}`);
    console.log(`📧 OTP for ${email}: ${otp} (email delivery failed)`);
    throw new Error(`Email sending failed: ${err.message}`);
  }

  return true;
}

/**
 * Verify OTP for an email
 */
function verifyOTP(email, otp) {
  const stored = otpStore.get(email.toLowerCase());

  if (!stored) {
    return { valid: false, message: "No OTP found. Please request a new one." };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (stored.otp !== otp) {
    return { valid: false, message: "Invalid OTP. Please try again." };
  }

  // OTP is valid — remove it so it can't be reused
  otpStore.delete(email.toLowerCase());
  return { valid: true, message: "Email verified successfully." };
}

module.exports = { sendOTP, verifyOTP };
