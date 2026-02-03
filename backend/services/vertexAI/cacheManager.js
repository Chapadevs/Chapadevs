import NodeCache from 'node-cache';

/**
 * Cache manager for Vertex AI service
 */
export function createCache() {
  return new NodeCache({ 
    stdTTL: 3600,  // 1 hour cache
    checkperiod: 600 
  });
}

export function getCacheStats(cache) {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses
  };
}
