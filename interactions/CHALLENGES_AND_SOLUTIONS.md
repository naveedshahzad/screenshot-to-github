# Challenges & Solutions Reference Guide

This document catalogs all the problems encountered during development and their solutions.  
**Use this to quickly find solutions to common issues when extending or debugging the extension.**

---

## Content Security Policy (CSP) Violations

### Challenge 1.1: External Script Loading Blocked
**Symptoms:**
```
Loading the script 'https://cdnjs.cloudflare.com/...' violates 
Content Security Policy directive: "script-src 'self'"
```

**Root Cause:**
- Manifest V3 has strict CSP by default
- External CDN scripts not allowed for security
- html2canvas library failed to load from CDN

**Solutions Attempted (Failed):**
1. ❌ Added `https://cdnjs.cloudflare.com` to `script-src` → Still blocked
2. ❌ Loaded library in background.js → Didn't expose to content script
3. ❌ Injected script inline → Violated CSP for `unsafe-inline`

**Final Solution (✅ Worked):**
```javascript
// Stop trying to load html2canvas
// Use Chrome native API instead:
chrome.tabs.captureVisibleTab({ format: 'png', quality: 92 }, callback)
```

**Why This Works:**
- Native Chrome API = no external dependencies
- No CSP violations
- Always available
- Better quality control

**Key Learning:** When CSP blocks external libraries, check if native APIs exist first.

---

### Challenge 1.2: Inline Event Handlers Blocked  
**Symptoms:**
```
Executing inline event handler violates CSP directive 'script-src 'self''
onclick="addDomain()"
```

**Root Cause:**
- HTML inline attributes like `onclick` count as inline script execution
- CSP doesn't allow `unsafe-inline` scripts
- Affected options.html and devtools.html

**Solution:**
```javascript
// Before: ❌
// <button onclick="addDomain()">Add</button>

// After: ✅
// <button id="addDomainBtn">Add</button>
// Then in JS:
document.getElementById('addDomainBtn').addEventListener('click', addDomain);
```

**Key Learning:** Always use `addEventListener()` instead of inline event handlers in extensions.

---

### Challenge 1.3: GitHub API Calls Blocked
**Symptoms:**
```
Connecting to 'https://api.github.com/repos/...' violates 
Content Security Policy directive: "connect-src https://catbox.moe https://cdnjs.cloudflare.com"
```

**Root Cause:**
- `connect-src` CSP directive didn't include api.github.com
- Fetch requests to unlisted domains are blocked

**Solution:**
```json
// manifest.json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://catbox.moe https://api.github.com"
}
```

**Fix Applied:**
- Added `https://api.github.com` to `connect-src` list
- Reload extension after manifest change

**Key Learning:** All external API domains must be explicitly listed in CSP `connect-src`.

---

## Library Integration Issues

### Challenge 2.1: html2canvas Not Initializing
**Symptoms:**
```
Content: html2canvas library loaded successfully
Content: html2canvas library not available
```

**Root Cause:**
- Script loaded but UMD module didn't expose `window.html2canvas`
- Timing issue: script onload fired before module initialization
- Different initialization behavior in extension context vs regular page

**Solutions Attempted (Failed):**
1. ❌ Wait for script.onload → Module not initialized yet
2. ❌ Retry checking `window.html2canvas` → Never available
3. ❌ Inject inline → CSP violation
4. ❌ Load from local file → Module still not exposing to window

**Final Solution (✅ Worked):**
```javascript
// Abandon html2canvas entirely
// Replace with Chrome native API:
const dataUrl = await new Promise((resolve, reject) => {
  chrome.tabs.captureVisibleTab({ format: 'png' }, (result) => {
    if (chrome.runtime.lastError) reject(new Error(...));
    else resolve(result);
  });
});
```

**Why This Works:**
- No external dependencies
- No loading/timing issues
- No CSP complications
- Simple and reliable

**Key Learning:** External JavaScript libraries in extensions are problematic. Prefer native APIs.

---

## Chrome API Integration Issues

