# Quick Reference Guide - screenshot-to-github

**For developers continuing work on this extension or using it as a template.**

---

## 5-Minute Overview

**What:** Chrome DevTools panel to capture screenshots and add them to GitHub issues  
**Where:** DevTools (F12) → Screenshot tab  
**How:** Enter issue number → Click 📸 → Comment appears on GitHub automatically  
**Built:** Pure JavaScript, Manifest V3, no external dependencies

---

## File Quick Reference

```
├── manifest.json           - Extension config (56 lines)
├── background.js           - Main logic hub (225 lines)  
├── devtools.html           - UI  
├── devtools.js             - Panel logic
├── devtools-panel.js       - Registration
├── devtools_page.html      - Entry point
├── options.html            - Token/domain settings
├── options.js              - Settings handler
├── content-script.js       - Page injection (optional page button)
├── popup.html/js           - Extension popup
└── interactions/
    ├── DEVELOPMENT_JOURNEY.md      - Full story
    ├── TECHNICAL_ARCHITECTURE.md   - System design
    ├── CHALLENGES_AND_SOLUTIONS.md - Problem reference
    └── QUICK_REFERENCE.md          - This file
```

---

## Development Environment Setup

### Prerequisites
```bash
# Just need Chrome browser
# No build tools required
# No npm packages needed
```

### Loading the Extension
```
1. Go to chrome://extensions/
2. Enable "Developer mode" (top right)
3. Click "Load unpacked"
4. Select /path/to/screenshot-uploader-extension
5. Extension appears with ID
```

### Testing Changes
```
1. Edit any .js or .html file
2. Go to chrome://extensions/
3. Click reload icon on extension
4. Open DevTools (F12) and see your changes
```

---

## Common Tasks

### Add a new GitHub API endpoint
```javascript
// In background.js, add new function:
async function callGithubApi(endpoint, method = 'GET', body = null) {
  const token = await getTokenFromStorage();
  
  const response = await fetch('https://api.github.com' + endpoint, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : null
  });
  
  if (!response.ok) {
    throw new Error(`GitHub API error ${response.status}`);
  }
  
  return await response.json();
}

// Use it:
const data = await callGithubApi('/repos/owner/repo/issues/123');
```

### Add new UI element to DevTools
```html
<!-- In devtools.html -->
<div class="section">
  <label>New Feature:</label>
  <input id="newFeatureInput" type="text" placeholder="Enter something">
</div>

<!-- In devtools.js -->
const newInput = document.getElementById('newFeatureInput');
newInput.addEventListener('change', () => {
  console.log('New value:', newInput.value);
  // Do something with the value
});
```

### Add new settings option
```javascript
// In options.html - add input
<input id="mySetting" type="text">
<button id="saveMySettingBtn">Save</button>

// In options.js - add handler
document.getElementById('saveMySettingBtn')?.addEventListener('click', async () => {
  const value = document.getElementById('mySetting').value;
  
  // Validate
  if (!value) {
    alert('Please enter a value');
    return;
  }
  
  // Save
  await chrome.storage.sync.set({ 'mySetting': value });
  alert('Setting saved!');
});

// Read on load
chrome.storage.sync.get(['mySetting'], (items) => {
  if (items.mySetting) {
    document.getElementById('mySetting').value = items.mySetting;
  }
});
```

### Debug message passing
```javascript
// Check if message is being received:
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);  // Log here!
  console.log('Sender:', sender);             // See where it came from
  
  if (request.action === 'myAction') {
    console.log('Processing myAction...');
    sendResponse({ success: true });
  }
});

// Check if message is being sent:
chrome.runtime.sendMessage(
  { action: 'myAction', data: 'test' },
  (response) => {
    console.log('Response received:', response);  // Log here!
  }
);
```

---

## Storage & Configuration

### Read Settings
```javascript
// Single value
chrome.storage.sync.get(['mySetting'], (items) => {
  console.log('mySetting:', items.mySetting);
});

// Multiple values
chrome.storage.sync.get(['setting1', 'setting2'], (items) => {
  console.log('Settings:', items);
});

// All values
chrome.storage.sync.get(null, (items) => {
  console.log('All settings:', items);
});
```

### Save Settings
```javascript
chrome.storage.sync.set({
  'setting1': 'value1',
  'setting2': 'value2'
}, () => {
  console.log('Settings saved!');
});
```

### Delete Settings
```javascript
// Delete specific key
chrome.storage.sync.remove(['mySetting'], () => {
  console.log('Setting deleted');
});

// Delete all
chrome.storage.sync.clear(() => {
  console.log('All settings cleared');
});
```

