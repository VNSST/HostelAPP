const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

// In-memory OTP store: Map<email, { otp, expiresAt, attempts, createdAt }>
const otpStore = new Map();
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Create email transporter.
 * Uses SMTP config from .env, or falls back to console logging.
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass }
  });
}

/**
 * Send OTP via email or fall back to console.
 */
async function sendOTPEmail(email, otp) {
  const transporter = getTransporter();

  if (!transporter) {
    console.log('');
    console.log('┌───────────────────────────────────────────────┐');
    console.log(`│  📧 OTP for ${email}`);
    console.log(`│  🔢 Code: ${otp}`);
    console.log('│  ⏱  Expires in 5 minutes');
    console.log('│  ℹ  SMTP not configured — console mode');
    console.log('└───────────────────────────────────────────────┘');
    console.log('');
    return { success: true, mode: 'console' };
  }

  try {
    const fromName = process.env.SMTP_FROM_NAME || 'Mana PG Rent';
    const fromEmail = process.env.SMTP_USER;

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: `${otp} is your Mana PG Rent verification code`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 2rem;">
          <div style="text-align: center; margin-bottom: 1.5rem;">
            <div style="width: 56px; height: 56px; border-radius: 14px; background: linear-gradient(135deg, #4F46E5, #6366F1); display: inline-flex; align-items: center; justify-content: center; font-size: 1.5rem;">🏠</div>
          </div>
          <h2 style="text-align: center; color: #1E293B; margin-bottom: 0.5rem;">Verify Your Email</h2>
          <p style="text-align: center; color: #64748B; margin-bottom: 2rem;">Use the code below to complete your Mana PG Rent registration.</p>
          <div style="text-align: center; background: #F1F5F9; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem;">
            <span style="font-size: 2rem; font-weight: 800; letter-spacing: 0.5rem; color: #4F46E5;">${otp}</span>
          </div>
          <p style="text-align: center; color: #94A3B8; font-size: 0.85rem;">This code expires in <strong>5 minutes</strong>.</p>
          <p style="text-align: center; color: #94A3B8; font-size: 0.8rem; margin-top: 2rem;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    });

    console.log(`[OTP] Email sent to ${email}`);
    return { success: true, mode: 'email' };
  } catch (err) {
    console.error(`[OTP] Email send failed:`, err.message);
    console.log(`[OTP] Fallback — OTP for ${email}: ${otp}`);
    return { success: true, mode: 'console-fallback', error: err.message };
  }
}

/**
 * POST /auth/send-otp
 */
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    // Rate limit: 60 seconds between resends
    const existing = otpStore.get(email);
    if (existing && (Date.now() - existing.createdAt) < 60000) {
      return res.status(429).json({ error: 'Please wait 60 seconds before requesting another OTP.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore.set(email, {
      otp,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      createdAt: Date.now(),
      attempts: 0
    });

    const result = await sendOTPEmail(email, otp);

    res.json({ message: 'OTP sent successfully', email, mode: result.mode });
  } catch (error) {
    console.error('[OTP] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /auth/verify-otp
 */
exports.verifyOTP = (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    const stored = otpStore.get(email);

    if (!stored) {
      return res.status(400).json({ error: 'No OTP found for this email. Please request a new one.' });
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
    }

    if (stored.attempts >= 5) {
      otpStore.delete(email);
      return res.status(429).json({ error: 'Too many attempts. Please request a new OTP.' });
    }

    stored.attempts += 1;
    if (stored.otp !== otp) {
      return res.status(400).json({ error: `Invalid OTP. ${5 - stored.attempts} attempts remaining.` });
    }

    otpStore.delete(email);

    const verificationToken = jwt.sign(
      { email, verified: true },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({ message: 'Email verified successfully', verificationToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Middleware: Validate email verification token.
 */
exports.requireEmailVerification = (req, res, next) => {
  const { emailVerificationToken } = req.body;

  if (!emailVerificationToken) {
    return res.status(400).json({ error: 'Email verification is required. Please verify your email first.' });
  }

  try {
    const decoded = jwt.verify(emailVerificationToken, process.env.JWT_SECRET);
    if (!decoded.verified || decoded.email !== req.body.email) {
      return res.status(400).json({ error: 'Email verification token is invalid or does not match.' });
    }
    req.emailVerified = true;
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Email verification has expired. Please verify again.' });
  }
};
