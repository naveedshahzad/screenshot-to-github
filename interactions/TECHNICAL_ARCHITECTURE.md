# screenshot-to-github - Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Chrome Extension                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐   │
│  │ Page Context     │  │ DevTools Panel   │  │ Options Page │   │
│  ├──────────────────┤  ├──────────────────┤  ├──────────────┤   │
│  │ content-script   │  │ devtools.html    │  │ options.html │   │
│  │ • Button inject  │  │ • UI             │  │ devtools.js  │   │
│  │ • Click handler  │  │ • Controls       │  │ • Token mgmt │   │
│  │               │  │ • Token selector │  │ • Repo config│   │
│  │                  │  │ • Issue input    │  │              │   │
│  └──────┬───────────┘  └────────┬─────────┘  └─────┬────────┘   │
│         │                       │                   │             │
│         └───────────┬───────────┴───────────┬───────┘             │
│                     │                       │                     │
│                     ▼                       ▼                     │
│         ┌─────────────────────────────────────────┐               │
│         │     Background Service Worker          │               │
│         │        (background.js)                 │               │
│         ├─────────────────────────────────────────┤               │
│         │ • Message router                       │               │
│         │ • Screenshot capture orchestration     │               │
│         │ • Catbox upload handler                │               │
│         │ • GitHub API caller                    │               │
│         │ • Error handling                       │               │
│         └──────┬──────────────────────────┬──────┘               │
│                │                          │                       │
└────────────────┼──────────────────────────┼───────────────────────┘
                 │                          │
       ┌─────────▼────────┐      ┌──────────▼────────┐
       │ Chrome Native    │      │  External APIs    │
       │ APIs             │      │                   │
       ├──────────────────┤      ├───────────────────┤
       │ • captureVisible │      │ • catbox.moe      │
       │   Tab()          │      │   (image upload)  │
       │ • tabs.get()     │      │ • api.github.com  │
       │ • storage.sync   │      │   (issue comment) │
       │ • runtime.*      │      │                   │
       └──────────────────┘      └───────────────────┘
```

---

## Message Passing Flow

### Capture Screenshot Flow

```
User clicks button or DevTools 📸
         ▼
Content script / DevTools panel
    Sends message:
    {
      action: 'captureFromDevTools',
      tabId: 123,
      issueNumber: '456',
      tokenId: 'uuid-xxx'
    }
         ▼
Background Service Worker
    Receives in onMessage listener
         ▼
    captureAndUpload(tabId)
         ▼
    chrome.tabs.captureVisibleTab()
    Returns: data:image/png;base64,iVBOR...
         ▼
    dataUrlToBlob(dataUrl)
    Converts Base64 → Blob
         ▼
    uploadToCatbox(blob)
         │
         ├─ Create FormData
         ├─ POST to catbox.moe/user/api.php
         └─ Returns: https://files.catbox.moe/xxxxx.png
         ▼
    If issueNumber provided:
         ├─ Get stored token by tokenId
         ├─ Get stored repo URL
         ├─ Get current page URL from tabs.get()
         ├─ Format comment markdown
         └─ addGithubComment() → POST to GitHub API
         ▼
    sendResponse({
      success: true,
      url: 'https://...',
      githubCommentUrl: '...'
    })
         ▼
Content Script / DevTools
    Receives response
    Displays result to user
```

---

## Data Storage Architecture

### Chrome Storage Structure

```javascript
// Extension Storage (chrome.storage.sync)
{
  "githubTokens": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "GitHub Token - Personal",
      "token": "ghp_xxxxxxxxxxxxxxxxxxxxx...",
      "repoUrl": "https://github.com/naveedshahzad/screenshot-to-github",
      "createdAt": 1712149200000
    },
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "name": "GitHub Token - Work",
      "token": "ghp_yyyyyyyyyyyyyyyyyyyyyyy...",
      "repoUrl": "https://github.com/company/project",
      "createdAt": 1712150000000
    }
  ],
  "enabledDomains": [
    "github.com",
    "*.github.io",
    "localhost:3000"
  ],
  "lastUsedTokenId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Storage Details:**
- **Type:** `chrome.storage.sync`
- **Size Limit:** 10MB per user
- **Sync:** Across user's Chrome instances
- **Security:** Encrypted by Chrome
- **Privacy:** User data, not shared with extension developer

---

## File Structure & Dependencies

### manifest.json
- **Purpose:** Extension config, permissions, entry points
- **Size:** ~2.5 KB
- **Permissions Requested:**
  - `storage` - Read/write settings
  - `tabs` - Get current tab info, capture screenshots
  - `scripting` - Execute scripts (if needed in future)
  - `activeTab` - Access current tab
- **Host Permissions:** `<all_urls>` - Required for capturing any page
- **CSP:** Allows catbox.moe, GitHub API, cdnjs

