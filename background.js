// Cookie Cutter - Background Service Worker
// Handles extension state and statistics

// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    enabled: true,
    stats: {
      totalAccepted: 0,
      sitesProcessed: []
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COOKIE_ACCEPTED') {
    // Update statistics
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || { totalAccepted: 0, sitesProcessed: [] };
      stats.totalAccepted++;
      
      const hostname = new URL(sender.tab.url).hostname;
      if (!stats.sitesProcessed.includes(hostname)) {
        stats.sitesProcessed.push(hostname);
      }
      
      chrome.storage.local.set({ stats });
    });
    sendResponse({ success: true });
  }
  
  if (message.type === 'GET_STATUS') {
    chrome.storage.local.get(['enabled'], (result) => {
      sendResponse({ enabled: result.enabled !== false });
    });
    return true; // Keep channel open for async response
  }
  
  return true;
});