### Challenge 3.1: Callback vs Promise APIs
**Symptoms:**
```
Background: captureVisibleTab timeout after 10 seconds
// Promise never resolves
```

**Root Cause:**
- `chrome.tabs.captureVisibleTab()` uses callback, not Promises
- Easy to forget callback behavior and wait forever

**Solution:**
```javascript
// ❌ Wrong: Won't work
const result = await chrome.tabs.captureVisibleTab();

// ✅ Correct: Wrap in Promise
const dataUrl = await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    reject(new Error('captureVisibleTab timeout'));
  }, 10000);
  
  chrome.tabs.captureVisibleTab({ format: 'png', quality: 92 }, (result) => {
    clearTimeout(timeout);
    if (chrome.runtime.lastError) {
      reject(new Error(chrome.runtime.lastError.message));
    } else {
      resolve(result);
    }
  });
});
```

**Key Learning:** Check Chrome API documentation for callback vs Promise. Always wrap callbacks in Promises for await/async support.

---

### Challenge 3.2: Message Passing Protocol Confusion
**Symptoms:**
```
DevTools shows "Capturing..." forever
Background.js never receives message
// OR response handler never called
```

**Root Cause:**
- Forgot `return true` in message listener
- Message channel closed before sending response
- No timeout on waiting for response

**Solution:**
```javascript
// ❌ Wrong: Channel closes immediately
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    setTimeout(() => sendResponse({ success: true }), 2000);
    // return true missing!
  }
});

// ✅ Correct: Keep channel open
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'capture') {
    captureAndUpload()
      .then(url => sendResponse({ success: true, url }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // THIS IS CRITICAL
  }
});
```

**Key Learning:** Always use `return true` in `onMessage` listeners when sending responses asynchronously.

---

## Data Format & Conversion Issues

### Challenge 4.1: Data URL to Blob Conversion
**Symptoms:**
```
TypeError: Cannot read property 'charCodeAt' of undefined
// OR
Invalid array length when creating Uint8Array
```

**Root Cause:**
- Data URL format incorrect: missing comma separator
- Base64 decoding failed
- Incorrect string slicing

**Solution:**
```javascript
// ❌ Wrong: Doesn't handle format properly
const data = dataUrl.split(';')[1];
const raw = atob(data);

// ✅ Correct: Handles header + data properly
const [header, data] = dataUrl.split(',');
const mimeMatch = header.match(/:(.*?);/);
const mime = mimeMatch ? mimeMatch[1] : 'image/png';
const bstr = atob(data);
const n = bstr.length;
const u8arr = new Uint8Array(n);
for (let i = 0; i < n; i++) {
  u8arr[i] = bstr.charCodeAt(i);
}
const blob = new Blob([u8arr], { type: mime });
```

**Key Learning:** Data URLs have format `data:mime/type;base64,DATA`. Split on comma, not semicolon.

---

## GitHub API Integration Issues

### Challenge 5.1: Wrong Authentication Format
**Symptoms:**
```
GitHub API error 401: Unauthorized
// Token format wrong
```

**Root Cause:**
- GitHub API accepts both Bearer and classic token formats
- Different token types use different formats
- Documentation not always clear on which to use

**Solution:**
```javascript
// Dual-format attempt strategy:
async function addGithubComment(token, ...) {
  // Try modern format first (Bearer)
  let response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      // ... other headers
    }
  });
  
  // If 401/403, try classic format
  if (response.status === 401 || response.status === 403) {
    response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        // ... other headers
      }
    });
  }
  
  // Now check response
  if (!response.ok) throw new Error(...);
  return await response.json();
}
```

**Supported Token Formats:**
- Classic: `ghp_xxxxxxxxxxxxxxxxxxxx` → Use `token ghp_...`
- New: `github_pat_xxxxxxxxxxxxxxxxxxxx` → Use `Bearer github_pat_...`

**Key Learning:** GitHub has multiple auth formats. Support both for compatibility.

---

