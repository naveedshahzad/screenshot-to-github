// Options page script - manage enabled domains

document.addEventListener('DOMContentLoaded', () => {
  loadDomains();
  loadTokens();
  
  // Add event listeners for domains
  const addDomainBtn = document.getElementById('addDomainBtn');
  const domainInput = document.getElementById('domainInput');
  const domainList = document.getElementById('domainList');
  
  if (addDomainBtn) addDomainBtn.addEventListener('click', addDomain);
  if (domainInput) domainInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addDomain();
    }
  });
  
  // Event delegation for remove buttons (domains)
  if (domainList) {
    domainList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) {
        const index = e.target.dataset.index;
        removeDomain(parseInt(index));
      }
    });
  }

  // Add event listeners for tokens
  const addTokenBtn = document.getElementById('addTokenBtn');
  const tokensList = document.getElementById('tokensList');
  
  if (addTokenBtn) addTokenBtn.addEventListener('click', addToken);
  
  // Event delegation for remove buttons (tokens)
  if (tokensList) {
    tokensList.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-token-btn')) {
        const index = e.target.dataset.index;
        removeToken(parseInt(index));
      }
    });
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

function loadTokens() {
  chrome.storage.sync.get(['githubTokens'], (result) => {
    const tokens = result.githubTokens || [];
    const tokensList = document.getElementById('tokensList');

    if (tokens.length === 0) {
      tokensList.innerHTML = '<div class="empty-state">No tokens yet. Add one above to get started!</div>';
      return;
    }

    tokensList.innerHTML = '';
    tokens.forEach((token, index) => {
      const div = document.createElement('div');
      div.className = 'domain-item';
      
      const nameSpan = document.createElement('span');
      nameSpan.className = 'domain-name';
      nameSpan.innerHTML = `<strong>${escapeHtml(token.name)}</strong><br><span style="font-size: 12px; color: #666;">Repo: ${escapeHtml(token.owner)}/${escapeHtml(token.repo)}</span>`;
      
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.className = 'remove-token-btn';
      removeBtn.dataset.index = index;
      
      div.appendChild(nameSpan);
      div.appendChild(removeBtn);
      tokensList.appendChild(div);
    });
  });
}

function addToken() {
  const name = (document.getElementById('tokenName') || {}).value || '';
  const token = (document.getElementById('tokenValue') || {}).value || '';
  const repoUrl = (document.getElementById('tokenRepoUrl') || {}).value || '';

  if (!name || !token || !repoUrl) {
    showTokenMessage('Please fill in token name, token value, and repository URL', 'error');
    return;
  }

  // Validate GitHub token format
  if (!token.startsWith('ghp_') && !token.startsWith('ghs_') && !token.startsWith('ghu_') && !token.startsWith('github_pat_')) {
    showTokenMessage('⚠️ Token format may be invalid. Tokens should start with ghp_, ghs_, ghu_, or github_pat_', 'error');
    return;
  }

  // Validate repo URL format
  if (!repoUrl.includes('github.com')) {
    showTokenMessage('Invalid repository URL. Should be like https://github.com/username/repository', 'error');
    return;
  }

  // Parse and validate repo URL
  const repoMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
  if (!repoMatch) {
    showTokenMessage('Invalid repository URL format. Use: https://github.com/owner/repo', 'error');
    return;
  }

  const owner = repoMatch[1];
  const repo = repoMatch[2];

  chrome.storage.sync.get(['githubTokens'], (result) => {
    const tokens = result.githubTokens || [];

    // Check for duplicate names
    if (tokens.some(t => t.name.toLowerCase() === name.toLowerCase())) {
      showTokenMessage(`Token with name "${name}" already exists`, 'error');
      return;
    }

    // Add new token
    tokens.push({
      name: name,
      token: token,
      owner: owner,
      repo: repo,
      repoUrl: repoUrl
    });

    chrome.storage.sync.set({ githubTokens: tokens }, () => {
      showTokenMessage(`✅ Token "${name}" added successfully!`, 'success');
      
      // Clear inputs
      document.getElementById('tokenName').value = '';
      document.getElementById('tokenValue').value = '';
      document.getElementById('tokenRepoUrl').value = '';
      
      loadTokens();

      // Auto-hide success message
      setTimeout(() => {
        document.getElementById('tokenMessage').style.display = 'none';
      }, 3000);
    });
  });
}

function removeToken(index) {
  chrome.storage.sync.get(['githubTokens'], (result) => {
    const tokens = result.githubTokens || [];
    const removedToken = tokens[index];
    
    tokens.splice(index, 1);
    chrome.storage.sync.set({ githubTokens: tokens }, () => {
      showTokenMessage(`Removed token "${removedToken.name}"`, 'info');
      loadTokens();

      // Auto-hide message
      setTimeout(() => {
        document.getElementById('tokenMessage').style.display = 'none';
      }, 2000);
    });
  });
}

function showTokenMessage(text, type) {
  const messageEl = document.getElementById('tokenMessage');
  if (!messageEl) return;
  
  messageEl.textContent = text;
  messageEl.className = `message ${type}`;
  messageEl.style.display = 'block';
}

function loadGithubSettings() {
  // Deprecated - for compatibility
}

function saveGithubSettings() {
  // Deprecated - for compatibility
}

function showGithubMessage(text, type) {
  // Deprecated - for compatibility
}
