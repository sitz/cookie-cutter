/**
 * Cookie Cutter - Automated Test Suite
 * 
 * Tests the extension on 10 popular websites that have cookie banners.
 * Uses Puppeteer to load Chrome with the extension installed.
 * 
 * Usage:
 *   cd tests
 *   npm install
 *   npm test
 */

const puppeteer = require('puppeteer');
const path = require('path');

// Test configuration
const EXTENSION_PATH = path.resolve(__dirname, '..');
const TIMEOUT = 15000; // 15 seconds per site
const WAIT_FOR_BANNER = 5000; // Wait 5s for banner to appear/disappear

// 10 popular websites known to have cookie consent banners
const TEST_SITES = [
    {
        name: 'The Guardian',
        url: 'https://www.theguardian.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '[data-component="cmp"]'],
    },
    {
        name: 'BBC',
        url: 'https://www.bbc.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]'],
    },
    {
        name: 'Stack Overflow',
        url: 'https://stackoverflow.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '.js-consent-banner'],
    },
    {
        name: 'The Verge',
        url: 'https://www.theverge.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '#cmp-container'],
    },
    {
        name: 'CNET',
        url: 'https://www.cnet.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]'],
    },
    {
        name: 'Reuters',
        url: 'https://www.reuters.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '#onetrust-banner-sdk'],
    },
    {
        name: 'Forbes',
        url: 'https://www.forbes.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '.truste_box_overlay'],
    },
    {
        name: 'Medium',
        url: 'https://medium.com',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]'],
    },
    {
        name: 'The Independent',
        url: 'https://www.independent.co.uk',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '[class*="sp_message"]'],
    },
    {
        name: 'Le Monde (French)',
        url: 'https://www.lemonde.fr',
        bannerSelectors: ['[class*="consent"]', '[class*="cookie"]', '#didomi-popup'],
    },
];

// Terminal colors
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    cyan: '\x1b[36m',
    dim: '\x1b[2m',
};

function log(message, color = '') {
    console.log(`${color}${message}${colors.reset}`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if any cookie banner is visible on the page
 */
async function isBannerVisible(page, selectors) {
    for (const selector of selectors) {
        try {
            const visible = await page.evaluate((sel) => {
                const elements = document.querySelectorAll(sel);
                for (const el of elements) {
                    const style = getComputedStyle(el);
                    const rect = el.getBoundingClientRect();
                    if (style.display !== 'none' && 
                        style.visibility !== 'hidden' && 
                        style.opacity !== '0' &&
                        rect.width > 0 && 
                        rect.height > 0) {
                        return true;
                    }
                }
                return false;
            }, selector);
            
            if (visible) return true;
        } catch (e) {
            // Selector might be invalid, continue
        }
    }
    return false;
}

/**
 * Check if page scroll is blocked (another sign of unhandled cookie modal)
 */
async function isScrollBlocked(page) {
    return await page.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        const htmlStyle = getComputedStyle(html);
        const bodyStyle = getComputedStyle(body);
        
        return htmlStyle.overflow === 'hidden' || 
               bodyStyle.overflow === 'hidden' ||
               html.classList.contains('modal-open') ||
               body.classList.contains('modal-open');
    });
}

/**
 * Run a single site test
 */
async function testSite(browser, site) {
    const page = await browser.newPage();
    
    try {
        // Set viewport
        await page.setViewport({ width: 1280, height: 800 });
        
        // Navigate to site
        log(`  Loading ${site.url}...`, colors.dim);
        await page.goto(site.url, { 
            waitUntil: 'domcontentloaded',
            timeout: TIMEOUT 
        });
        
        // Wait for extension to process the page
        await sleep(WAIT_FOR_BANNER);
        
        // Check if banner is still visible
        const bannerVisible = await isBannerVisible(page, site.bannerSelectors);
        const scrollBlocked = await isScrollBlocked(page);
        
        // Determine result
        if (bannerVisible) {
            return { 
                success: false, 
                reason: 'Cookie banner still visible after 5s' 
            };
        }
        
        if (scrollBlocked) {
            return { 
                success: false, 
                reason: 'Page scroll is blocked (modal still open?)' 
            };
        }
        
        return { success: true };
        
    } catch (error) {
        return { 
            success: false, 
            reason: `Error: ${error.message}` 
        };
    } finally {
        await page.close();
    }
}

/**
 * Main test runner
 */
async function runTests() {
    log('\n🍪 Cookie Cutter - Automated Test Suite\n', colors.cyan);
    log(`Extension path: ${EXTENSION_PATH}`, colors.dim);
    log(`Testing ${TEST_SITES.length} sites...\n`);
    
    // Launch browser with extension
    const browser = await puppeteer.launch({
        headless: false, // Extensions don't work in headless mode
        args: [
            `--disable-extensions-except=${EXTENSION_PATH}`,
            `--load-extension=${EXTENSION_PATH}`,
            '--no-first-run',
            '--disable-popup-blocking',
        ],
        defaultViewport: null,
    });
    
    const results = [];
    
    for (const site of TEST_SITES) {
        log(`Testing: ${site.name}`, colors.cyan);
        
        const result = await testSite(browser, site);
        results.push({ site: site.name, ...result });
        
        if (result.success) {
            log(`  ✓ PASS - Cookie banner handled\n`, colors.green);
        } else {
            log(`  ✗ FAIL - ${result.reason}\n`, colors.red);
        }
    }
    
    await browser.close();
    
    // Summary
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    log('\n' + '='.repeat(50), colors.dim);
    log(`\nResults: ${passed}/${TEST_SITES.length} passed`, 
        passed === TEST_SITES.length ? colors.green : colors.yellow);
    
    if (failed > 0) {
        log('\nFailed sites:', colors.red);
        for (const r of results.filter(r => !r.success)) {
            log(`  - ${r.site}: ${r.reason}`, colors.red);
        }
    }
    
    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

// Run
runTests().catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
});
