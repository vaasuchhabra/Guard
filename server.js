const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8080;
const DATA_FILE = path.join(__dirname, 'data', 'submissions.json');

// ─── Google Sheets Integration ───
// After deploying the Apps Script, paste the Web App URL here:
const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbwltvfrZi7VkUuAaomCVmcD0vZZPLQpF7ciqAdxc5Kr_CYZ4b7VDb364h-oqZ3gW7Ne5w/exec';

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Helper: write to Google Sheets
async function writeToGoogleSheet(data) {
    if (!GOOGLE_SCRIPT_URL) {
        console.log('⚠️  GOOGLE_SCRIPT_URL not set — skipping Google Sheets write');
        return null;
    }
    try {
        const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
            redirect: 'follow'
        });
        const result = await res.json();
        console.log('📊 Google Sheet:', result.success ? 'Written' : result.message);
        return result;
    } catch (err) {
        console.error('📊 Google Sheet error:', err.message);
        return null;
    }
}

// ─── API: Submit beta signup ───
app.post('/api/signup', async (req, res) => {
    const { name, email, phone, interest } = req.body;

    // Validation
    const errors = {};
    if (!name || !name.trim()) errors.name = 'Name is required';
    if (!email || !email.trim()) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Invalid email';
    if (!phone || !phone.trim()) errors.phone = 'Phone is required';
    else if (phone.replace(/[\s\-\+\(\)]/g, '').length < 8) errors.phone = 'Invalid phone';
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
        interest: interest.trim(),
        submittedAt: new Date().toISOString(),
        status: 'pending'
    };

    // Save to local JSON
    submissions.push(submission);
    fs.writeFileSync(DATA_FILE, JSON.stringify(submissions, null, 2));

    // Write to Google Sheets (async, non-blocking)
    writeToGoogleSheet(submission);

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
    const header = 'ID,Name,Email,Phone,Interest,Submitted At,Status\n';
    const csv = header + submissions.map(s =>
        `"${s.id}","${s.name}","${s.email}","${s.phone}","${s.interest.replace(/"/g, '""')}","${s.submittedAt}","${s.status}"`
    ).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=beta-signups.csv');
    res.send(csv);
});

// Start server
app.listen(PORT, () => {
    console.log(`\n🛡️  GuardianSense Backend Running`);
    console.log(`   Website:  http://localhost:${PORT}`);
    console.log(`   Admin:    http://localhost:${PORT}/admin.html`);
    console.log(`   API:      http://localhost:${PORT}/api/submissions`);
    console.log(`   Sheets:   ${GOOGLE_SCRIPT_URL ? '✅ Connected' : '⚠️  Not configured (set GOOGLE_SCRIPT_URL)'}\n`);
});