### Challenge 5.2: Issue URL vs API URL Confusion
**Symptoms:**
```
GitHub API error 404: Not Found
// But issue definitely exists!
```

**Root Cause:**
- User provides **web URL**: `https://github.com/owner/repo/issues/123`
- API needs **API URL**: `https://api.github.com/repos/owner/repo/issues/123`
- Simple copy-paste leads to errors

**Solution:**
```javascript
// ❌ Wrong: Web URL
const url = `https://github.com/owner/repo/issues/123/comments`;

// ✅ Correct: API URL
const url = `https://api.github.com/repos/owner/repo/issues/123/comments`;

// Helper to parse repo URL:
function parseRepoUrl(repoUrl) {
  // Input: https://github.com/naveedshahzad/screenshot-to-github
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  return {
    owner: match[1],     // naveedshahzad
    repo: match[2]       // screenshot-to-github
  };
}
```

**Key Learning:** Web URLs and API URLs are different. Always construct API calls with proper API domain.

---

### Challenge 5.3: Comment Markdown Formatting
**Symptoms:**
```
// Comment posted but image doesn't render
// OR format looks wrong in GitHub
```

**Root Cause:**
- Nested backticks in template literals cause syntax errors
- Markdown image format vs HTML image tags
- Line breaks in markdown not working

**Solution:**
```javascript
// ❌ Wrong: Nested backticks cause syntax error
const body = `
  **Screenshot from:** [${pageUrl}](${pageUrl})
  
  \`\`\`
  <img src="${screenshotUrl}" />
  \`\`\`
`;

// ✅ Correct: Use HTML img tag directly + proper string concat
let body = '**Screenshot from:** [';
body += pageUrl;
body += '](' + pageUrl + ')\n\n';
body += '<img src="' + screenshotUrl + '" alt="Screenshot" style="max-width:100%;height:auto;"/>';

// OR use proper template literal:
const body = `**Screenshot from:** [${pageUrl}](${pageUrl})

<img src="${screenshotUrl}" alt="Screenshot" style="max-width:100%;height:auto;"/>`;
```

**Key Learning:** GitHub accepts both Markdown and HTML. HTML img tags more reliable than Markdown image syntax.

---

## State Management Issues

### Challenge 6.1: Issue Number Getting Cleared
**Symptoms:**
```
After adding comment to GitHub:
- Screenshot URL displays ✓
- Issue number field clears (unexpectedly) ❌
- User has to re-enter issue number for next screenshot
```

**Root Cause:**
```javascript
// Line was clearing the input after successful comment:
issueInput.value = '';  // Removed this line!
```

**Solution:**
```javascript
// ✅ Don't clear the input - let user change it if needed
// issueInput.value = '';  // DELETED

// Only clear captureStatus
captureStatus.textContent = '';

// Keep the issue number for next capture
// User can manually clear or change it if needed
```

**Key Learning:** Always think about UX. Don't auto-clear persistent user inputs like issue IDs.

---

## Token & Credential Management Issues

### Challenge 7.1: Multiple Tokens with Similar Names
**Symptoms:**
```
User has 3 tokens, dropdown shows "GitHub Token", "GitHub Token", "GitHub Token"
→ User can't tell them apart
→ Uses wrong token by accident
```

**Root Cause:**
- Didn't provide user-friendly naming mechanism
- Just stored token value without descriptive name

**Solution:**
```javascript
// Store with custom name:
const token = {
  id: generateUUID(),
  name: "Personal - screenshot-to-github",  // User provides this
  token: "ghp_xxxxx...",
  repoUrl: "https://github.com/naveedshahzad/...",
  createdAt: Date.now()
};

