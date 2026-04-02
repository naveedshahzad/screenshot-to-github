// DevTools panel script

// Get the inspected tab ID
const tabId = chrome.devtools.inspectedWindow.tabId;
let lastScreenshotUrl = '';

// DOM elements
const captureBtn = document.getElementById('captureBtn');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const settingsBtn = document.getElementById('settingsBtn');
const issueIdInput = document.getElementById('issueIdInput');
const status = document.getElementById('status');
const resultBox = document.getElementById('resultBox');
const resultUrl = document.getElementById('resultUrl');

// Capture button
captureBtn.addEventListener('click', async () => {
  captureBtn.disabled = true;
  showStatus('Capturing screenshot...', 'info');
  resultBox.classList.remove('show');

  try {
    // Send message to background script
    chrome.runtime.sendMessage(
      { action: 'captureFromDevTools', tabId: tabId },
      async (response) => {
        if (response && response.success) {
          lastScreenshotUrl = response.url;
          resultUrl.textContent = response.url;
          resultBox.classList.add('show');
          showStatus('✅ Screenshot captured and uploaded!', 'success');
          console.log('Screenshot uploaded:', response.url);

          // Check if issue ID is provided for GitHub integration
          const issueId = issueIdInput.value.trim();
          if (issueId) {
            await addScreenshotToGithubIssue(issueId, response.url);
          }
        } else {
          showStatus('❌ ' + (response?.error || 'Failed to capture screenshot'), 'error');
          console.error('Capture failed:', response?.error);
        }
        captureBtn.disabled = false;
      }
    );
  } catch (error) {
    showStatus('❌ ' + error.message, 'error');
    captureBtn.disabled = false;
    console.error('Error:', error);
  }
});

// Add screenshot to GitHub issue
async function addScreenshotToGithubIssue(issueId, screenshotUrl) {
  showStatus('Adding screenshot to GitHub issue...', 'info');
  
  try {
    // Get GitHub settings
    const settings = await new Promise((resolve) => {
      chrome.storage.sync.get(['githubToken', 'githubRepoUrl'], resolve);
    });

    const { githubToken, githubRepoUrl } = settings;

    console.log('DevTools: GitHub settings check...');
    console.log('DevTools: Token exists:', !!githubToken);
    console.log('DevTools: Repo URL exists:', !!githubRepoUrl);
    console.log('DevTools: Issue ID:', issueId);

    if (!githubToken || !githubRepoUrl) {
      showStatus('❌ GitHub token or repository URL not configured in settings', 'error');
      return;
    }

    // Parse repository URL
    const match = githubRepoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
    if (!match) {
      console.error('DevTools: URL parsing failed for:', githubRepoUrl);
      showStatus('❌ Invalid GitHub repository URL format (should be https://github.com/owner/repo)', 'error');
      return;
    }

    const owner = match[1];
    const repo = match[2];
    const cleanIssueId = issueId.replace(/^#/, '');

    console.log('DevTools: Parsed - Owner:', owner, 'Repo:', repo, 'Issue:', cleanIssueId);

    if (!cleanIssueId || isNaN(cleanIssueId)) {
      showStatus('❌ Invalid issue ID (must be a number)', 'error');
      return;
    }

    // Call background script to add comment
    chrome.runtime.sendMessage(
      {
        action: 'addGithubComment',
        owner: owner,
        repo: repo,
        issueNumber: cleanIssueId,
        token: githubToken,
        screenshotUrl: screenshotUrl
      },
      (response) => {
        if (response && response.success) {
          showStatus('✅ Screenshot added to GitHub issue #' + cleanIssueId + '!', 'success');
          issueIdInput.value = '';
          setTimeout(() => hideStatus(), 3000);
        } else {
          showStatus('❌ Failed to add comment: ' + (response?.error || 'Unknown error'), 'error');
          console.error('DevTools: GitHub comment failed:', response?.error);
        }
      }
    );
  } catch (error) {
    showStatus('❌ Error: ' + error.message, 'error');
    console.error('DevTools: GitHub integration error:', error);
  }
}

// Copy button
copyBtn.addEventListener('click', () => {
  if (lastScreenshotUrl) {
    navigator.clipboard.writeText(lastScreenshotUrl).then(() => {
      showStatus('✅ URL copied to clipboard!', 'success');
      setTimeout(() => hideStatus(), 2000);
    }).catch(error => {
      showStatus('❌ Failed to copy: ' + error.message, 'error');
    });
  }
});

// Open button
openBtn.addEventListener('click', () => {
  if (lastScreenshotUrl) {
    chrome.tabs.create({ url: lastScreenshotUrl });
  }
});

// Settings button
settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// Status messages
function showStatus(message, type) {
  status.textContent = message;
  status.className = 'status show ' + type;
}

function hideStatus() {
  status.classList.remove('show');
}

// Show current tab info on load
window.addEventListener('DOMContentLoaded', () => {
  chrome.tabs.get(tabId, (tab) => {
    if (tab) {
      console.log('DevTools panel opened for:', tab.title);
    }
  });
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'screenshotResult') {
    if (request.success) {
      lastScreenshotUrl = request.url;
      resultUrl.textContent = request.url;
      resultBox.classList.add('show');
      showStatus('✅ Screenshot uploaded successfully!', 'success');
    } else {
      showStatus('❌ ' + request.error, 'error');
    }
    captureBtn.disabled = false;
  }
});
