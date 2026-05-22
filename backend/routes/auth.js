const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { get, run } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const AVATAR_COLORS = [
  '#6c63ff','#ff6584','#43e97b','#fa8231',
  '#0abde3','#e056fd','#f9ca24','#ff5e57'
];

// --- Email Config ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // Use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendResetCode(email, code) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS || process.env.EMAIL_USER === 'your-email@gmail.com') {
    console.log(`\n📢 [SIMULATED EMAIL] To: ${email} | Code: ${code}`);
    console.log(`👉 To send REAL emails, update EMAIL_USER and EMAIL_PASS in your .env file.\n`);
    return Promise.resolve();
  }
  return transporter.sendMail({
    from: `"TaskFlow Security" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Password Reset Code',
    text: `Your password reset code is: ${code}. It expires in 15 minutes.`
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ error: 'All fields are required' });
    if (username.length < 3)
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = get('SELECT id FROM users WHERE email=? OR username=?', [email, username]);
    if (existing) return res.status(409).json({ error: 'Username or email already exists' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const now = new Date().toISOString();

    run(
      'INSERT INTO users (id,username,email,password,avatar_color,created_at) VALUES (?,?,?,?,?,?)',
      [id, username, email, hashedPassword, avatarColor, now]
    );

    const token = jwt.sign({ id, username, email, avatarColor }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ message: 'Account created successfully', token, user: { id, username, email, avatarColor } });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = get('SELECT * FROM users WHERE email=?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, avatarColor: user.avatar_color },
      JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({
      message: 'Login successful', token,
      user: { id: user.id, username: user.username, email: user.email, avatarColor: user.avatar_color, createdAt: user.created_at }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticateToken, (req, res) => {
  const user = get('SELECT id,username,email,avatar_color,created_at FROM users WHERE id=?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

// PUT /api/auth/settings
router.put('/settings', require('../middleware/auth').authenticateToken, (req, res) => {
  const { username, avatar_color } = req.body;
  if (!username || username.length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters' });

  // Check if username taken by others
  const existing = get('SELECT id FROM users WHERE username=? AND id!=?', [username, req.user.id]);
  if (existing) return res.status(409).json({ error: 'Username already taken' });

  run('UPDATE users SET username=?, avatar_color=? WHERE id=?', [username, avatar_color || '#6c63ff', req.user.id]);
  
  const user = get('SELECT id,username,email,avatar_color,created_at FROM users WHERE id=?', [req.user.id]);
  res.json({ message: 'Settings updated successfully', user });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = get('SELECT id FROM users WHERE email=?', [email]);
  if (!user) return res.status(404).json({ error: 'User with this email not found' });

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins

  run('INSERT OR REPLACE INTO password_resets (email, code, expires_at) VALUES (?, ?, ?)', [email, code, expiresAt]);

  try {
    await sendResetCode(email, code);
    res.json({ message: 'Reset code sent to your email' });
  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) return res.status(400).json({ error: 'All fields required' });

  const reset = get('SELECT * FROM password_resets WHERE email=?', [email]);
  if (!reset || reset.code !== code) return res.status(400).json({ error: 'Invalid reset code' });
  if (Date.now() > reset.expires_at) return res.status(400).json({ error: 'Reset code expired' });

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  run('UPDATE users SET password=? WHERE email=?', [hashedPassword, email]);
  run('DELETE FROM password_resets WHERE email=?', [email]);

  res.json({ message: 'Password reset successfully' });
});

// POST /api/auth/google-login
router.post('/google-login', async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) return res.status(400).json({ error: 'ID Token required' });

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture: avatarUrl } = payload;

    let user = get('SELECT * FROM users WHERE email=? OR google_id=?', [email, googleId]);

    if (!user) {
      // Create new user
      const id = uuidv4();
      const username = name || email.split('@')[0];
      const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
      const now = new Date().toISOString();

      run(
        'INSERT INTO users (id,username,email,google_id,avatar_url,avatar_color,created_at) VALUES (?,?,?,?,?,?,?)',
        [id, username, email, googleId, avatarUrl, avatarColor, now]
      );
      user = get('SELECT * FROM users WHERE id=?', [id]);
    } else if (!user.google_id) {
      // Link Google account to existing email account
      run('UPDATE users SET google_id=?, avatar_url=? WHERE id=?', [googleId, avatarUrl, user.id]);
      user.google_id = googleId;
      user.avatar_url = avatarUrl;
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, avatarColor: user.avatar_color },
      JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({
      message: 'Google login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarColor: user.avatar_color,
        avatarUrl: user.avatar_url
      }
    });
  } catch (err) {
    console.error('Google login error:', err);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

module.exports = router;
