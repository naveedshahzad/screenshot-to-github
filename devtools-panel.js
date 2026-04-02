// Register DevTools panel
chrome.devtools.panels.create(
  '📸 Screenshot',  // Panel title
  'images/icon.svg', // Panel icon
  'devtools.html'   // Panel HTML page
);