### background.js
- **Purpose:** Main extension logic hub
- **Size:** ~10 KB
- **Key Functions:**
  ```javascript
  chrome.runtime.onMessage.addListener()  // 50 lines
  captureAndUpload(tabId)                  // 40 lines
  dataUrlToBlob(dataUrl)                   // 20 lines
  uploadToCatbox(blob)                     // 25 lines
  addGithubComment(...)                    // 50 lines
  ```
- **Runs:** Continuously in background
- **Lifetime:** Until extension disabled

### content-script.js
- **Purpose:** Inject button on configured pages
- **Size:** ~5 KB
- **Scope:** Page context (sandboxed)
- **Runs:** `document_end` on all pages
- **Communicates:** With background.js only
- **Cannot Access:** Other extensions, browser APIs directly

### devtools/*
- **devtools_page.html** (~1 KB) - Registration page
- **devtools-panel.js** (~2 KB) - Creates panel
- **devtools.html** (~4 KB) - Panel UI
- **devtools.js** (~6 KB) - Panel logic
- **Runs:** Only when DevTools open
- **Access:** Full chrome.* API access, plus DevTools-specific APIs

### options/*
- **options.html** (~12 KB) - Settings UI
- **options.js** (~8 KB) - Settings logic
- **Entry Point:** chrome-extension://id/options.html
- **Storage:** Manages tokens and domains

---

## API Integration Details

### GitHub REST API

**Endpoint:** `POST /repos/{owner}/{repo}/issues/{issue_number}/comments`

**Request:**
```json
{
  "Authorization": "Bearer ghp_xxxxxxxxxxxxxxxxxxxxxxx",
  "Content-Type": "application/json",
  "Accept": "application/vnd.github.v3+json"
}
{
  "body": "**Screenshot from:** [page-url](link)\n\n<img src=\"catbox-url\" alt=\"Screenshot\" style=\"max-width:100%;height:auto;\"/>"
}
```

**Response on Success (201):**
```json
{
  "id": 1234567890,
  "url": "https://api.github.com/repos/owner/repo/issues/comments/1234567890",
  "html_url": "https://github.com/owner/repo/issues/1#issuecomment-1234567890",
  "body": "...",
  "user": {...},
  "created_at": "2026-04-02T12:34:56Z"
}
```

**Error Handling:**
- **401 Unauthorized** → Invalid or expired token
- **403 Forbidden** → Token lacks permissions
- **404 Not Found** → Issue or repo doesn't exist
- **422 Validation Failed** → Bad comment format

### Catbox API

**Endpoint:** `POST https://catbox.moe/user/api.php`

**Request (FormData):**
```
Content-Type: multipart/form-data
─────────────────────────────────
reqtype=fileupload
fileToUpload=[blob data]
useremail=[optional]
```

**Response (200):**
```
https://files.catbox.moe/rxabcd123.png
```

**Error Response:**
```
Error message text
OR
ERROR: API rate limited
OR
ERROR: File too large
```

---

## Security Considerations

### 1. Token Storage
- ✅ Stored in `chrome.storage.sync` (encrypted by Chrome)
- ✅ Never logged to console (only first 10 chars)
- ✅ Never sent to external servers except GitHub API
- ✅ User controls which tokens are stored
- ⚠️ Vulnerable if Chrome account compromised

### 2. Page Capture
- ✅ Only captures visible content (no sensitive headless access)
- ✅ User explicitly clicks button
- ✅ Only on configured domains (for page button)
- ⚠️ DevTools can capture any page

### 3. GitHub API
- ✅ HTTPS only
- ✅ Token sent in Authorization header (not URL)
- ✅ No token stored in cache/cookies
- ✅ Proper CSP restrictions

### 4. Catbox Upload
- ✅ HTTPS only
- ✅ Images public but random URLs (security through obscurity)
- ✅ 24-hour auto-delete (privacy)
- ⚠️ No encryption in transit to catbox

### 5. Content Security Policy
```
script-src 'self'
  - Only extension scripts allowed
  
object-src 'self'
  - No plugins/embeds

connect-src 
  https://catbox.moe           (image hosting)
  https://api.github.com       (issue API)
  https://cdnjs.cloudflare.com (if needed)
```

---

## Error Handling Strategy

### Screenshot Capture Errors

```javascript
try {
  // Attempt capture
  const dataUrl = await captureVisibleTab();
  // If fails: timeout timeout, Chrome error, no data
} catch (error) {
  // Return to user:
  // "Failed to capture: [specific error]"
  // Log: Full error object
  // Retry: Not automatic (user must click again)
}
```

### GitHub Comment Errors

```javascript
Error scenarios:
1. Invalid token
   → "GitHub API error 401: Unauthorized"
   → Suggest checking token
   
2. Bad issue number
   → "GitHub API error 404: Issue not found"
   → Suggest checking issue exists
   
3. No repo permission
   → "GitHub API error 403: Not allowed to access this resource"
   → Suggest checking token scope

4. Network failure
   → "Failed to fetch: [browser native error]"
   → Suggest checking internet
   
5. Catbox upload fails
   → "Catbox upload failed: HTTP 413 or 429"
   → Suggest retrying
```

### User Feedback

