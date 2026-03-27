const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 8080;
const IS_VERCEL = process.env.VERCEL === '1';
const DATA_FILE = IS_VERCEL 
    ? path.join('/tmp', 'submissions.json') 
    : path.join(__dirname, 'data', 'submissions.json');

// ─── Google Apps Script Integration ───
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

// ─── Telegram Bot Integration ───
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Ensure data directory exists (only if not on Vercel)
if (!IS_VERCEL && !fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));



// ─── API: Submit beta signup ───
app.post('/api/signup', async (req, res) => {
    const { name, email, phone, willingToPay, interest } = req.body;

    // Validation
    const errors = {};
    if (!name || !name.trim()) errors.name = 'Name is required';
    if (!email || !email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email';
    if (!phone || !phone.trim()) errors.phone = 'Phone is required';
    else if (phone.replace(/[\s\-\+\(\)]/g, '').length < 8) errors.phone = 'Invalid phone';
    if (!willingToPay || !willingToPay.trim()) errors.willingToPay = 'Payment tier is required';
    if (!interest || !interest.trim()) errors.interest = 'Interest is required';

    if (Object.keys(errors).length > 0) {
        return res.status(400).json({ success: false, errors });
    }

    // Check for duplicate email in local storage
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (submissions.find(s => s.email.toLowerCase() === email.toLowerCase())) {
        return res.status(409).json({ success: false, message: 'This email has already been registered.' });
    }

    // Create submission
    const submission = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        willingToPay: willingToPay.trim(),
        interest: interest.trim(),
        submittedAt: new Date().toISOString(),
        status: 'pending'
    };

    // Save to local JSON
    submissions.push(submission);
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));

    // Forward to Google Apps Script (handle Google's 302 redirect)
    if (GOOGLE_SCRIPT_URL) {
        fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(submission),
            redirect: 'follow'
        })
        .then(r => console.log('📊 Google Script:', r.status, r.ok ? 'OK' : 'FAIL'))
        .catch(err => console.error('📊 Google Script Error:', err.message));
    }

    // Send Telegram notification
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const msg = `🆕 *New Herefor.me Signup!*\n\n👤 *Name:* ${submission.name}\n📧 *Email:* ${submission.email}\n📱 *Phone:* ${submission.phone}\n💰 *Willing to Pay:* ${submission.willingToPay}\n💬 *Interest:* ${submission.interest}\n🕐 *Time:* ${submission.submittedAt}`;
        fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: msg, parse_mode: 'Markdown' })
        })
        .then(r => r.json())
        .then(d => console.log('📨 Telegram:', d.ok ? 'Sent!' : d.description))
        .catch(err => console.error('📨 Telegram Error:', err.message));
    }

    console.log(`✅ New signup: ${submission.name} (${submission.email})`);
    res.json({ success: true, message: 'Application received!' });
});

// ─── API: Get all submissions ───
app.get('/api/submissions', (req, res) => {
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    res.json({ total: submissions.length, submissions: submissions.reverse() });
});

// ─── API: Delete a submission ───
app.delete('/api/submissions/:id', (req, res) => {
    let submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const before = submissions.length;
    submissions = submissions.filter(s => s.id !== req.params.id);
    if (submissions.length === before) {
        return res.status(404).json({ success: false, message: 'Not found' });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));
    res.json({ success: true });
});

// ─── API: Update submission status ───
app.patch('/api/submissions/:id', (req, res) => {
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const sub = submissions.find(s => s.id === req.params.id);
    if (!sub) return res.status(404).json({ success: false, message: 'Not found' });
    if (req.body.status) sub.status = req.body.status;
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));
    res.json({ success: true, submission: sub });
});

// ─── API: Export as CSV ───
app.get('/api/export', (req, res) => {
    const submissions = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    const header = 'ID,Name,Email,Phone,Willing To Pay,Interest,Submitted At,Status\n';
    const csv = header + submissions.map(s =>
        `"${s.id}","${s.name}","${s.email}","${s.phone}","${s.willingToPay || ''}","${s.interest.replace(/"/g, '""')}","${s.submittedAt}","${s.status}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=beta-signups.csv');
    res.send(csv);
});

// Start server locally or export for Vercel
if (!IS_VERCEL) {
    app.listen(PORT, () => {
        console.log(`\n💙  Herefor.me Backend Running`);
        console.log(`   Website:  http://localhost:${PORT}`);
        console.log(`   Admin:    http://localhost:${PORT}/admin.html`);
        console.log(`   API:      http://localhost:${PORT}/api/submissions`);
        console.log(`   Sheets:   ${GOOGLE_SCRIPT_URL ? 'Linked via Web App' : 'Disabled'}`);
        console.log(`   Telegram: ${TELEGRAM_BOT_TOKEN ? 'Enabled' : 'Disabled'}\n`);
    });
}
module.exports = app;
