/**
 * Per-domain polite rate limiter implementing Rule 2.
 * Enforces a strict minimum 2,000ms pause between consecutive requests per domain.
 */
declare class DomainRateLimiter {
    private lastRequestMap;
    private domainQueues;
    private defaultMinIntervalMs;
    constructor(minIntervalMs?: number);
    /**
     * Extracts domain key (hostname + port) from target URL.
     */
    private getDomainKey;
    /**
     * Waits until the rate-limit window for this domain has cleared.
     * Returns the number of milliseconds waited.
     */
    waitForSlot(url: string, overrideIntervalMs?: number): Promise<number>;
}
export declare const rateLimiter: DomainRateLimiter;
export {};
