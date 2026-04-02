# Screenshot Uploader Extension - Quick Start Guide

## ⚡ Installation (5 minutes)

### Step 1: Open Chrome Extensions Page
```
chrome://extensions/
```

### Step 2: Enable Developer Mode
- Look for the toggle in the **top-right corner**
- Click to enable "Developer mode"

### Step 3: Load Extension
1. Click **"Load unpacked"** button
2. Navigate to: `/Users/muhammadnaveedshahzad/Livebinders/screenshot-uploader-extension`
3. Select the folder and click "Open"

### Step 4: Verify Installation
- You should see the extension appear in your list
- Extension icon appears in Chrome toolbar

---

## 🎯 First-Time Setup (2 minutes)

### Configure Your First Domain

1. **Click the extension icon** in your toolbar (top-right)
2. Click **⚙️ Settings** button
3. In the input field, type a domain:
   ```
   github.com
   ```
4. Click **Add**
5. You should see "✅ Added github.com"

### Test It Out

1. **Visit a configured domain:** https://github.com
2. **Look for the button** at bottom-right: "📸 Screenshot"
3. **Click the button** to capture the page
4. **Watch the process:**
   - ⏳ Capturing page...
   - ☁️ Uploading to catbox...
   - ✅ Screenshot uploaded!
5. **Click "View Upload"** to see your screenshot
6. **Click "📋 Copy URL"** to copy the link

---

## 📋 Domain Configuration Examples

| Use Case | Domain | Format |
|----------|--------|--------|
| GitHub | `github.com` | Exact domain |
| GitHub + subdomains | `*.github.com` | Wildcard |
| Google | `google.com` | Exact domain |
| Local development | `localhost` | Special case |
| Local dev + port | `localhost:3000` | With port |
| Your company site | `company.com` | Exact domain |
| All subdomains | `*.company.com` | Wildcard |

### Adding Multiple Domains

You can add as many domains as you want:

```
1. github.com
2. google.com
3. *.example.com
4. localhost
5. staging.app.local
```

The button will appear on ALL configured domains.

---

## 🎨 How It Works

### 1. **Bottom-Right Button**
```
┌─────────────────────────┐
│                         │
│   Your Webpage          │
│                         │
│            ┌──────────────┐
│            │  📸 Screenshot │  ← Floating button
│            └──────────────┘
└─────────────────────────┘
```

### 2. **Click → Capture → Upload Flow**
```
📸 Click  →  ⏳ Capturing  →  ☁️ Uploading  →  ✅ Complete
             (full page)      (to catbox)     (get URL)
```

### 3. **Success Message**
```
✅ Screenshot uploaded!
   [View Upload]  [📋 Copy URL]
```

---

## 🔧 Managing Domains

### View Configured Domains
1. Click extension icon
2. See count of enabled domains
3. See list of all domains

### Add Domain
1. Click **⚙️ Settings**
2. Type domain
3. Click **Add**

### Remove Domain
1. Click **⚙️ Settings**
2. Find domain in list below
3. Click **Remove** button

---

## 📸 Different Domain Formats

### Exact Domain
```
github.com
```
- ✅ Matches: github.com
- ❌ Does NOT match: api.github.com, gist.github.com

### Wildcard (Subdomains)
```
*.github.com
```
- ✅ Matches: api.github.com, gist.github.com, pages.github.com
- ✅ Also matches: github.com (base domain)

### With Protocol (Optional)
```
https://github.com
```
- Protocol is optional, will be stripped
- Same as: `github.com`

### With Port (Local Dev)
```
localhost:3000
```
- ✅ Matches: http://localhost:3000
- ✅ Matches: localhost:3000

---

## ⚙️ Settings Features

### Add Domain Section
- Input field for domain
- Live validation
- Format examples below input
- Helpful tips for wildcard usage

### Enabled Domains List
- Shows all configured domains
- Individual remove buttons
- Empty state message if none added
- Hover effects for easy interaction

### About Section
- Links to catbox.moe
- Default 24-hour expiry info

---

## 🔗 Image Hosting Details

### Catbox Storage
- **Default expiry:** 24 hours
- **Free service:** No registration needed
- **File types:** PNG, JPG, GIF, WebP
- **Max size:** Typically 200MB

### Share Your Screenshot
1. Click "View Upload" to open directly
2. Copy link to share with others
3. Link works for 24 hours
4. Anyone can view without account

---

## ❓ Common Questions

### Q: Button not showing?
**A:** Check if:
- Domain is in your enabled list
- Page URL matches exactly
- Try refreshing the page (F5)

### Q: Upload failed?
**A:** Check if:
- Internet connection is working
- Catbox.moe is accessible
- Screenshot is under 200MB
- Browser doesn't have upload restrictions

### Q: Can I change expiry time?
**A:** Currently fixed at 24 hours. Could be configurable in future versions.

### Q: Where are images stored?
**A:** On catbox.moe servers. Your browser only sends captured image.

### Q: Is this safe?
**A:** 
- Domain list stored locally in browser
- Only captures visible page content
- Images sent only to catbox.moe
- No tracking or analytics

---

## 🚀 Pro Tips

### Tip 1: Multiple Domains
Add all your work sites to capture them quickly:
```
mycompany.com
*.mycompany.com
staging.dev.local
localhost:3000
```

### Tip 2: Wildcards Save Time
Instead of adding:
```
api.example.com
docs.example.com
staging.example.com
```

Just add:
```
*.example.com
```

### Tip 3: Quick Links
- Settings page bookmark the options.html for quick access
- Share image URL in Slack/Teams immediately after capturing

### Tip 4: Full Page Capture
The extension captures the ENTIRE page, not just viewport:
- Long pages with infinite scroll ✅
- Below-the-fold content ✅
- Scroll-based animations may not render perfectly

---

## 🛠️ Troubleshooting

### Extension Icon Missing
- Check chrome://extensions/
- Verify "Enabled" toggle is ON
- Pin extension to toolbar for easy access

### Button Not Appearing
```
✗ Domain not configured
✓ Refresh page
✓ Check domain format
✓ Check domain list in settings
```

### Screenshot is Blank
- Might be security restrictions (some sites block screenshots)
- Try different page on same domain
- Check browser console for errors

### Upload Hanging
- Check internet connection
- Wait up to 30 seconds
- Check catbox.moe status
- Try again

---

## 📝 File Structure

```
screenshot-uploader-extension/
├── manifest.json          ← Extension config
├── background.js          ← Upload logic
├── content-script.js      ← Page button injection
├── options.html           ← Settings UI
├── options.js             ← Settings logic
├── popup.html             ← Popup UI
├── popup.js               ← Popup logic
└── README.md              ← Full documentation
```

---

## 🎓 Next Steps

1. ✅ Install extension
2. ✅ Add your first domain
3. ✅ Test on that domain
4. ✅ Add more domains
5. ✅ Start capturing and sharing!

---

## 📞 Support

**For issues:**
1. Check Settings page for enabled domains
2. Verify domain format
3. Check Chrome console (F12 → Console)
4. Refresh page and try again
5. Restart Chrome

**For feature requests:**
- Could add: multiple upload services
- Could add: custom expiry times
- Could add: keyboard shortcuts
- Could add: screenshot annotations

---

## 🎉 You're All Set!

The extension is now ready to use. Visit any configured domain and you'll see the screenshot button at the bottom-right of the page. Happy capturing! 📸

