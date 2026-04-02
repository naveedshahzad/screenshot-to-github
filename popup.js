// Popup script - show status and quick actions

document.addEventListener('DOMContentLoaded', () => {
  displayStatus();
  displayCurrentDomain();
  
  // Add event listeners
  const settingsBtn = document.getElementById('settingsBtn');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettings);
  }
});

function displayStatus() {
  chrome.storage.sync.get(['enabledDomains'], (result) => {
    const domains = result.enabledDomains || [];
    const count = domains.length;
    const countEl = document.getElementById('domainCount');
    const listEl = document.getElementById('domainsList');

    countEl.textContent = count;

    if (domains.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No domains configured yet</div>';
      return;
    }

    listEl.innerHTML = domains.map((domain, index) => 
      `<div class="domain-item">• ${escapeHtml(domain)}</div>`
    ).join('');
  });
}

function displayCurrentDomain() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;

    const currentUrl = tabs[0].url;
    const hostname = new URL(currentUrl).hostname;
    const domainEl = document.getElementById('currentDomain');
    const statusEl = document.getElementById('currentStatus');

    domainEl.textContent = hostname;

    // Check if current domain is enabled
    chrome.storage.sync.get(['enabledDomains'], (result) => {
      const domains = result.enabledDomains || [];
      const isEnabled = domains.some(domain => {
        const domainPattern = domain.trim().toLowerCase().replace(/^(https?:\/\/)|(\/.*)?$/, '');
        const currentDomainPattern = hostname.toLowerCase();

        if (domainPattern.startsWith('*.')) {
          const suffix = domainPattern.slice(1);
          return currentDomainPattern.endsWith(suffix) || currentDomainPattern === suffix.slice(1);
        }

        return currentDomainPattern === domainPattern;
      });

      if (isEnabled) {
        statusEl.innerHTML = '<div class="enabled-badge">✓ ENABLED</div>';
      } else {
        statusEl.innerHTML = '<div class="disabled-badge">DISABLED</div>';
      }
    });
  });
}

function openSettings() {
  chrome.runtime.openOptionsPage();
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}
