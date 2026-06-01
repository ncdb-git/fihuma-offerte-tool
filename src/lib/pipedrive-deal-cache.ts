import "server-only";

type CachedBundle<T> = {
  at: number;
  bundle: T;
};

const dealBundleCache = new Map<string, CachedBundle<unknown>>();

export const PIPEDRIVE_DEAL_CACHE_TTL_MS = 15 * 60 * 1000;

export function getCachedDealBundle<T>(dealId: string): T | null {
  const entry = dealBundleCache.get(dealId);
  if (!entry) return null;
  if (Date.now() - entry.at > PIPEDRIVE_DEAL_CACHE_TTL_MS) {
    dealBundleCache.delete(dealId);
    return null;
  }
  return entry.bundle as T;
}

export function setCachedDealBundle<T>(dealId: string, bundle: T) {
  dealBundleCache.set(dealId, { at: Date.now(), bundle });
}

export function invalidateCachedDealBundle(dealId: string) {
  dealBundleCache.delete(dealId);
}