// Display in dropdown with name:
// <select id="tokenSelect">
//   <option value="uuid1">Personal - screenshot-to-github</option>
//   <option value="uuid2">Work - company-repo</option>
//   <option value="uuid3">Testing - temp-token</option>
// </select>
```

**Key Learning:** Always provide user-friendly identifiers for credentials, not just values.

---

### Challenge 7.2: Token Validation on Input
**Symptoms:**
```
User pastes invalid token → Silent failure
User realizes after 30 seconds waiting for GitHub API to timeout
```

**Root Cause:**
- No pre-validation of token format
- Validation only happens when used

**Solution:**
```javascript
// Validate immediately on input:
function validateGitHubToken(token) {
  // GitHub tokens start with specific prefixes:
  // Classic: ghp_
  // Personal Access Token: ghp_
  // OAuth: gho_
  const validPrefixes = ['ghp_', 'ghs_', 'ghu_', 'gho_', 'github_pat_'];
  
  // Check if token starts with valid prefix
  const hasValidPrefix = validPrefixes.some(prefix => token.startsWith(prefix));
  
  if (!hasValidPrefix) {
    showError('Invalid GitHub token format. Should start with ghp_, ghs_, or similar.');
    return false;
  }
  
  // Check minimum length
  if (token.length < 30) {
    showError('GitHub token too short. Verify you copied the entire token.');
    return false;
  }
  
  return true;
}

// Use in options.js:
tokenInput.addEventListener('blur', () => {
  if (!validateGitHubToken(tokenInput.value)) {
    tokenInput.style.borderColor = 'red';
  }
});
```

**Key Learning:** Validate user input early and give immediate feedback.

---

## Debugging Techniques

### Best Practices Applied

**1. Multi-Level Console Logging**
```javascript
// Background: Background Service Worker
console.log('Background: About to capture...');

// Content: Content Script context
console.log('Content: Button clicked, sending message...');

// DevTools: DevTools panel context
console.log('DevTools: User selected token, starting capture...');

// Purpose: Easy to identify which context log comes from
```

**2. Service Worker Console Access**
```
To debug background.js:
1. chrome://extensions/
2. Find extension
3. Click "Inspect views" → "service worker"
4. Open Console tab
5. You'll see all background.js logs
6. Can execute chrome.* APIs directly in console
```

**3. Error Stack Traces**
```javascript
// Always log full error + stack:
catch (error) {
  console.error('Failed to capture:', error.message);
  console.error('Full error:', error);  // Includes stack trace
  // vs just:
  // console.error('Failed');  // Not helpful
}
```

---

## Performance & Optimization

### Avoided Pitfalls

1. **Don't Load html2canvas** - It's heavy (~150KB)
   - Use native Chrome API instead

2. **Don't Capture Full Page with Scrolling** - Very complex
   - Chrome's captureVisibleTab only does current viewport
   - That's usually sufficient

3. **Don't Process Large Blobs Synchronously** - Blocks UI
   - Use async/await for uploads
   - Show progress to user

4. **Don't Store Images Locally** - Wastes storage
   - Use catbox (24hr auto-cleanup)
   - User can download if needed

---

## Testing & QA

### Common Test Failures

**Test:**
```
Add comment to GitHub issue
```

**Common Failures:**
1. Issue number format wrong (`#1234` vs `1234`) → Fixed with parseInt
2. Token has wrong scopes → Document required scopes in settings
3. Repo URL malformed → Add URL validation
4. GitHub rate limited (60 req/min for auth) → Add retry logic

**Mitigation:**
```javascript
// Parse issue number flexibly:
function parseIssueNumber(input) {
  const num = parseInt(input.replace(/[^0-9]/g, ''));
  if (isNaN(num)) return null;
  return num;
}

// Validate repo URL:
function validateRepoUrl(url) {
  if (!url.includes('github.com')) return false;
  if (!url.match(/github\.com\/\w+\/\w+/)) return false;
  return true;
}
```

---

## Lessons Summary

| Category | Key Lesson |
|----------|------------|
| CSP | List all external domains explicitly |
| APIs | Wrap callbacks in Promises for async/await |
| Messages | Always `return true` for async responses |
| Libraries | Prefer native APIs over external libraries |
| UX | Don't auto-clear persistent user inputs |
| Tokens | Validate format early, store with names |
| Debugging | Multi-level logging with context prefixes |
| Performance | Use async operations to prevent UI blocking |

