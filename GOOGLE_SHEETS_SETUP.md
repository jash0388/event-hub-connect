# Google Sheets Integration Setup

When a QR code is scanned, you want the student data to automatically save to a Google Sheet.

## Option 1: Use Make.com (Easiest - No Code)

1. Go to https://make.com and create a free account
2. Create a new scenario
3. Add "Webhooks" → "Custom Webhook" as the trigger
4. Copy the webhook URL
5. Add "Google Sheets" → "Add a Row" as the action
6. Connect your Google Account
7. Create or select a spreadsheet with columns: Timestamp, Full Name, Roll Number, Year, Event Title, QR Code
8. Map the webhook data to the columns

## Option 2: Use Google Apps Script (Free, No Account Needed)

### Step 1: Create a Google Sheet
1. Go to https://sheets.google.com
2. Create a new spreadsheet
3. Add headers in row 1:
   - A1: Timestamp
   - B1: Full Name
   - C1: Roll Number
   - D1: Year
   - E1: Event Title
   - F1: QR Code

### Step 2: Set up Google Apps Script
1. In your Google Sheet, go to **Extensions** → **Apps Script**
2. Delete any code there and paste this:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  try {
    const data = JSON.parse(e.postData.contents);
    
    sheet.appendRow([
      new Date(),
      data.full_name || '',
      data.roll_number || '',
      data.year || '',
      data.event_title || '',
      data.qr_code || ''
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  return ContentService.createTextOutput('QR Scan Webhook Ready');
}
```

3. Click the **Save** button (floppy icon)
4. Click **Deploy** → **New Deployment**
5. Click the gear icon next to "Select type" → **Web app**
6. Fill in:
   - Description: QR Scan Webhook
   - Execute as: Me
   - Who has access: **Anyone** (important!)
7. Click **Deploy**
8. Copy the **Web app URL**

### Step 3: Connect to Your App
The webhook URL needs to be configured in the app. For now, the QR scan data is saved to your database and can be exported manually.

---

## Current Flow:
1. Student registers → QR code generated and saved
2. Admin scans QR → Database updated with scan time
3. Data stored in `event_registrations` table

To export to Google Sheets manually:
- Go to Supabase Dashboard → Table Editor → event_registrations
- Click "Download as CSV" 
- Import CSV to Google Sheets
