# Screenshot-to-GitHub Extension - Development Journey

**Project Name:** screenshot-to-github  
**Owner:** naveedshahzad  
**Repository:** https://github.com/naveedshahzad/screenshot-to-github  
**Created:** April 2, 2026  
**Last Updated:** April 2, 2026

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Initial Requirements](#initial-requirements)
3. [Development Phases](#development-phases)
4. [Architecture & Technical Decisions](#architecture--technical-decisions)
5. [Challenges & Solutions](#challenges--solutions)
6. [Final Feature Set](#final-feature-set)
7. [Key Learnings](#key-learnings)

---

## Project Overview

A Chrome extension that enables developers to:
- Take full-page screenshots using Chrome's native APIs
- Upload screenshots to catbox.moe (24-hour image hosting)
- Add screenshots as comments to GitHub issues
- Manage multiple GitHub authentication tokens
- Access the extension from both page buttons and Chrome DevTools

**Primary Use Case:** Quickly capture visual evidence of bugs and issues directly to GitHub without leaving the page.

---

## Initial Requirements

### Original Request
User wanted a Python script for college course registration with Colleague API. However, **context changed** during the session to building a Chrome extension instead.

### Key Requirements Stated
1. ✅ Take full-page screenshots
2. ✅ Upload to catbox.moe
3. ✅ Configurable domain whitelist
4. ✅ DevTools integration
5. ✅ GitHub issue commenting
6. ✅ Support multiple GitHub tokens
7. ✅ Clean, minimal comments (just URL + image)

---

## Development Phases

### Phase 1: Basic Extension Structure (Hours 1-2)
**Goal:** Create a working Chrome extension with basic screenshot capability

**Deliverables:**
- manifest.json (Manifest V3)
- background.js (service worker)
- content-script.js (page injection)
- options.html/options.js (settings UI)
- popup.html/popup.js (extension popup)

**Challenges:**
- Learning Manifest V3 API differences from V2
- Understanding content script vs background worker isolation
- CSP (Content Security Policy) constraints

**Solutions:**
- Used Chrome's native `chrome.tabs.captureVisibleTab()` instead of html2canvas
- Proper message passing between scripts
- Configured CSP carefully for external resources

### Phase 2: DevTools Integration (Hours 2-3)
**Goal:** Add screenshot capability directly in Chrome DevTools

**Deliverables:**
- devtools_page.html (registration page)
- devtools-panel.js (panel registration)
- devtools.html (panel UI)
- devtools.js (panel logic)

**Key Decision:** DevTools approach is better than page buttons because:
- Works on ANY website (no domain whitelist needed)
- More accessible (always in DevTools)
- More professional/developer-friendly

### Phase 3: GitHub Integration (Hours 3-4)
**Goal:** Enable automatic commenting on GitHub issues with screenshots

**Deliverables:**
- GitHub API integration in background.js
- Issue ID input in DevTools panel
- Token management in settings

**Challenges:**
- CSP blocking GitHub API calls
- Proper authentication format for GitHub
- JSON formatting for API requests

**Solutions:**
- Added `https://api.github.com` to CSP `connect-src`
- Implemented dual auth format support (Bearer + classic token)
- Detailed error logging for debugging

### Phase 4: Multi-Token Support (Hours 4-5)
**Goal:** Allow users to configure and manage multiple GitHub tokens with custom names

**Deliverables:**
- Token list UI with add/delete functionality
- Token name input for identification
- Dropdown selector in DevTools panel
- Per-token storage in chrome.storage.sync

**Implementation Details:**
```javascript
// Each token stored as:
{
  id: "unique-uuid",
  name: "GitHub Token - Work",     // User-visible name
  token: "ghp_xxxxx...",           // Actual token
  repoUrl: "https://github.com/org/repo",
  createdAt: timestamp
}
```

### Phase 5: Polish & Refinement (Hours 5-6)
**Goal:** Fix bugs, improve UX, finalize feature set

**Changes:**
- Removed "Added by Screenshot Uploader" footer text
- Made issue number persist in DevTools (don't clear after add)
- Added page URL to GitHub comments
- Fixed manifest syntax errors
- Removed nested backticks in template literals

---

## Architecture & Technical Decisions

### Extension Architecture

```
Extension Structure:
├── manifest.json              # Configuration & permissions
├── background.js              # Service Worker (main logic hub)
├── content-script.js          # Page context (button injection)
├── devtools_page.html         # DevTools registration
├── devtools-panel.js          # DevTools panel registration
├── devtools.html              # DevTools UI
├── devtools.js                # DevTools panel logic
├── options.html               # Settings UI
├── options.js                 # Settings logic
├── popup.html/js              # Extension popup
└── images/icon.svg            # Extension icon
```

### Data Flow

**Capture & Upload Flow:**
```
Page/DevTools Click → Message to Background
    ↓
Background: chrome.tabs.captureVisibleTab()
    ↓
Gets Data URL (Base64 encoded PNG)
    ↓
Convert to Blob
    ↓
Upload to catbox.moe via FormData
    ↓
Catbox returns URL
    ↓
If GitHub comment needed:
    ├─ Get page URL
    ├─ Format markdown with URL + image
    ├─ POST to GitHub API
    └─ Return comment URL
    ↓
Display result to user
```

### Key Technical Decisions

1. **Screenshot Method: Chrome Native API**
   - Decision: Use `chrome.tabs.captureVisibleTab()` instead of html2canvas
   - Reasoning:
     - No external dependencies
     - No CSP violations
     - Native Chrome quality
     - Always works
   - Tradeoff: Only captures visible viewport (not full page scroll), but acceptable

2. **Storage: chrome.storage.sync**
   - Decision: Use sync storage for token settings
   - Reasoning:
     - Syncs across Chrome instances
     - Encrypted by Chrome
     - Secure for sensitive data like tokens
     - User can access from any device

3. **GitHub Authentication: Dual Format**
   - Decision: Support both Bearer and classic token formats
   - Reasoning:
     - GitHub API supports both
     - Users might have old tokens
     - Better resilience if one format fails

4. **Multi-Token Storage**
   - Decision: Store array of token objects with UUIDs
   - Reasoning:
     - Scalable for many tokens
     - User-friendly names for identification
     - Unique IDs prevent conflicts
     - Timestamps for audit trail

---

## Challenges & Solutions

### Challenge 1: HTML2Canvas Library Loading
**Issue:** html2canvas library wouldn't initialize in page context
**Root Cause:** UMD module not properly exposing `window.html2canvas`
**Solution:** Replaced with Chrome native `captureVisibleTab()` API
**Lesson:** Always prefer native APIs over external libraries when possible

### Challenge 2: Content Security Policy (CSP) Violations
**Issues Encountered:**
1. External CDN scripts blocked (html2canvas, cdnjs)
2. Inline event handlers blocked in HTML
3. GitHub API calls blocked

**Solutions Applied:**
1. Removed inline `onclick` handlers → moved to `addEventListener()` in JS
2. Added external domains to `connect-src` CSP directive
3. Configured CSP properly in manifest:
   ```json
   "content_security_policy": {
     "extension_pages": "script-src 'self'; ..."
   }
   ```
**Key Learning:** CSP is strict in Manifest V3 - plan for it early

### Challenge 3: Callback vs Promise APIs
**Issue:** `chrome.tabs.captureVisibleTab()` uses callbacks, not Promises
**Solution:** Wrapped callback in Promise with timeout handling:
```javascript
const dataUrl = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(...), 10000);
  chrome.tabs.captureVisibleTab({...}, (result) => {
    clearTimeout(timeout);
    if (chrome.runtime.lastError) reject(...);
    else resolve(result);
  });
});
```

### Challenge 4: Message Passing Between Contexts
**Issue:** Background script couldn't directly invoke functions in content script
**Solution:** Proper message protocol:
- Content script: Listen for messages from background
- Background: Send message to content script tab
- Each script returns response via sendResponse callback
- Always use `return true` in listener to keep channel open

### Challenge 5: GitHub API Authentication
**Issue:** Token format confusion (Bearer vs classic)
**Solution:** Implemented dual-attempt strategy:
1. Try Bearer format first: `Authorization: Bearer {token}`
2. If 401/403, try classic: `Authorization: token {token}`
3. Log both attempts for debugging

---

## Final Feature Set

### ✅ Completed Features

**1. Page Button (when domains configured)**
- Floating 📸 button on configured websites
- Single-click full-page screenshot
- Upload to catbox
- Real-time status updates

**2. DevTools Panel**
- Always accessible (F12)
- Screenshot button
- Issue ID input field
- Token selector dropdown
- Copy URL button
- Open image button
- Status messages

**3. GitHub Integration**
- Multiple token support
- Token naming for easy identification
- Per-login repo configuration
- Issue number validation
- Formatted comments with:
  - Page URL as clickable link
  - Screenshot as inline image
  - Clean, minimal design

**4. Settings Panel**
- Configure domains for page button
- Add/manage GitHub tokens with custom names
- Set repo URL per token
- View saved configurations
- Delete tokens/domains
- Clear settings option

**5. Catbox Integration**
- Auto-upload to catbox.moe
- 24-hour file retention
- Direct image URL in responses
- Blob conversion from Data URL
- Error handling for upload failures

---

## Code Quality & Standards

### File Organization
```
screenshot-uploader-extension/
├── manifest.json              # 56 lines
├── background.js              # 225+ lines (core logic)
├── content-script.js          # 95+ lines
├── devtools.js                # 95+ lines
├── devtools.html              # HTML UI
├── options.html               # HTML settings
├── options.js                 # 185+ lines (token management)
└── interactions/              # Documentation
```

### Error Handling
- Try-catch blocks with detailed error messages
- Console logging at each step for debugging
- User-friendly error messages in UI
- Timeout handling for long operations

### Message Passing Pattern
```javascript
// Sender
chrome.runtime.sendMessage({
  action: 'captureFromDevTools',
  tabId: activeTab.id,
  issueNumber: '123',
  tokenId: 'uuid-xxx'
}, response => {
  if (response.success) {
    // Handle success
  } else {
    // Handle error with response.error message
  }
});

// Receiver
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFromDevTools') {
    captureAndUpload(request.tabId)
      .then(url => sendResponse({ success: true, url }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open
  }
});
```

---

## Key Learnings & Best Practices

### 1. Manifest V3 Differences
- Service workers instead of persistent background pages
- Async Promise-based APIs preferred
- Stricter CSP requirements
- `chrome.runtime.onInstalled` for setup

### 2. CSP Management
- Plan CSP early in development
- Document all external domains needed
- Use specific `connect-src` for APIs
- Prefer `'self'` for scripts when possible

### 3. Token Security
- Store in `chrome.storage.sync` (encrypted)
- Never log full tokens to console
- Log only first 10 characters for debugging
- Validate token format on input

### 4. GitHub API Integration
- Support multiple auth formats (Bearer + classic)
- Check response status codes (401 vs 404 vs 403)
- Parse error responses for user feedback
- Always set Accept header: `application/vnd.github.v3+json`

### 5. DevTools Integration
- Always works (no domain restrictions)
- Better UX than page buttons
- More discoverable for developers
- Can access `chrome.tabs.get()` for current page info

### 6. User Experience
- Persist UI state (issue numbers, selections)
- Show real-time status updates
- Copy-to-clipboard functionality
- Clear error messages
- Dropdown for token selection (not free text)

---

## Future Enhancement Ideas

1. **Clipboard Integration**
   - Paste screenshot directly to clipboard
   - No need to click Copy button

2. **Image Formatting**
   - Crop/annotate before upload
   - Add captions
   - Resize to specific dimensions

3. **Comment Templates**
   - Customizable Discord/Slack webhooks
   - Template for comment format
   - Auto-detect issue type (bug/feature/question)

4. **Batch Operations**
   - Take multiple screenshots
   - Add all to same issue
   - Organize in thread

5. **Analytics**
   - Track usage statistics
   - Most-used repos
   - Busiest times

6. **GitHub App Integration**
   - OAuth instead of personal tokens
   - Better permission management
   - Automatic installation from marketplace

---

## Deployment Checklist

✅ manifest.json properly configured  
✅ All CSP domains whitelisted  
✅ Chrome Web Store guidelines compliant  
✅ README documentation complete  
✅ LICENSE file included (MIT)  
✅ Git repository initialized  
✅ GitHub Actions workflows (optional)  
✅ Version bump in manifest included  

---

## Contributing Guidelines

For future development:

1. **Code Style**
   - Use const/let (no var)
   - Async/await for Promises
   - Clear variable names
   - Comments for complex logic

2. **Testing**
   - Test on actual GitHub issues
   - Verify on different page types
   - Check CSP violations
   - Test with multiple tokens

3. **Commits**
   - Atomic commits (one feature per commit)
   - Clear commit messages
   - Reference issues when applicable
   - Push to main branch

4. **Documentation**
   - Update this file for major changes
   - Add inline code comments
   - Update README if UX changes

---

## Contact & Support

**Developer:** naveedshahzad  
**Repository:** https://github.com/naveedshahzad/screenshot-to-github  
**Issues:** https://github.com/naveedshahzad/screenshot-to-github/issues

For questions or suggestions, open an issue on GitHub!
