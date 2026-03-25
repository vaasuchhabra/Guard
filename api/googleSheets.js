const { google } = require('googleapis');

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;

let sheetsClient = null;

function getSheetsClient() {
    if (sheetsClient) return sheetsClient;
    
    // Check if configuration exists before spinning up SDK (silent fail for local development safety)
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN || !SHEET_ID) {
        return null;
    }
    
    try {
        const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
        oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });
        
        sheetsClient = google.sheets({ version: 'v4', auth: oAuth2Client });
        return sheetsClient;
    } catch (err) {
        console.error('❌ Google Sheets SDK Initialization Error:', err.message);
        return null;
    }
}

async function writeToGoogleSheet(submission) {
    const sheets = getSheetsClient();
    if (!sheets) {
        console.log('⚠️  Native Google Sheets Integration skipped: Missing exact Vercel Environment Variables.');
        return null;
    }
    
    try {
        // Format payload to strictly match standard columns
        const values = [
            [
                submission.id,
                submission.name,
                submission.email,
                submission.phone,
                submission.willingToPay || 'Not specified',
                submission.interest,
                submission.submittedAt,
                submission.status
            ]
        ];
        
        const resource = { values };
        
        // Append raw data blindly to Sheet1
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SHEET_ID,
            range: 'Sheet1!A:H', // Will intelligently drop onto the first completely blank row
            valueInputOption: 'USER_ENTERED',
            resource,
        });
        
        console.log('📊 Native Sheets SDK: Row Appended Successfully!', response.data.updates.updatedRange);
        return { success: true };
    } catch (err) {
        console.error('📊 Native Sheets SDK Write Error:', err.message);
        return null;
    }
}

module.exports = { writeToGoogleSheet };
