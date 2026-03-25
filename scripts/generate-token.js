const { google } = require('googleapis');
const express = require('express');
const app = express();

require('dotenv').config(); // Load from .env if present

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'PASTE_YOUR_ID_HERE';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'PASTE_YOUR_SECRET_HERE';
const REDIRECT_URI = 'http://localhost:3000/oauth2callback';

if (CLIENT_ID === 'PASTE_YOUR_ID_HERE') {
    console.error('\n❌ ERROR: You must provide a GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET!');
    console.error('Either hardcode them in this script or use a .env file.\n');
    process.exit(1);
}

const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

app.get('/oauth2callback', async (req, res) => {
    if (req.query.code) {
        try {
            const { tokens } = await oAuth2Client.getToken(req.query.code);
            console.log('\n✅ SUCCESS!');
            console.log('\nSave this EXACT string to your Vercel Environment Variables as GOOGLE_REFRESH_TOKEN:');
            console.log('\n=======================================');
            console.log(tokens.refresh_token);
            console.log('=======================================\n');
            console.log('You can now close this window and push your code!');
            
            res.send('<html style="background:#0F1B2D;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><body><h1>✅ Success!</h1><p style="color:#00CA4E;font-size:1.2rem;">Your Refresh Token has been generated in the terminal.</p><p>You can close this window now.</p></body></html>');
            setTimeout(() => process.exit(0), 1000);
        } catch (e) {
            res.send('Error generating token: ' + e.message);
            console.error(e);
            process.exit(1);
        }
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/spreadsheets'],
        prompt: 'consent' // Force Google to return a fresh refresh_token
    });
    
    console.log('\n--- 🔐 GuardianSense Google Sheets OAuth Token Generator ---');
    console.log('\n1. Please make sure your Google Cloud OAuth Client has this EXACT Authorized redirect URI:');
    console.log(`   ${REDIRECT_URI}`);
    console.log('\n2. Click the link below to authenticate your Google Account:');
    console.log(`\n👉 ${authUrl}\n`);
    console.log('Waiting for you to log in...');
});
