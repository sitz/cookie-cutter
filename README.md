# 🍪 Cookie Cutter

**Automatically accept cookie consent popups.** Stop clicking "Accept" on every website you visit.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-success)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## ✨ Features

- 🚀 **25+ CMP Frameworks** — OneTrust, Cookiebot, TrustArc, Didomi, Quantcast, and more
- 🌍 **15+ Languages** — English, German, French, Spanish, Italian, Russian, Turkish, etc.
- 🎯 **Smart Detection** — Falls back to keyword matching for custom implementations
- ⚡ **Instant Hiding** — CSS injection hides banners before JavaScript even runs
- 🔄 **Dynamic Support** — MutationObserver catches popups that load after page load
- 🛡️ **Privacy Focused** — No data collection, works entirely locally

## 📦 Installation

### From Source (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/cookie-cutter.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right)

4. Click **Load unpacked** and select the `cookie-cutter` folder

5. The 🍪 icon should appear in your toolbar!

## 🎯 Supported CMPs

| Framework | Framework | Framework |
|-----------|-----------|-----------|
| OneTrust | Cookiebot | TrustArc |
| CookieYes | iubenda | Usercentrics |
| Quantcast | Didomi | Osano |
| Klaro | Termly | Complianz |
| CookieScript | CIVIC | Borlabs |
| Cookie Notice | GDPR Cookie Consent | Axeptio |
| Sirdata | Commanders Act | **Substack** |
| **Sourcepoint** | **HubSpot** | **Shopify** |

*...and many more through generic keyword detection!*

## 🌐 Supported Languages

English • German • French • Dutch • Spanish • Italian • Portuguese • Polish • Russian • Turkish • Norwegian • Swedish • Finnish

## 🔧 How It Works

Cookie Cutter uses a multi-layer approach:

1. **CSS Injection** — Immediately hides 100+ known popup patterns
2. **CMP Detection** — Identifies and clicks accept on known frameworks  
3. **Generic Matching** — Keyword-based fallback for custom implementations
4. **MutationObserver** — Watches for dynamically-loaded popups

## 📁 Project Structure

```
cookie-cutter/
├── manifest.json     # Extension configuration (Manifest V3)
├── content.js        # Main detection & auto-accept logic
├── styles.css        # CSS rules to hide popups
├── background.js     # Stats tracking service worker
├── popup.html/css/js # Extension popup UI
└── icons/            # Extension icons (16/48/128px)
```

## ⚙️ Configuration

Click the 🍪 icon in your toolbar to:
- **Enable/Disable** the extension
- View **statistics** (cookies accepted, sites processed)

## 🤝 Contributing

Found a site where Cookie Cutter doesn't work? 

1. Open an issue with the URL
2. Include a screenshot of the cookie popup
3. If possible, include the HTML structure of the consent dialog

PRs are welcome!

## 📄 License

MIT License — feel free to use, modify, and distribute.

---

<p align="center">
  <strong>Never click "Accept Cookies" again.</strong>
</p>
