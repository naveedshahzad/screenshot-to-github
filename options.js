// Options page script - manage enabled domains

document.addEventListener('DOMContentLoaded', () => {
  loadDomains();
  loadGithubSettings();
  
  // Add event listeners
  const addBtn = document.getElementById('addDomainBtn');
  const domainInput = document.getElementById('domainInput');
  const domainList = document.getElementById('domainList');
  const saveGithubBtn = document.getElementById('saveGithubBtn');
  
  if (addBtn) addBtn.addEventListener('click', addDomain);
  if (domainInput) domainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDomain();
    }
  });
  
  // Event delegation for remove buttons
  if (domainList) {
    domainList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) {
        const index = e.target.dataset.index;
        removeDomain(parseInt(index));
      }
    });
  }

  // GitHub settings handler
  if (saveGithubBtn) {
    saveGithubBtn.addEventListener('click', saveGithubSettings);
  }
});

function loadDomains() {
  chrome.storage.sync.get(['enabledDomains'], (result) => {
    const domains = result.enabledDomains || [];
    const domainList = document.getElementById('domainList');

    if (domains.length === 0) {
      domainList.innerHTML = '<div class="empty-state">No domains yet. Add one above to get started!</div>';
      return;
    }

    domainList.innerHTML = '';
    domains.forEach((domain, index) => {
      const li = document.createElement('li');
      li.className = 'domain-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'domain-name';
      nameSpan.textContent = domain;
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.index = index;
      
      li.appendChild(nameSpan);
      li.appendChild(removeBtn);
      domainList.appendChild(li);
    });
  });
}

function addDomain() {
  const input = document.getElementById('domainInput');
  const domain = input.value.trim();

  if (!domain) {
    showMessage('Please enter a domain', 'error');
    return;
  }

  // Validate domain format
  if (!isValidDomain(domain)) {
    showMessage('Invalid domain format. Use format like: example.com or *.example.com', 'error');
    return;
  }

  chrome.storage.sync.get(['enabledDomains'], (result) => {
    const domains = result.enabledDomains || [];

    // Check for duplicates
    const normalizedDomain = normalizeDomain(domain);
    if (domains.some(d => normalizeDomain(d) === normalizedDomain)) {
      showMessage('This domain is already added', 'error');
      return;
    }

    // Add new domain
    domains.push(domain);
    chrome.storage.sync.set({ enabledDomains: domains }, () => {
      showMessage(`✅ Added "${domain}"`, 'success');
      input.value = '';
      loadDomains();

      // Auto-hide success message
      setTimeout(() => {
        document.getElementById('message').style.display = 'none';
      }, 3000);
    });
  });
}

function removeDomain(index) {
  chrome.storage.sync.get(['enabledDomains'], (result) => {
    const domains = result.enabledDomains || [];
    const removedDomain = domains[index];
    
    domains.splice(index, 1);
    chrome.storage.sync.set({ enabledDomains: domains }, () => {
      showMessage(`Removed "${removedDomain}"`, 'info');
      loadDomains();

      // Auto-hide message
      setTimeout(() => {
        document.getElementById('message').style.display = 'none';
      }, 2000);
    });
  });
}

function showMessage(text, type) {
  const messageEl = document.getElementById('message');
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function isValidDomain(domain) {
  // Remove protocol if present
  domain = domain.replace(/^(https?:\/\/)/, '').replace(/\/$/, '');

  // Allow wildcard domains
  if (domain.startsWith('*.')) {
    domain = domain.slice(2);
  }

  // Check for valid domain characters
  const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)*[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i;
  
  // Special case for localhost and IP addresses
  if (domain === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
    return true;
  }

  return domainRegex.test(domain);
}

function normalizeDomain(domain) {
  return domain.trim().toLowerCase().replace(/^(https?:\/\/)|(\/.*)?$/, '');
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

function loadGithubSettings() {
  chrome.storage.sync.get(['githubToken', 'githubRepoUrl'], (result) => {
    const token = result.githubToken || '';
    const repoUrl = result.githubRepoUrl || '';
    
    const tokenInput = document.getElementById('githubToken');
    const repoInput = document.getElementById('githubRepoUrl');
    
    if (tokenInput) tokenInput.value = token;
    if (repoInput) repoInput.value = repoUrl;
  });
}

function saveGithubSettings() {
  const token = (document.getElementById('githubToken') || {}).value || '';
  const repoUrl = (document.getElementById('githubRepoUrl') || {}).value || '';

  if (!token || !repoUrl) {
    showGithubMessage('Please fill in both GitHub token and repository URL', 'error');
    return;
  }

  // Validate GitHub token format (support both classic and new token formats)
  // Classic: ghp_*, New: github_pat_*
  if (!token.startsWith('ghp_') && !token.startsWith('ghs_') && !token.startsWith('ghu_') && !token.startsWith('github_pat_')) {
    showGithubMessage('⚠️ Token format may be invalid. Tokens should start with ghp_, ghs_, ghu_, or github_pat_. Continue anyway?', 'warning');
  }

  // Validate repo URL format
  if (!repoUrl.includes('github.com')) {
    showGithubMessage('Invalid repository URL. Should be like https://github.com/username/repository', 'error');
    return;
  }

  // Parse and validate repo URL
  const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (!repoMatch) {
    showGithubMessage('Invalid repository URL format. Use: https://github.com/owner/repo or https://github.com/owner/repo.git', 'error');
    return;
  }

  const owner = repoMatch[1];
  const repo = repoMatch[2];

  console.log('Options: Saving GitHub settings for', owner + '/' + repo);

  chrome.storage.sync.set({ githubToken: token, githubRepoUrl: repoUrl }, () => {
    showGithubMessage('✅ GitHub settings saved successfully! (Owner: ' + owner + ', Repo: ' + repo + ')', 'success');
    console.log('Options: GitHub settings saved');
    setTimeout(() => {
      const msg = document.getElementById('githubMessage');
      if (msg) msg.style.display = 'none';
    }, 4000);
  });
}

function showGithubMessage(text, type) {
  const messageEl = document.getElementById('githubMessage');
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}
