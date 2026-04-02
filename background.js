// Background Service Worker - handles screenshot capture and catbox upload using Chrome native APIs

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    console.log('Background: Capture request received from tab', sender.tab.id);
    captureAndUpload(sender.tab.id)
      .then(url => {
        console.log('Background: Success, URL:', url);
        sendResponse({ success: true, url: url });
      })
      .catch(err => {
        console.error('Background: Error:', err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'captureFromDevTools') {
    console.log('Background: Capture request from DevTools, tab:', request.tabId);
    captureAndUpload(request.tabId)
      .then(url => {
        console.log('Background: DevTools capture success, URL:', url);
        sendResponse({ success: true, url: url });
      })
      .catch(err => {
        console.error('Background: DevTools capture error:', err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }

  if (request.action === 'addGithubComment') {
    console.log('Background: GitHub comment request for issue #' + request.issueNumber);
    addGithubComment(
      request.owner,
      request.repo,
      request.issueNumber,
      request.token,
      request.screenshotUrl
    )
      .then(() => {
        console.log('Background: GitHub comment added successfully');
        sendResponse({ success: true });
      })
      .catch(err => {
        console.error('Background: GitHub comment error:', err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep channel open for async response
  }
});

async function captureAndUpload(tabId) {
  try {
    console.log('Background: Using Chrome native captureVisibleTab API...');
    
    // Use Chrome's native screenshot API with proper callback handling
    console.log('Background: Capturing visible tab...');
    const dataUrl = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('captureVisibleTab timeout after 10 seconds'));
      }, 10000);

      try {
        chrome.tabs.captureVisibleTab({ format: 'png', quality: 92 }, (result) => {
          clearTimeout(timeout);
          if (chrome.runtime.lastError) {
            reject(new Error('Chrome error: ' + chrome.runtime.lastError.message));
          } else if (!result) {
            reject(new Error('captureVisibleTab returned no data'));
          } else {
            console.log('Background: captureVisibleTab callback received');
            resolve(result);
          }
        });
      } catch (e) {
        clearTimeout(timeout);
        reject(e);
      }
    });

    console.log('Background: Screenshot captured, size:', dataUrl.length, 'bytes');

    // Convert data URL to blob
    const blob = await dataUrlToBlob(dataUrl);
    console.log('Background: Blob size:', blob.size, 'bytes');

    // Upload to catbox
    const url = await uploadToCatbox(blob);
    console.log('Background: Upload successful:', url);

    return url;
  } catch (error) {
    console.error('Background: Capture error:', error.message);
    throw error;
  }
}

async function dataUrlToBlob(dataUrl) {
  return new Promise((resolve, reject) => {
    try {
      const [header, data] = dataUrl.split(',');
      const mimeMatch = header.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(data);
      const n = bstr.length;
      const u8arr = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
      }
      resolve(new Blob([u8arr], { type: mime }));
    } catch (error) {
      reject(error);
    }
  });
}

async function uploadToCatbox(blob) {
  try {
    const formData = new FormData();
    formData.append('reqtype', 'fileupload');
    formData.append('useremail', '');  // Optional: user email
    formData.append('fileToUpload', blob, 'screenshot.png');

    console.log('Background: Uploading to catbox.moe...');
    console.log('Background: Blob type:', blob.type, ', size:', blob.size);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
      // Note: Don't set Content-Type header when using FormData - browser will set it with boundary
    });

    console.log('Background: Response status:', response.status);
    const text = await response.text();
    console.log('Background: Catbox raw response:', text);

    if (!response.ok) {
      throw new Error(`Catbox HTTP ${response.status}: ${text}`);
    }

    const url = text.trim();
    if (!url) {
      throw new Error('Catbox returned empty response');
    }

    if (!url.startsWith('http')) {
      throw new Error('Invalid catbox response (not a URL): ' + url);
    }

    console.log('Background: Catbox upload successful!');
    return url;
  } catch (error) {
    console.error('Background: Upload error:', error.message);
    throw error;
  }
}

async function addGithubComment(owner, repo, issueNumber, token, screenshotUrl) {
  try {
    console.log('Background: Adding comment to issue #' + issueNumber + ' in ' + owner + '/' + repo);
    console.log('Background: Token format:', token.substring(0, 10) + '...');
    console.log('Background: Screenshot URL:', screenshotUrl);

    const commentBody = `<img src="${screenshotUrl}" alt="Screenshot" style="max-width: 100%; height: auto;"/>`;

    const url = `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`;
    console.log('Background: GitHub API URL:', url);
    console.log('Background: Comment body length:', commentBody.length);

    // Try modern auth format first (Bearer)
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        body: commentBody
      })
    });

    console.log('Background: GitHub API response status (Bearer):', response.status);

    // If Bearer fails, try classic token format
    if (response.status === 401 || response.status === 403) {
      console.log('Background: Bearer auth failed, trying classic token format...');
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          body: commentBody
        })
      });
      console.log('Background: GitHub API response status (token):', response.status);
    }

    const responseText = await response.text();
    console.log('Background: GitHub response text:', responseText.substring(0, 200));

    if (!response.ok) {
      try {
        const errorData = JSON.parse(responseText);
        console.error('Background: GitHub error details:', errorData);
        throw new Error(`GitHub API error ${response.status}: ${errorData.message || JSON.stringify(errorData)}`);
      } catch (e) {
        throw new Error(`GitHub API error ${response.status}: ${responseText || 'Unknown error'}`);
      }
    }

    const data = JSON.parse(responseText);
    console.log('Background: Comment added successfully, ID:', data.id);
    return data;
  } catch (error) {
    console.error('Background: GitHub comment error:', error.message);
    console.error('Background: Full error:', error);
    throw error;
  }
}
