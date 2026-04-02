# Screenshot Uploader Chrome Extension

A Chrome extension that captures full-page screenshots and uploads them to catbox.moe. Configure which domains the button appears on.

## Features

- 📸 **Full-page screenshots** - Captures the entire page, not just the viewport
- ☁️ **Catbox integration** - Automatically uploads to catbox.moe
- 🔗 **Quick sharing** - Generates shareable links instantly
- ⚙️ **Domain configuration** - Choose which sites get the screenshot button
- 🎨 **Clean UI** - Beautiful, non-intrusive floating button
- 📋 **One-click copy** - Copy image URL to clipboard

## Installation

### Development Mode (Chrome/Edge)

1. **Navigate to the extension folder:**
   ```bash
   cd screenshot-uploader-extension
   ```

2. **Open Chrome/Chromium:**
   - Go to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `screenshot-uploader-extension` folder

3. **Your extension is now installed!**

### Installation from Code

- Chrome: `chrome://extensions/` → **Load unpacked** → select folder
- Edge: `edge://extensions/` → **Load unpacked** → select folder
- Chromium-based: Similar process using `chrome://extensions/`

## Usage

### Configure Domains

1. Click the extension icon in your toolbar
2. Click **⚙️ Settings**
3. Enter a domain where you want the screenshot button to appear:
   - **Exact domain:** `example.com`
   - **With subdomains:** `*.example.com`
   - **With protocol:** `https://example.com` (optional)
   - **Local development:** `localhost`
   - **IP addresses:** `192.168.1.1`

4. Examples:
   - `github.com` - GitHub only
   - `*.github.com` - GitHub and all subdomains
   - `google.com` - Google search
   - `localhost` - Local development

### Take Screenshots

1. Navigate to a configured domain
2. You should see a floating **📸 Screenshot** button at the bottom-right
3. Click the button
4. Wait for the upload to complete
5. Click **View Upload** or **📋 Copy URL** to get the link

### View Status

- Click the extension icon to see:
  - Number of enabled domains
  - List of configured domains
  - Current page domain status (enabled/disabled)

## How It Works

1. **Domain Matching:**
   - Extension checks current domain against your configured list
   - Supports exact matches and wildcards

2. **Screenshot Capture:**
   - Uses `html2canvas` library for full-page capture
   - Converts page to PNG image
   - Works with most websites

3. **Catbox Upload:**
   - Automatically uploads to catbox.moe
   - Images hosted for 24 hours
   - Direct image URL returned

4. **User Feedback:**
   - Status messages during capture/upload
   - Clickable links to view uploaded images
   - Copy-to-clipboard functionality

## API & Libraries

- **html2canvas** - Full-page screenshot library
- **catbox.moe** - Image hosting service
- **Chrome Extensions API** - Storage and tab management

## Files

```
screenshot-uploader-extension/
├── manifest.json          # Extension configuration
├── background.js          # Service worker (upload logic)
├── content-script.js      # Page injection (button & capture)
├── options.html           # Settings page UI
├── options.js             # Settings page logic
├── popup.html             # Extension popup UI
├── popup.js               # Extension popup logic
└── README.md              # This file
```

## Configuration

### Storage

Domains are stored in `chrome.storage.sync`:
- **Key:** `enabledDomains`
- **Value:** Array of domain strings

## Troubleshooting

### Button not appearing

1. **Check if domain is configured:**
   - Open extension popup
   - Verify current domain is listed

2. **Check domain format:**
   - Use `example.com` not `https://example.com`
   - Unless you include protocol in options

3. **Refresh the page:**
   - Content script runs on page load
   - Try F5 or Cmd+R

### Screenshot not uploading

1. **Check internet connection:**
   - Extension needs network access to catbox

2. **Check catbox status:**
   - Visit https://catbox.moe to verify service is up

3. **Browser console errors:**
   - Right-click → Inspect → Console tab
   - Look for red error messages

### Image quality issues

- `html2canvas` captures as rendered by browser
- Some dynamic content may not render perfectly
- CSS transforms/animations may affect output

## Security & Privacy

- **Local processing:**
  - Domain list stored locally in browser
  - No data sent to third-party servers except catbox

- **Catbox:**
  - Images hosted on catbox.moe
  - 24-hour retention by default
  - Review catbox privacy policy

- **Content script:**
  - Only runs on configured domains
  - Cannot access sensitive data outside configured pages

## Limitations

- Full-page capture depends on page rendering (Flash, iframes, etc. may not capture)
- Some protected content (password fields) won't display in screenshots
- Very large pages (100+ MB DOM) may timeout
- Catbox has file size limits (typically 200MB)

## Future Improvements

- Custom expiry times
- Screenshot editing before upload
- Multiple image host support
- Keyboard shortcuts
- Screenshot history
- OCR text extraction

## License

MIT - Feel free to modify and distribute

## Support

For issues or improvements:
1. Check the troubleshooting section
2. Review Chrome extension documentation
3. Check browser console for error messages

---

**Made with ❤️ for easy screenshot sharing**
