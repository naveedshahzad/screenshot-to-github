// Background Service Worker - handles screenshot capture and catbox upload

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureAndUpload') {
    handleScreenshotCapture(sender.tab).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open for async response
  }
});

async function handleScreenshotCapture(tab) {
  try {
    // Capture the full page
    const canvas = await chrome.tabs.captureVisibleTab(
      tab.windowId,
      { format: 'png' }
    );

    // For full page height, we need to scroll and capture or use the viewport
    // Chrome's captureVisibleTab captures only the viewport
    // For full page, we'll use a workaround in content script
    
    // Convert canvas to blob
    const blob = await fetch(canvas).then(res => res.blob());
    
    // Upload to catbox
    const uploadResult = await uploadToCatbox(blob);
    
    return uploadResult;
  } catch (error) {
    console.error('Screenshot capture error:', error);
    throw error;
  }
}

async function uploadToCatbox(blob) {
  try {
    const formData = new FormData();
    
    // Add required catbox fields
    formData.append('reqtype', 'fileupload');
    formData.append('time', '24h'); // 24 hour expiry, adjust as needed
    formData.append('fileToUpload', blob, `screenshot-${Date.now()}.png`);

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData
    });

    const text = await response.text();
    
    // Catbox returns the URL directly
    if (text.startsWith('http')) {
      return {
        success: true,
        url: text,
        error: null
      };
    } else {
      return {
        success: false,
        error: text || 'Unknown error from catbox'
      };
    }
  } catch (error) {
    console.error('Catbox upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// For full page screenshot, we'll use html2canvas
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureFullPage') {
    captureFullPage(sender.tab.id).then(result => {
      sendResponse(result);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

async function captureFullPage(tabId) {
  try {
    // Inject the capture function into the page
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: async () => {
        try {
          console.log('Starting capture...');
          
          // Load html2canvas
          const html2canvasUrl = chrome.runtime.getURL('html2canvas.min.js');
          const script = document.createElement('script');
          script.src = html2canvasUrl;
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load html2canvas'));
            document.documentElement.appendChild(script);
            setTimeout(() => reject(new Error('html2canvas load timeout')), 10000);
          });
          
          console.log('Waiting for html2canvas to be available...');
          
          // Wait for html2canvas to be available
          let attempts = 0;
          while (typeof window.html2canvas === 'undefined' && attempts < 50) {
            await new Promise(r => setTimeout(r, 100));
            attempts++;
          }
          
          if (typeof window.html2canvas === 'undefined') {
            throw new Error('html2canvas library not loaded after 5 seconds');
          }
          
          console.log('html2canvas loaded, starting capture...');
          
          // Capture the page
          const canvas = await window.html2canvas(document.documentElement, {
            allowTaint: true,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            scale: 2
          });
          
          console.log('Canvas created, converting to blob...');
          
          // Convert to blob
          canvas.toBlob(async (blob) => {
            console.log('Blob created, uploading to catbox...');
            
            // Upload to catbox
            const formData = new FormData();
            formData.append('reqtype', 'fileupload');
            formData.append('time', '24h');
            formData.append('fileToUpload', blob, 'screenshot-' + Date.now() + '.png');
            
            try {
              const response = await fetch('https://catbox.moe/user/api.php', {
                method: 'POST',
                body: formData
              });
              
              const url = await response.text();
              console.log('Upload successful:', url);
              
              chrome.runtime.sendMessage({
                action: 'fullPageCaptured',
                success: true,
                url: url.trim()
              });
            } catch (error) {
              console.error('Upload failed:', error);
              chrome.runtime.sendMessage({
                action: 'fullPageCaptured',
                success: false,
                error: error.message
              });
            }
          }, 'image/png');
        } catch (error) {
          console.error('Capture error:', error);
          chrome.runtime.sendMessage({
            action: 'fullPageCaptured',
            success: false,
            error: error.message
          });
        }
      }
    });

    // Wait for response from content script
    return new Promise((resolve) => {
      const listener = (request, sender, sendResponse) => {
        if (request.action === 'fullPageCaptured') {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(request);
        }
      };
      chrome.runtime.onMessage.addListener(listener);

      // Timeout after 40 seconds
      const timeout = setTimeout(() => {
        chrome.runtime.onMessage.removeListener(listener);
        resolve({ success: false, error: 'Capture timeout - check console for details' });
      }, 40000);
    });
  } catch (error) {
    console.error('captureFullPage error:', error);
    return { success: false, error: error.message };
  }
}
