/**
 * Per-domain polite rate limiter implementing Rule 2.
 * Enforces a strict minimum 2,000ms pause between consecutive requests per domain.
 */
class DomainRateLimiter {
    lastRequestMap = new Map();
    domainQueues = new Map();
    defaultMinIntervalMs = 2000;
    constructor(minIntervalMs = 2000) {
        this.defaultMinIntervalMs = minIntervalMs;
    }
    /**
     * Extracts domain key (hostname + port) from target URL.
     */
    getDomainKey(url) {
        try {
            const parsed = new URL(url);
            return parsed.host.toLowerCase();
        }
        catch {
            return 'default';
        }
    }
    /**
     * Waits until the rate-limit window for this domain has cleared.
     * Returns the number of milliseconds waited.
     */
    async waitForSlot(url, overrideIntervalMs) {
        const domain = this.getDomainKey(url);
        const interval = overrideIntervalMs ?? this.defaultMinIntervalMs;
        // Chain execution sequentially per domain to avoid race conditions
        const previousPromise = this.domainQueues.get(domain) || Promise.resolve();
        let waitedMs = 0;
        const currentWait = previousPromise.then(async () => {
            const now = Date.now();
            const lastRequest = this.lastRequestMap.get(domain) || 0;
            const elapsed = now - lastRequest;
            if (elapsed < interval) {
                waitedMs = interval - elapsed;
                await new Promise((resolve) => setTimeout(resolve, waitedMs));
            }
            this.lastRequestMap.set(domain, Date.now());
        });
        this.domainQueues.set(domain, currentWait);
        await currentWait;
        return waitedMs;
    }
}
// Global shared singleton rate limiter
export const rateLimiter = new DomainRateLimiter(2000);
