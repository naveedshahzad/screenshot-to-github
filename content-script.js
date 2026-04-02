// Content Script - injects screenshot button on configured domains
// Uses Chrome's native captureVisibleTab API (no external dependencies)

(function() {
  // Get configured domains from storage
  chrome.storage.sync.get(['enabledDomains'], (result) => {
    const enabledDomains = result.enabledDomains || [];
    const currentDomain = window.location.hostname;

    // Check if current domain matches any enabled domain
    const isDomainEnabled = enabledDomains.some(domain => {
      // Normalize domain comparison
      const domainPattern = domain.trim().toLowerCase().replace(/^(https?:\/\/)|(\/.*)?$/, '');
      const currentDomainPattern = currentDomain.toLowerCase();
      
      // Support wildcards and exact matches
      if (domainPattern.startsWith('*.')) {
        const suffix = domainPattern.slice(1); // Remove the *
        return currentDomainPattern.endsWith(suffix) || currentDomainPattern === suffix.slice(1);
      }
      
      return currentDomainPattern === domainPattern;
    });

    if (isDomainEnabled) {
      injectScreenshotButton();
    }
  });

  function injectScreenshotButton() {
    // Create button container
    const container = document.createElement('div');
    container.id = 'screenshot-uploader-container';
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create main button
    const button = document.createElement('button');
    button.id = 'screenshot-uploader-btn';
    button.innerHTML = '📸 Screenshot';
    button.style.cssText = `
      padding: 10px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 24px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    button.onmouseover = () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
    };

    button.onmouseout = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
    };

    // Status message element
    const statusMessage = document.createElement('div');
    statusMessage.id = 'screenshot-status-message';
    statusMessage.style.cssText = `
      display: none;
      position: fixed;
      bottom: 80px;
      right: 20px;
      background: white;
      border-radius: 12px;
      padding: 12px 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      font-size: 13px;
      z-index: 999998;
      max-width: 300px;
      word-wrap: break-word;
    `;

    // Click handler
    button.onclick = async () => {
      button.disabled = true;
      button.innerHTML = '⏳ Capturing...';

      try {
        // Show status
        statusMessage.textContent = '📸 Capturing page...';
        statusMessage.style.display = 'block';
        statusMessage.style.color = '#333';

        // Send message to background script to capture full page
        chrome.runtime.sendMessage(
          { action: 'captureFullPage' },
          (response) => {
            button.disabled = false;
            button.innerHTML = '📸 Screenshot';

            if (response.success) {
              // Show success message with copy button
              showSuccessMessage(statusMessage, response.url);
            } else {
              statusMessage.textContent = `❌ Error: ${response.error}`;
              statusMessage.style.color = '#dc3545';
              setTimeout(() => {
                statusMessage.style.display = 'none';
              }, 5000);
            }
          }
        );
      } catch (error) {
        button.disabled = false;
        button.innerHTML = '📸 Screenshot';
        statusMessage.textContent = `❌ Error: ${error.message}`;
        statusMessage.style.color = '#dc3545';
      }
    };

    container.appendChild(button);
    container.appendChild(statusMessage);
    document.body.appendChild(container);
  }

  function showSuccessMessage(statusMessage, url) {
    // Create container for success message
    const successContainer = document.createElement('div');
    successContainer.style.cssText = `
      background: #d4edda;
      border: 1px solid #c3e6cb;
      border-radius: 12px;
      padding: 12px 16px;
      color: #155724;
    `;

    // Create link element
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.textContent = 'View Upload';
    link.style.cssText = `
      color: #0c5460;
      text-decoration: underline;
      cursor: pointer;
    `;

    // Create copy button
    const copyBtn = document.createElement('button');
    copyBtn.innerHTML = '📋 Copy URL';
    copyBtn.style.cssText = `
      marginLeft: 12px;
      padding: 6px 12px;
      background: #0c5460;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    `;

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(url).then(() => {
        copyBtn.textContent = '✅ Copied!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copy URL';
        }, 2000);
      });
    };

    const textSpan = document.createElement('span');
    textSpan.textContent = '✅ Screenshot uploaded! ';

    successContainer.appendChild(textSpan);
    successContainer.appendChild(link);
    successContainer.appendChild(copyBtn);

    statusMessage.innerHTML = '';
    statusMessage.appendChild(successContainer);
    statusMessage.style.display = 'block';
    statusMessage.style.color = 'inherit';

    setTimeout(() => {
      statusMessage.style.display = 'none';
    }, 8000);
  }
})();
