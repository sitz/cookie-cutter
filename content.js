/**
 * Cookie Cutter - Content Script
 * Automatically detects and accepts cookie consent popups
 * 
 * Human-like approach:
 * 1. Find all visible buttons on the page
 * 2. Check if button text says "Accept" (or variants)
 * 3. Verify surrounding text mentions cookies/privacy
 * 4. Click it
 */

(function () {
    'use strict';

    // ================================
    // State
    // ================================

    let isEnabled = true;
    let hasAccepted = false;

    // ================================
    // Keywords
    // ================================

    // What an "accept" button looks like (multilingual)
    const ACCEPT_PATTERNS = [
        // English
        /^accept(\s+all)?$/i,
        /^accept\s*(cookies?|&|and)?\s*(continue)?$/i,
        /^agree(\s+to\s+all)?$/i,
        /^allow(\s+all)?$/i,
        /^i\s+(agree|accept)$/i,
        /^(got\s+it|ok(ay)?|yes|continue|understood)$/i,
        /^consent$/i,
        /^yes,?\s+i'?m\s+happy$/i, // Guardian specific
        /^that'?s\s+(ok|fine|okay)$/i,
        /^i\s+understand$/i,
        /^(enable|allow)\s+all$/i,
        // German
        /^(alle\s+)?akzeptieren$/i,
        /^(allen\s+)?zustimmen$/i,
        /^verstanden$/i,
        /^ich\s+stimme\s+zu$/i,
        /^einverstanden$/i,
        // French
        /^(tout\s+)?accepter(\s+et\s+continuer)?$/i,
        /^j'accepte$/i,
        /^compris$/i,
        /^d'accord$/i,
        // Spanish
        /^aceptar(\s+todo)?$/i,
        /^acepto$/i,
        /^de\s+acuerdo$/i,
        // Italian
        /^accetta(\s+tutto)?$/i,
        /^accetto$/i,
        // Dutch
        /^(alles\s+)?accepteren$/i,
        /^akkoord$/i,
        // Portuguese
        /^aceitar(\s+tudo)?$/i,
        /^concordo$/i,
        // Polish
        /^(zaakceptuj|zgadzam\s+się)$/i,
        // Russian
        /^(принять|согласен)$/i,
    ];

    // Buttons that confirm/save consent (for multi-step CMPs like Ketch)
    const SAVE_PATTERNS = [
        /^save(\s+(choices|preferences|settings|selection))?$/i,
        /^confirm(\s+(choices|preferences|selection|my\s+choice))?$/i,
        /^submit$/i,
        /^done$/i,
        /^close$/i,
        // German
        /^(auswahl\s+)?speichern$/i,
        /^bestätigen$/i,
        // French
        /^sauvegarder$/i,
        /^confirmer$/i,
        // Dutch
        /^opslaan$/i,
        /^bevestigen$/i,
    ];

    // Keywords that should NEVER be clicked
    const EXCLUSION_PATTERNS = [
        // Settings/preferences
        /settings|preferences|customize|customise|manage|options/i,
        /cookie\s*settings|manage\s*cookies/i,
        // Reject
        /reject|decline|deny|refuse|no\s*thanks/i,
        /necessary\s*only|essential\s*only/i,
        // Links
        /policy|privacy|terms|conditions|learn\s*more|read\s*more|details/i,
        // Social/auth (CRITICAL)
        /sign\s*(up|in)|log\s*(in|out)|register/i,
        /follow|subscribe|like|share|comment|reply|post/i,
        /download|install|buy|purchase|add\s*to\s*cart|checkout/i,
    ];

    // What cookie consent context looks like (in surrounding text)
    const COOKIE_CONTEXT_WORDS = [
        'cookie', 'cookies',
        'consent',
        'gdpr', 'dsgvo', 'ccpa',
        'privacy',
        'tracking',
        'personalization', 'personalisation',
        'personal data', 'your data',
        'advertising', 'partners',
        'we use', 'this site uses', 'this website uses',
        'your experience', 'improve your experience',
        'asks for your consent', // TechCrunch specific phrasing
    ];

    // ================================
    // Utility Functions
    // ================================

    function log(message, ...args) {
        // console.log(`[Cookie Cutter] ${message}`, ...args);
    }

    function isVisible(el) {
        if (!el) return false;
        const style = getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
    }

    function getText(el) {
        return (el.textContent || el.innerText || '').trim();
    }

    function getButtonText(el) {
        // Get direct text content, ignoring nested elements
        let text = '';
        for (const node of el.childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            }
        }
        // Fall back to full text if no direct text
        if (!text.trim()) {
            text = el.textContent || el.innerText || '';
        }
        text = text.trim().toLowerCase();

        // Also check aria-label, value, title — but only add if not already in text
        // (avoids duplication e.g. Ketch CMP where aria-label == visible text)
        const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();
        const value = (el.getAttribute('value') || '').trim().toLowerCase();
        const title = (el.getAttribute('title') || '').trim().toLowerCase();

        const parts = [text];
        if (ariaLabel && !text.includes(ariaLabel)) parts.push(ariaLabel);
        if (value && !text.includes(value)) parts.push(value);
        if (title && !text.includes(title)) parts.push(title);

        return parts.join(' ').trim();
    }

    // ================================
    // Core Logic: Button-First Approach
    // ================================

    /**
     * Check if button text matches accept patterns
     */
    function isAcceptButton(buttonText) {
        const text = buttonText.trim().toLowerCase();
        if (!text || text.length > 50) return false; // Too long = not a button label
        
        return ACCEPT_PATTERNS.some(pattern => pattern.test(text));
    }

    /**
     * Check if button text matches exclusion patterns
     */
    function isExcludedButton(buttonText) {
        return EXCLUSION_PATTERNS.some(pattern => pattern.test(buttonText));
    }

    /**
     * Check if button text matches save/confirm patterns (for multi-step CMPs)
     */
    function isSaveButton(buttonText) {
        const text = buttonText.trim().toLowerCase();
        if (!text || text.length > 50) return false;
        return SAVE_PATTERNS.some(pattern => pattern.test(text));
    }

    /**
     * Check if surrounding context mentions cookies/privacy
     * Look at parent containers for cookie-related text
     */
    function hasCookieContext(button) {
        let current = button.parentElement;
        let depth = 0;
        const maxDepth = 8;

        while (current && depth < maxDepth) {
            const text = getText(current).toLowerCase();
            
            // Don't check if container is the whole page
            const rect = current.getBoundingClientRect();
            if (rect.width > window.innerWidth * 0.95 && rect.height > window.innerHeight * 0.9) {
                current = current.parentElement;
                depth++;
                continue;
            }

            // Check for cookie-related words in the text
            const hasCookieWords = COOKIE_CONTEXT_WORDS.some(word => text.includes(word));
            if (hasCookieWords) {
                log(`Found cookie context at depth ${depth}: "${text.slice(0, 100)}..."`);
                return true;
            }

            current = current.parentElement;
            depth++;
        }

        return false;
    }

    /**
     * Find all visible buttons and score them
     */
    function findAcceptButtons() {
        const candidates = [];

        // Get all clickable elements
        const clickables = document.querySelectorAll(
            'button, [role="button"], input[type="button"], input[type="submit"], a[href="#"], a[href="javascript:"]'
        );

        for (const el of clickables) {
            if (!isVisible(el)) continue;

            const buttonText = getButtonText(el);

            // Must match accept pattern
            if (!isAcceptButton(buttonText)) continue;

            // Must NOT match exclusion pattern
            if (isExcludedButton(buttonText)) {
                log(`Excluded button: "${buttonText}"`);
                continue;
            }

            // Must have cookie context nearby
            if (!hasCookieContext(el)) {
                log(`No cookie context for: "${buttonText}"`);
                continue;
            }

            // Score: prefer exact matches, buttons over links
            let score = 50;
            if (el.tagName === 'BUTTON') score += 10;
            if (el.tagName === 'A') score -= 10;

            // Prefer buttons with filled background (primary style)
            try {
                const bg = getComputedStyle(el).backgroundColor;
                const isFilled = bg && bg !== 'transparent' && 
                                 bg !== 'rgba(0, 0, 0, 0)' && 
                                 bg !== 'rgb(255, 255, 255)';
                if (isFilled) score += 5;
            } catch (e) {}

            candidates.push({ element: el, text: buttonText, score });
            log(`Accept candidate: "${buttonText}" (score: ${score})`);
        }

        // Also check shadow DOM
        for (const host of document.querySelectorAll('*')) {
            if (host.shadowRoot) {
                const shadowButtons = findButtonsInShadow(host.shadowRoot);
                candidates.push(...shadowButtons);
            }
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        return candidates;
    }

    function findButtonsInShadow(shadowRoot, depth = 0) {
        if (depth > 2) return [];
        const candidates = [];

        const clickables = shadowRoot.querySelectorAll('button, [role="button"]');
        for (const el of clickables) {
            if (!isVisible(el)) continue;

            const buttonText = getButtonText(el);
            if (!isAcceptButton(buttonText)) continue;
            if (isExcludedButton(buttonText)) continue;

            // For shadow DOM, check context within shadow root
            const shadowText = (shadowRoot.host?.textContent || '').toLowerCase();
            const hasCookieWords = COOKIE_CONTEXT_WORDS.some(word => shadowText.includes(word));
            if (!hasCookieWords) continue;

            candidates.push({ element: el, text: buttonText, score: 45 });
        }

        // Recurse into nested shadow roots
        for (const el of shadowRoot.querySelectorAll('*')) {
            if (el.shadowRoot) {
                candidates.push(...findButtonsInShadow(el.shadowRoot, depth + 1));
            }
        }

        return candidates;
    }

    /**
     * Try to find and click hidden buttons (some sites hide accept buttons)
     */
    function tryHiddenButtons() {
        const allButtons = document.querySelectorAll('button, [role="button"]');

        for (const btn of allButtons) {
            const style = getComputedStyle(btn);
            const isHidden = style.display === 'none' || 
                             style.visibility === 'hidden' || 
                             style.opacity === '0';

            if (!isHidden) continue;

            const buttonText = getButtonText(btn);
            if (!isAcceptButton(buttonText)) continue;
            if (isExcludedButton(buttonText)) continue;
            if (!hasCookieContext(btn)) continue;

            log(`Forcing hidden button visible: "${buttonText}"`);
            btn.style.cssText = 'display: inline-block !important; visibility: visible !important; opacity: 1 !important;';

            // Force parent containers visible
            let parent = btn.parentElement;
            for (let i = 0; i < 5 && parent; i++) {
                const ps = getComputedStyle(parent);
                if (ps.display === 'none' || ps.visibility === 'hidden') {
                    parent.style.cssText = 'display: block !important; visibility: visible !important;';
                }
                parent = parent.parentElement;
            }

            btn.click();
            return true;
        }

        return false;
    }

    // ================================
    // Main Accept Logic
    // ================================

    /**
     * Find a save/confirm button in cookie context (for multi-step CMPs)
     */
    function findSaveButton() {
        const clickables = document.querySelectorAll(
            'button, [role="button"], input[type="button"], input[type="submit"]'
        );

        for (const el of clickables) {
            if (!isVisible(el)) continue;
            const buttonText = getButtonText(el);
            if (!isSaveButton(buttonText)) continue;
            if (!hasCookieContext(el)) continue;

            log(`Found save button: "${buttonText}"`);
            return el;
        }
        return null;
    }

    function acceptCookies() {
        if (hasAccepted || !isEnabled) return;

        const candidates = findAcceptButtons();

        if (candidates.length > 0) {
            const best = candidates[0];
            log(`Clicking: "${best.text}" (score: ${best.score})`);
            best.element.click();

            // Some CMPs (e.g. Ketch) need a follow-up "Save" click.
            // Use a MutationObserver to detect when the save button appears/updates.
            waitForSaveButton();
            return;
        }

        // Try hidden buttons as fallback
        if (tryHiddenButtons()) {
            hasAccepted = true;
            cleanup();
            notifyBackground();
            return;
        }

        // Last resort: Remove cross-origin iframe banners we can't interact with
        if (tryRemoveIframeBanners()) {
            hasAccepted = true;
            cleanup();
            notifyBackground();
            return;
        }

        log('No accept button found');
    }

    /**
     * Handle cross-origin CMP iframes that we can't interact with
     * These CMPs load in iframes we can't access, so we just remove them
     */
    function tryRemoveIframeBanners() {
        let removed = false;

        // Sourcepoint iframes
        const spIframes = document.querySelectorAll('iframe[id^="sp_message_iframe"]');
        if (spIframes.length > 0) {
            log('Removing Sourcepoint iframes');
            spIframes.forEach(iframe => iframe.remove());
            removed = true;
        }

        // Sourcepoint containers
        const spContainers = document.querySelectorAll('[class*="sp_message_container"], [id*="sp_message_container"]');
        if (spContainers.length > 0) {
            spContainers.forEach(el => el.remove());
            removed = true;
        }

        return removed;
    }

    function cleanup() {
        const html = document.documentElement;
        const body = document.body;

        // Remove common scroll-blocking classes
        const scrollClasses = [
            'modal-open', 'no-scroll', 'overflow-hidden',
            'cookie-consent-active', 'gdpr-active',
            'popin-gdpr-no-scroll',
            'sp-message-open', // Sourcepoint
        ];

        if (html) {
            html.style.overflow = '';
            scrollClasses.forEach(c => html.classList.remove(c));
        }
        if (body) {
            body.style.overflow = '';
            body.style.position = '';
            scrollClasses.forEach(c => body.classList.remove(c));
        }

        // Remove Sourcepoint iframes (they block the page even after consent is recorded)
        const spIframes = document.querySelectorAll('iframe[id^="sp_message_iframe"]');
        spIframes.forEach(iframe => iframe.remove());

        // Remove Sourcepoint overlay divs
        const spDivs = document.querySelectorAll('[class*="sp_message_container"], [id*="sp_message_container"]');
        spDivs.forEach(div => div.remove());
    }

    function notifyBackground() {
        try {
            chrome.runtime.sendMessage({ type: 'COOKIE_ACCEPTED' });
        } catch (e) {}
    }

    // ================================
    // Observers
    // ================================

    let observer = null;
    let debounceTimer = null;

    /**
     * Watch for DOM changes and try to accept cookies when new elements appear.
     * Auto-disconnects after 15 seconds or on success.
     */
    function setupObserver() {
        if (observer) return;

        const maxTime = 15000;
        const startTime = Date.now();

        observer = new MutationObserver(() => {
            if (hasAccepted || Date.now() - startTime > maxTime) {
                observer.disconnect();
                observer = null;
                return;
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(acceptCookies, 200);
        });

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    /**
     * After clicking accept, watch for a save/confirm button to appear.
     * Uses a MutationObserver instead of a blind timer.
     */
    function waitForSaveButton() {
        // Check immediately first
        const immediate = findSaveButton();
        if (immediate) {
            log(`Clicking save button: "${getButtonText(immediate)}"`);
            immediate.click();
            hasAccepted = true;
            cleanup();
            notifyBackground();
            return;
        }

        // Watch for DOM changes (button may update after accept click)
        let saveObserver = new MutationObserver(() => {
            const saveBtn = findSaveButton();
            if (saveBtn) {
                saveObserver.disconnect();
                log(`Clicking save button: "${getButtonText(saveBtn)}"`);
                saveBtn.click();
                hasAccepted = true;
                cleanup();
                notifyBackground();
                return;
            }
        });

        saveObserver.observe(document.body, { childList: true, subtree: true, attributes: true });

        // Safety: give up after 3 seconds — accept-only CMP, no save needed
        setTimeout(() => {
            saveObserver.disconnect();
            if (!hasAccepted) {
                hasAccepted = true;
                cleanup();
                notifyBackground();
            }
        }, 3000);
    }

    // ================================
    // Initialization
    // ================================

    function init() {
        try {
            chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (response) => {
                if (response?.enabled === false) {
                    isEnabled = false;
                    return;
                }
                runAcceptance();
            });
        } catch (e) {
            runAcceptance();
        }
    }

    function runAcceptance() {
        if (document.visibilityState === 'hidden') {
            document.addEventListener('visibilitychange', function handler() {
                if (document.visibilityState === 'visible') {
                    document.removeEventListener('visibilitychange', handler);
                    startAcceptance();
                }
            });
            return;
        }
        startAcceptance();
    }

    function startAcceptance() {
        // Try immediately with whatever DOM is available
        acceptCookies();

        // Observe future DOM changes for late-loading banners
        if (document.body) {
            setupObserver();
        } else {
            document.addEventListener('DOMContentLoaded', () => {
                acceptCookies();
                setupObserver();
            });
        }
    }

    // Kick off on DOMContentLoaded or immediately if already loaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Final attempt on full page load (images, fonts, etc.)
    window.addEventListener('load', acceptCookies);

})();
