// DevTools panel script

// Get the inspected tab ID
const tabId = chrome.devtools.inspectedWindow.tabId;
let lastScreenshotUrl = '';
let availableTokens = [];

// DOM elements
const captureBtn = document.getElementById('captureBtn');
const copyBtn = document.getElementById('copyBtn');
const openBtn = document.getElementById('openBtn');
const settingsBtn = document.getElementById('settingsBtn');
const issueIdInput = document.getElementById('issueIdInput');
const tokenSelect = document.getElementById('tokenSelect');
const status = document.getElementById('status');
const resultBox = document.getElementById('resultBox');
const resultUrl = document.getElementById('resultUrl');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadAvailableTokens();
});

// Load available tokens from storage
function loadAvailableTokens() {
  chrome.storage.sync.get(['githubTokens'], (result) => {
    availableTokens = result.githubTokens || [];
    
    // Populate dropdown
    if (tokenSelect) {
      tokenSelect.innerHTML = '<option value="">-- No token selected --</option>';
      
      if (availableTokens.length === 0) {
        const option = document.createElement('option');
        option.disabled = true;
        option.textContent = 'No tokens configured';
        tokenSelect.appendChild(option);
      } else {
        availableTokens.forEach((token, index) => {
          const option = document.createElement('option');
          option.value = index;
          option.textContent = `${token.name} (${token.owner}/${token.repo})`;
          tokenSelect.appendChild(option);
        });
      }
    }
  });
}

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

          // Check if issue ID and token are provided for GitHub integration
          const issueId = issueIdInput.value.trim();
          const selectedTokenIndex = parseInt(tokenSelect.value);
          
          if (issueId && selectedTokenIndex >= 0 && availableTokens[selectedTokenIndex]) {
            await addScreenshotToGithubIssue(issueId, response.url, selectedTokenIndex);
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
async function addScreenshotToGithubIssue(issueId, screenshotUrl, tokenIndex) {
  showStatus('Adding screenshot to GitHub issue...', 'info');
  
  try {
    const selectedToken = availableTokens[tokenIndex];
    
    if (!selectedToken) {
      showStatus('❌ Selected token not found', 'error');
      return;
    }

    const owner = selectedToken.owner;
    const repo = selectedToken.repo;
    const token = selectedToken.token;
    const cleanIssueId = issueId.replace(/^#/, '');

    console.log('DevTools: Using token:', selectedToken.name);
    console.log('DevTools: Parsed - Owner:', owner, 'Repo:', repo, 'Issue:', cleanIssueId);

    if (!cleanIssueId || isNaN(cleanIssueId)) {
      showStatus('❌ Invalid issue ID (must be a number)', 'error');
      return;
    }

    // Get current page URL
    chrome.tabs.get(tabId, (tab) => {
      const pageUrl = tab ? tab.url : 'Unknown';
      
      // Call background script to add comment
      chrome.runtime.sendMessage(
        {
          action: 'addGithubComment',
          owner: owner,
          repo: repo,
          issueNumber: cleanIssueId,
          token: token,
          screenshotUrl: screenshotUrl,
          pageUrl: pageUrl
        },
        (response) => {
          if (response && response.success) {
            showStatus('✅ Screenshot added to GitHub issue #' + cleanIssueId + '!', 'success');
            setTimeout(() => hideStatus(), 3000);
          } else {
            showStatus('❌ Failed to add comment: ' + (response?.error || 'Unknown error'), 'error');
            console.error('DevTools: GitHub comment failed:', response?.error);
          }
        }
      );
    });
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