### GitHub Tokens Storage Format
```javascript
// Each token object:
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Personal GitHub",
  token: "ghp_xxxxxxxxxxxxxxxxxxxxx",
  repoUrl: "https://github.com/owner/repo",
  createdAt: 1712149200000
}

// Stored as array:
chrome.storage.sync.set({
  'githubTokens': [tokenObject1, tokenObject2, ...]
});
```

---

## Debugging Checklist

### Screenshot Not Working?
```
☐ Check background service worker console
  - chrome://extensions/ → Inspect views → service worker → Console
  
☐ Verify Chrome didn't deny permission
  - Error: chrome.runtime.lastError
  
☐ Check tab accessibility
  - Some tabs (DevTools, Settings pages) can't be captured
  
☐ Check screenshot size
  - Very large pages might timeout
  
☐ Check timeout
  - Default 10 seconds, might need increase for complex pages
```

### GitHub Comment Not Appearing?
```
☐ Check GitHub API error in console
  - Look for "GitHub API error XXX" message
  
☐ Verify token has repo scope
  - Token needs write access to issues
  
☐ Check issue number is valid
  - ParseInt any # or spaces
  
☐ Check repo URL is correct
  - Should be github.com/owner/repo format
  
☐ Check rate limiting
  - GitHub limits to 60 requests/hour (auth requests)
  
☐ Check token hasn't expired
  - Personal tokens can expire if set with expiration
```

### Message Passing Not Working?
```
☐ Check return true in listener
  - Easy to forget, causes channel to close immediately
  
☐ Check message structure
  - Both sides must send/receive same action names
  
☐ Check tab ID validity
  - Active tab must exist when sending message
  
☐ Check sendResponse was called
  - Use callback even if no data to return
  
☐ Check for exceptions
  - Unhandled error stops response callback
```

### Settings Not Persisting?
```
☐ Check storage domain
  - Use chrome.storage.sync, not localStorage
  
☐ Check permission in manifest
  - Must include "storage" permission
  
☐ Check save actually happened
  - Log before and after save
  
☐ Check read on page load
  - Might be overwriting saved values with defaults
```

---

## Common Chrome APIs Used

### chrome.tabs
```javascript
// Get current active tab
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  console.log('Tab URL:', tab.url);
  console.log('Tab ID:', tab.id);
});

// Capture screenshot
chrome.tabs.captureVisibleTab({ format: 'png', quality: 92 }, (dataUrl) => {
  // dataUrl is base64 data URL
});

// Get tab by ID
chrome.tabs.get(tabId, (tab) => {
  console.log(tab);
});
```

### chrome.runtime
```javascript
// Send message to background
chrome.runtime.sendMessage({ action: 'test' }, (response) => {
  console.log(response);
});

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'test') {
    sendResponse({ result: 'success' });
  }
  return true; // Keep channel open
});

// Get extension URL
const iconUrl = chrome.runtime.getURL('images/icon.svg');

// Get manifest
const manifest = chrome.runtime.getManifest();
```

### chrome.storage.sync
```javascript
// Save
chrome.storage.sync.set({ key: 'value' });

// Load
chrome.storage.sync.get(['key'], (items) => {
  console.log(items.key);
});

// Listen for changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  for (let [key, { oldValue, newValue }] of Object.entries(changes)) {
    console.log(`${key} changed from ${oldValue} to ${newValue}`);
  }
});
```

---

## Testing Checklist Template

### Before Each Release
```
✓ Functionality
  ☐ Capture screenshot works
  ☐ Upload to catbox succeeds
  ☐ GitHub comment appears
  ☐ Multiple tokens work
  ☐ Token selection works
  ☐ Issue number persists

✓ Error Handling
  ☐ Invalid issue number shows error
  ☐ Bad token shows 401 error
  ☐ No internet shows fetch error
  ☐ Repo not found shows 404 error

✓ UI/UX
  ☐ Settings page intuitive
  ☐ DevTools panel clean
  ☐ Status messages helpful
  ☐ No errors in console

✓ Performance
  ☐ Screenshot captures in <3 seconds
  ☐ UI doesn't freeze
  ☐ Upload doesn't timeout
  ☐ No memory leaks
```

---

## Manifest V3 Important Notes

### Differences from V2
```
V2 → V3 Changes:
- background: "page" → "service_worker"
- backgroundScript runs continuously → runs on demand
- chrome.tabs.executeScript() → chrome.scripting.executeScript()
- More restrictive CSP
- No eval() or new Function()
- Stricter permissions
```

