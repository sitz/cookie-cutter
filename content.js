/**
 * Cookie Cutter - Content Script
 * Automatically detects and accepts cookie consent popups
 */

(function () {
    'use strict';

    // Check if extension is enabled
    let isEnabled = true;

    // Flag to prevent multiple accepts
    let hasAccepted = false;

    // ================================
    // CMP Framework Configurations
    // ================================

    const CMP_CONFIGS = [
        // OneTrust
        {
            name: 'OneTrust',
            detect: () => document.querySelector('#onetrust-consent-sdk, #onetrust-banner-sdk'),
            accept: () => {
                const btn = document.querySelector('#onetrust-accept-btn-handler, .onetrust-close-btn-handler, #accept-recommended-btn-handler');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Cookiebot
        {
            name: 'Cookiebot',
            detect: () => document.querySelector('#CybotCookiebotDialog'),
            accept: () => {
                const btn = document.querySelector('#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll, #CybotCookiebotDialogBodyButtonAccept, .CybotCookiebotDialogBodyButton[id*="Accept"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // TrustArc
        {
            name: 'TrustArc',
            detect: () => document.querySelector('.truste_box_overlay, #truste-consent-track, .trustarc-banner-container'),
            accept: () => {
                const btn = document.querySelector('.truste_acceptButton, #truste-consent-button, .trustarc-agree-btn, a[class*="acceptAll"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // CookieYes
        {
            name: 'CookieYes',
            detect: () => document.querySelector('.cky-consent-container, .cky-consent-bar'),
            accept: () => {
                const btn = document.querySelector('.cky-btn-accept, [data-cky-tag="accept-button"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // iubenda
        {
            name: 'iubenda',
            detect: () => document.querySelector('#iubenda-cs-banner'),
            accept: () => {
                const btn = document.querySelector('.iubenda-cs-accept-btn, #iubenda-cs-accept-btn');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Usercentrics
        {
            name: 'Usercentrics',
            detect: () => document.querySelector('#usercentrics-root'),
            accept: () => {
                // Usercentrics uses shadow DOM
                const root = document.querySelector('#usercentrics-root');
                if (root && root.shadowRoot) {
                    const btn = root.shadowRoot.querySelector('[data-testid="uc-accept-all-button"], button[class*="accept"]');
                    if (btn) { btn.click(); return true; }
                }
                return false;
            }
        },
        // Quantcast Choice
        {
            name: 'Quantcast',
            detect: () => document.querySelector('.qc-cmp2-container, .qc-cmp-ui-container'),
            accept: () => {
                const btn = document.querySelector('.qc-cmp2-summary-buttons button[mode="primary"], .qc-cmp2-button[mode="primary"], .qc-cmp-button[mode="primary"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Didomi
        {
            name: 'Didomi',
            detect: () => document.querySelector('#didomi-popup, #didomi-host'),
            accept: () => {
                const btn = document.querySelector('#didomi-notice-agree-button, [id*="didomi"][id*="agree"], .didomi-continue-without-agreeing');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Osano
        {
            name: 'Osano',
            detect: () => document.querySelector('.osano-cm-window, .osano-cm-dialog'),
            accept: () => {
                const btn = document.querySelector('.osano-cm-accept-all, .osano-cm-accept');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Klaro
        {
            name: 'Klaro',
            detect: () => document.querySelector('.klaro .cookie-notice, .klaro .cookie-modal'),
            accept: () => {
                const btn = document.querySelector('.klaro .cm-btn-accept-all, .klaro .cm-btn-accept, .klaro button[class*="accept"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Termly
        {
            name: 'Termly',
            detect: () => document.querySelector('#termly-code-snippet-support, .termly-consent-banner'),
            accept: () => {
                const btn = document.querySelector('[data-tid="accept-all"], .t-acceptAllButton, button[class*="termly"][class*="accept"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Complianz
        {
            name: 'Complianz',
            detect: () => document.querySelector('#cmplz-cookiebanner-container, .cmplz-cookiebanner'),
            accept: () => {
                const btn = document.querySelector('.cmplz-accept, .cmplz-btn.cmplz-accept-all, button.cmplz-accept');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Cookie Script
        {
            name: 'CookieScript',
            detect: () => document.querySelector('#cookiescript_injected'),
            accept: () => {
                const btn = document.querySelector('#cookiescript_accept, .cookiescript_accept');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // CIVIC Cookie Control
        {
            name: 'CIVIC',
            detect: () => document.querySelector('#ccc, #catapult-cookie-bar'),
            accept: () => {
                const btn = document.querySelector('#ccc-recommended-settings, .ccc-accept-button, #catapultCookie');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Borlabs Cookie (WordPress)
        {
            name: 'Borlabs',
            detect: () => document.querySelector('#BorlabsCookieBox'),
            accept: () => {
                const btn = document.querySelector('a[data-borlabs-cookie-accept-all], ._brlbs-btn-accept-all');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Cookie Notice for GDPR
        {
            name: 'CookieNotice',
            detect: () => document.querySelector('#cookie-notice, #cookie-law-info-bar'),
            accept: () => {
                const btn = document.querySelector('#cn-accept-cookie, #cookie_action_close_header, .cn-set-cookie');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // GDPR Cookie Consent
        {
            name: 'GDPRCookieConsent',
            detect: () => document.querySelector('.gdpr-cookie-notice, #moove_gdpr_cookie_info_bar'),
            accept: () => {
                const btn = document.querySelector('.gdpr-cookie-notice-accept, #moove_gdpr_cookie_accept');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Axeptio
        {
            name: 'Axeptio',
            detect: () => document.querySelector('#axeptio_overlay, [class*="axeptio"]'),
            accept: () => {
                const btn = document.querySelector('[class*="axeptio"][class*="accept"], button[class*="Axeptio"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Sirdata
        {
            name: 'Sirdata',
            detect: () => document.querySelector('#sd-cmp, .sd-cmp-banner'),
            accept: () => {
                const btn = document.querySelector('#sd-cmp-accept-all, .sd-cmp-accept');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Commanders Act
        {
            name: 'CommandersAct',
            detect: () => document.querySelector('#privacy-banner, [id*="commanders"]'),
            accept: () => {
                const btn = document.querySelector('#privacy-accept, [id*="commanders"][id*="accept"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Substack (Pencraft design system)
        {
            name: 'Substack',
            detect: () => document.querySelector('[class*="cookieBanner"]'),
            accept: () => {
                const banner = document.querySelector('[class*="cookieBanner"]');
                if (banner) {
                    const buttons = banner.querySelectorAll('button');
                    for (const btn of buttons) {
                        if (btn.textContent.trim().toLowerCase() === 'accept') {
                            btn.click();
                            return true;
                        }
                    }
                }
                return false;
            }
        },
        // Sourcepoint (used by Guardian, BBC, etc.)
        {
            name: 'Sourcepoint',
            detect: () => document.querySelector('[class*="sp_message_container"], .message-component'),
            accept: () => {
                const btn = document.querySelector('button[title="Accept all"], button[title="Accept"], [class*="sp_choice_type_11"]');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // HubSpot Cookie Banner
        {
            name: 'HubSpot',
            detect: () => document.querySelector('#hs-eu-cookie-confirmation'),
            accept: () => {
                const btn = document.querySelector('#hs-eu-confirmation-button');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Cookie Control (Silktide)
        {
            name: 'Silktide',
            detect: () => document.querySelector('#ccc-notify, .ccc-notify'),
            accept: () => {
                const btn = document.querySelector('.ccc-notify-button, #ccc-notify-accept');
                if (btn) { btn.click(); return true; }
                return false;
            }
        },
        // Shopify Cookie Banner
        {
            name: 'Shopify',
            detect: () => document.querySelector('.shopify-cookie-consent, [class*="cookie-consent-shopify"]'),
            accept: () => {
                const btn = document.querySelector('.shopify-cookie-consent button[type="submit"], [class*="cookie-consent"] button');
                if (btn) { btn.click(); return true; }
                return false;
            }
        }
    ];

    // ================================
    // Generic Consent Detection
    // ================================

    const ACCEPT_KEYWORDS = [
        'accept all',
        'accept cookies',
        'accept & continue',
        'accept and continue',
        'accept and close',
        'agree to all',
        'agree all',
        'agree & proceed',
        'allow all',
        'allow cookies',
        'allow all cookies',
        'i agree',
        'i accept',
        'i understand',
        'got it',
        'okay',
        'ok, got it',
        'ok',
        'consent',
        'continue',
        'enable all',
        'yes, i agree',
        'yes, accept',
        'accept recommended',
        'accept suggested',
        'akzeptieren',      // German
        'alle akzeptieren',
        'accepter',         // French
        'tout accepter',
        'accepteren',       // Dutch
        'alle accepteren',
        'aceptar',          // Spanish
        'aceptar todo',
        'accetta',          // Italian
        'accetta tutto',
        'aceitar',          // Portuguese
        'aceitar tudo',
        'zaakceptuj',       // Polish
        'akceptuję',
        'accept',           // Standalone accept (for simple banners like Substack)
        'agree',            // Standalone agree
        'понятно',          // Russian - "understood"
        'принять',          // Russian - "accept"
        'kabul et',         // Turkish
        'tümünü kabul et',
        'godta alle',       // Norwegian
        'acceptera',        // Swedish
        'acceptera alla',
        'hyväksy',          // Finnish
        'hyväksy kaikki'
    ];

    const CLOSE_KEYWORDS = [
        'dismiss',
        'close',
        '✕',
        '×',
        'x',
        '✖'
    ];

    // Elements that commonly contain cookie banners
    const BANNER_SELECTORS = [
        '[class*="cookie"]',
        '[class*="consent"]',
        '[class*="gdpr"]',
        '[class*="privacy"]',
        '[id*="cookie"]',
        '[id*="consent"]',
        '[id*="gdpr"]',
        '[id*="privacy"]',
        '[aria-label*="cookie" i]',
        '[aria-label*="consent" i]',
        '[role="dialog"][aria-modal="true"]'
    ];

    // ================================
    // Helper Functions
    // ================================

    function log(message, ...args) {
        // Uncomment for debugging
        // console.log(`[Cookie Cutter] ${message}`, ...args);
    }

    function isVisible(element) {
        if (!element) return false;
        const style = window.getComputedStyle(element);
        return style.display !== 'none' &&
            style.visibility !== 'hidden' &&
            style.opacity !== '0' &&
            element.offsetParent !== null;
    }

    function clickElement(element) {
        if (!element) return false;
        try {
            element.click();
            return true;
        } catch (e) {
            try {
                element.dispatchEvent(new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                }));
                return true;
            } catch (e2) {
                return false;
            }
        }
    }

    function findButtonByText(keywords, container = document) {
        const buttons = container.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]');

        for (const btn of buttons) {
            if (!isVisible(btn)) continue;

            const text = (btn.textContent || btn.value || btn.innerText || '').toLowerCase().trim();
            const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
            const title = (btn.getAttribute('title') || '').toLowerCase();

            for (const keyword of keywords) {
                if (text.includes(keyword) || ariaLabel.includes(keyword) || title.includes(keyword)) {
                    return btn;
                }
            }
        }
        return null;
    }

    function removeOverlay() {
        // Fix body scroll if locked
        const html = document.documentElement;
        const body = document.body;

        if (html) {
            html.style.overflow = '';
            html.classList.remove('cookie-consent-active', 'cookie-modal-open', 'gdpr-active', 'no-scroll');
        }

        if (body) {
            body.style.overflow = '';
            body.style.position = '';
            body.classList.remove('cookie-consent-active', 'cookie-modal-open', 'gdpr-active', 'no-scroll', 'modal-open');
        }
    }

    function notifyBackground() {
        try {
            chrome.runtime.sendMessage({ type: 'COOKIE_ACCEPTED' });
        } catch (e) {
            // Extension context may be invalidated
        }
    }

    // ================================
    // Main Accept Functions
    // ================================

    function tryAcceptKnownCMP() {
        for (const cmp of CMP_CONFIGS) {
            try {
                if (cmp.detect()) {
                    log(`Detected ${cmp.name}`);
                    if (cmp.accept()) {
                        log(`Accepted ${cmp.name} cookies`);
                        return true;
                    }
                }
            } catch (e) {
                log(`Error with ${cmp.name}:`, e);
            }
        }
        return false;
    }

    function tryGenericAccept() {
        // Find cookie banner containers
        const containers = document.querySelectorAll(BANNER_SELECTORS.join(', '));

        for (const container of containers) {
            if (!isVisible(container)) continue;

            // Look for accept button within container
            const btn = findButtonByText(ACCEPT_KEYWORDS, container);
            if (btn) {
                log('Found generic accept button:', btn.textContent);
                if (clickElement(btn)) {
                    return true;
                }
            }
        }

        // Try finding accept buttons in the whole document
        const btn = findButtonByText(ACCEPT_KEYWORDS);
        if (btn) {
            // Verify it's likely a cookie consent button by checking parent elements
            let parent = btn.parentElement;
            let looksLikeCookieBanner = false;

            for (let i = 0; i < 10 && parent; i++) {
                const id = (parent.id || '').toLowerCase();
                const className = (parent.className || '').toLowerCase();

                if (id.includes('cookie') || id.includes('consent') || id.includes('gdpr') || id.includes('privacy') ||
                    className.includes('cookie') || className.includes('consent') || className.includes('gdpr') || className.includes('privacy')) {
                    looksLikeCookieBanner = true;
                    break;
                }
                parent = parent.parentElement;
            }

            if (looksLikeCookieBanner) {
                log('Found cookie-related accept button:', btn.textContent);
                if (clickElement(btn)) {
                    return true;
                }
            }
        }

        return false;
    }

    function tryCloseButton() {
        // Look for close buttons as last resort
        const containers = document.querySelectorAll(BANNER_SELECTORS.join(', '));

        for (const container of containers) {
            if (!isVisible(container)) continue;

            const btn = findButtonByText(CLOSE_KEYWORDS, container);
            if (btn) {
                log('Found close button:', btn.textContent);
                if (clickElement(btn)) {
                    return true;
                }
            }
        }

        return false;
    }

    function acceptCookies() {
        if (hasAccepted || !isEnabled) return;

        // Try known CMP frameworks first
        if (tryAcceptKnownCMP()) {
            hasAccepted = true;
            removeOverlay();
            notifyBackground();
            return;
        }

        // Try generic detection
        if (tryGenericAccept()) {
            hasAccepted = true;
            removeOverlay();
            notifyBackground();
            return;
        }

        // Try close button as fallback
        if (tryCloseButton()) {
            hasAccepted = true;
            removeOverlay();
            notifyBackground();
            return;
        }

        // Always try to remove overlay/scroll lock
        removeOverlay();
    }

    // ================================
    // Mutation Observer
    // ================================

    let observer = null;
    let observerTimeout = null;

    function setupObserver() {
        if (observer) return;

        observer = new MutationObserver((mutations) => {
            if (hasAccepted) {
                observer.disconnect();
                return;
            }

            // Debounce observer callback
            if (observerTimeout) clearTimeout(observerTimeout);
            observerTimeout = setTimeout(() => {
                acceptCookies();
            }, 100);
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });

        // Auto-disconnect after 10 seconds
        setTimeout(() => {
            if (observer) {
                observer.disconnect();
                observer = null;
            }
        }, 10000);
    }

    // ================================
    // Initialization
    // ================================

    function init() {
        // Check extension status
        try {
            chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
                if (response && response.enabled === false) {
                    isEnabled = false;
                    return;
                }
                runAcceptance();
            });
        } catch (e) {
            // Extension context may not be available
            runAcceptance();
        }
    }

    function runAcceptance() {
        // First attempt - immediate
        acceptCookies();

        // Second attempt - after short delay (for async-loaded banners)
        setTimeout(acceptCookies, 500);

        // Third attempt - after longer delay
        setTimeout(acceptCookies, 1500);

        // Fourth attempt - final sweep
        setTimeout(acceptCookies, 3000);

        // Setup mutation observer for dynamically added popups
        if (document.body) {
            setupObserver();
        } else {
            document.addEventListener('DOMContentLoaded', setupObserver);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Also run on window load for late-loading popups
    window.addEventListener('load', () => {
        setTimeout(acceptCookies, 500);
    });

})();