- **Success:** "✅ Screenshot added to issue #1234!"
- **Partial Success:** "✅ Screenshot uploaded, GitHub comment failed: [error]"
- **Failure:** "❌ [Specific error message]"
- **Console Logs:** Detailed debug info for developers

---

## Performance Characteristics

### Typical Operation Timing

```
User clicks button
  ↓ ~100ms
Screenshot capture (chrome.tabs.captureVisibleTab)
  ↓ ~500-2000ms (depends on page size)
Data URL generated (~1-5MB for complex pages)
  ↓ ~100ms
Convert to Blob and compress
  ↓ ~500-1000ms
Upload to catbox.moe
  ↓ ~1-3 seconds (network dependent)
Catbox returns URL
  ↓ [OPTIONAL: add GitHub comment]
  If yes: ~1-2 seconds (GitHub API call)
Display result
  ↓ TOTAL: 2-8 seconds
```

### Resource Usage

- **Memory:** ~20-50 MB during capture (temporary)
- **Disk:** Token data ~1 KB, cached images ~0 (cleaning via catbox)
- **Network:** ~1-5 MB upload per screenshot
- **CPU:** Minimal after capture complete

---

## Testing Checklist

### Unit Testing
- [ ] Token validation (format check)
- [ ] URL parsing for repos
- [ ] Issue number validation
- [ ] Message passing protocol
- [ ] Storage serialization/deserialization

### Integration Testing
- [ ] Settings page → Tokens saved → DevTools panel shows tokens ✓
- [ ] Capture button → Screenshot uploads → URL returned ✓
- [ ] Issue number + token → Comment added to GitHub ✓
- [ ] Multiple tokens → Correct token used based on selection ✓
- [ ] Token deletion → Removed from storage ✓

### Manual Testing Scenarios
- [ ] Capture on github.com
- [ ] Capture on local localhost
- [ ] Capture on complex JavaScript-heavy pages
- [ ] GitHub comment with images (verify rendering)
- [ ] GitHub comment on different issue types (bug, feature, question)
- [ ] DevTools works across multiple tabs
- [ ] DevTools works on incognito windows
- [ ] Settings persist across extension reload
- [ ] Multiple tokens work independently

### Edge Cases
- [ ] Very large page screenshot (>5 MB)
- [ ] Issue number doesn't exist
- [ ] GitHub token expired
- [ ] Repo URL incorrect
- [ ] Network disconnected (timeout)
- [ ] Catbox rate limited
- [ ] Very long page URL in comment

---

## Deployment & Versioning

### Chrome Web Store Submission

```
✅ Manifest Version: 3
✅ Icon: 128x128 minimum
✅ Description: Under 132 characters
✅ Screenshots: 1280x800 minimum
✅ Privacy Policy: Required (explains token usage)
✅ Permissions: Justified in description
✅ CSP: No eval(), no external scripts
```

### Versioning Scheme (Semantic)

```
Current: 1.0.0
  Major.Minor.Patch
  
1.0.0 → 1.1.0 = New feature (multiple tokens)
1.0.0 → 1.0.1 = Bug fix (issue number persistence)
1.0.0 → 2.0.0 = Breaking change (API rewrite)
```

---

## Maintenance & Updates

### Regular Maintenance
- Monitor GitHub for API changes
- Check catbox service status
- Review error logs from users
- Test on new Chrome versions

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Failed to fetch" | Check internet, CSP settings, token validity |
| "Token not working" | Verify token expiry, required scopes |
| "GitHub comment not appearing" | Check repo access, issue exists, rate limits |
| "Screenshot quality poor" | Browser resolution, page rendering |

---

## Future Architecture Considerations

### Scaling to Multiple Services
```
Extend beyond GitHub:
- Jira issues
- Linear issues
- Notion databases
- Discord webhooks
- Slack channels

Each would need adapter pattern in background.js
```

### Offline Support
```
Currently: No offline support
Future: Could cache screenshots locally
  - Use IndexedDB for larger storage
  - Queue comments for upload when online
  - Sync on connection restore
```

### Performance Optimization
```
Current approach: Sufficient for typical use
Future: Consider
  - Screenshot compression before upload
  - Incremental screenshot captures
  - Service Worker caching for assets
  - IndexedDB for token caching
```

---

## Architecture Strengths & Weaknesses

### Strengths ✅
- Simple, maintainable code structure
- Clear separation of concerns (content → background → APIs)
- User privacy (local token storage, no tracking)
- Minimal dependencies (native Chrome APIs)
- Fast (no complex processing)

### Weaknesses ⚠️
- Limited to visible viewport (not full scroll)
- Single comment format (not customizable)
- No offline queue (failed uploads lost)
- Manual token management (no OAuth)
- No analytics/usage tracking

### Trade-offs Made
1. **Simplicity over Features** - Easy to understand vs more features
2. **Native APIs over Libraries** - No dependencies vs more capabilities
3. **User Control over Automation** - Manual tokens vs OAuth convenience
4. **Privacy over Features** - No tracking vs better usage insights