### Important V3 CSP Rules
```
✓ ALLOWED:
  - 'self' (extension files)
  - Specific external domains in connect-src
  - Async data loading
  
✗ NOT ALLOWED:
  - 'unsafe-inline' scripts
  - 'unsafe-eval'
  - eval(), Function(), innerHTML with scripts
  - Inline event handlers (onclick="")
  - eval() in scripts
```

---

## GitHub API Reference

### Add Comment to Issue
```javascript
POST https://api.github.com/repos/{owner}/{repo}/issues/{issue_number}/comments

Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
  Accept: application/vnd.github.v3+json

Body:
{
  "body": "Comment text here"
}

Response (201):
{
  "id": 1234567890,
  "url": "...",
  "html_url": "...",
  "body": "...",
  "created_at": "2026-04-02T12:34:56Z"
}
```

### Get Current User
```javascript
GET https://api.github.com/user

Returns authenticated user info (useful for validation)
```

### List User Repos
```javascript
GET https://api.github.com/user/repos?per_page=100

Returns list of all repos user has access to
```

---

## Token Management Code Snippets

### Generate UUID for Token ID
```javascript
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Usage
const tokenId = generateUUID();
```

### Add Token to Storage
```javascript
async function addGitHubToken(name, token, repoUrl) {
  // Validate
  if (!name || !token || !repoUrl) {
    throw new Error('All fields required');
  }
  
  // Get existing tokens
  const { githubTokens = [] } = await chrome.storage.sync.get(['githubTokens']);
  
  // Create new token object
  const newToken = {
    id: generateUUID(),
    name,
    token,
    repoUrl,
    createdAt: Date.now()
  };
  
  // Add to array
  githubTokens.push(newToken);
  
  // Save
  await chrome.storage.sync.set({ githubTokens });
  
  return newToken;
}
```

### Get Token by ID
```javascript
async function getTokenById(tokenId) {
  const { githubTokens = [] } = await chrome.storage.sync.get(['githubTokens']);
  return githubTokens.find(t => t.id === tokenId);
}
```

### Delete Token
```javascript
async function deleteToken(tokenId) {
  const { githubTokens = [] } = await chrome.storage.sync.get(['githubTokens']);
  
  const filtered = githubTokens.filter(t => t.id !== tokenId);
  
  await chrome.storage.sync.set({ githubTokens: filtered });
}
```

---

## Deployment Steps

### Local Testing
```
1. Make changes to .js or .html files
2. chrome://extensions/
3. Click reload icon
4. Open DevTools (F12) and test
5. Check console for errors
```

### Before Publishing to Chrome Web Store
```
1. Increment version in manifest.json (1.0.0 → 1.0.1)
2. Update README.md with changes
3. Test on multiple Chrome profiles
4. Clear all storage and test fresh install
5. Check for console errors
6. Verify CSP works (no violation warnings)
```

### Publishing to Chrome Web Store
```
1. Go to https://chrome.google.com/webstore/devconsole
2. Click "New item"
3. Upload ZIP of extension folder (exclude .git)
4. Fill in description, screenshots, category
5. Submit for review
6. Wait 2-5 days for review
7. If approved, available to install
```

---

## Useful Developer Tools

### Chrome Extensions Docs
- https://developer.chrome.com/docs/extensions/

### GitHub API Docs
- https://docs.github.com/en/rest

### Test Tools
- Online JSON validator: https://jsonlint.com/
- Regex tester: https://regex101.com/
- Base64 decoder: https://www.base64decode.org/

---

## Getting Help

### Debugging Resources
1. **Inspect background.js:**
   - chrome://extensions/ → Inspect views → service worker

2. **Inspect DevTools panel:**
   - Open devtools (F12) on any page → Open devtools in devtools (Ctrl+Shift+I)

3. **Check extension logs:**
   - chrome://extensions/ → Details → Errors

4. **Search challenges:**
   - Check `interactions/CHALLENGES_AND_SOLUTIONS.md` for common issues

---

## Next Enhancement Ideas

### Easy (1-2 hours)
- [ ] Add success sound notification
- [ ] Show upload progress bar
- [ ] Copy URL after capture automatically
- [ ] Dark mode for settings page

### Medium (2-4 hours)
- [ ] Support other issue trackers (Jira, Linear, Notion)
- [ ] Customize comment format with templates
- [ ] Add Discord/Slack webhook support

### Hard (4+ hours)
- [ ] OAuth login instead of manual tokens
- [ ] Image annotation/cropping tools
- [ ] Offline queue for failed uploads
- [ ] Chrome Web Store publishing automation

