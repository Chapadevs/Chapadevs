class CostMonitor {
  constructor() {
    this.stats = {
      apiCalls: 0,
      cacheHits: 0,
      totalRequests: 0,
      errors: 0
    };
    
    // Log stats every hour
    this.loggingInterval = setInterval(() => this.logStats(), 3600000);
  }

  trackRequest() {
    this.stats.totalRequests++;
  }

  trackAPICall() {
    this.stats.apiCalls++;
  }

  trackCacheHit() {
    this.stats.cacheHits++;
  }

  trackError() {
    this.stats.errors++;
  }

  logStats() {
    const totalAIRequests = this.stats.apiCalls + this.stats.cacheHits;
    const cacheHitRate = totalAIRequests > 0 
      ? (this.stats.cacheHits / totalAIRequests * 100) 
      : 0;
    
    console.log('\n📊 ========== COST MONITORING STATS (Last Hour) ==========');
    console.log(`   Total API Requests: ${this.stats.totalRequests}`);
    console.log(`   AI API Calls: ${this.stats.apiCalls}`);
    console.log(`   Cache Hits: ${this.stats.cacheHits}`);
    console.log(`   Cache Hit Rate: ${cacheHitRate.toFixed(2)}%`);
    console.log(`   Errors: ${this.stats.errors}`);
    
    // Estimate cost (Gemini Flash: ~$0.0005 per generation)
    const estimatedCost = this.stats.apiCalls * 0.0005;
    console.log(`   Estimated Cost: $${estimatedCost.toFixed(4)}`);
    
    // Project monthly cost
    const monthlyProjection = estimatedCost * 730; // 730 hours in a month
    console.log(`   Monthly Projection: $${monthlyProjection.toFixed(2)}`);
    console.log('========================================================\n');
    
    // Reset stats for next hour
    this.stats = {
      apiCalls: 0,
      cacheHits: 0,
      totalRequests: 0,
      errors: 0
    };
  }

  getStats() {
    return { ...this.stats };
  }

  // Cleanup on shutdown
  cleanup() {
    if (this.loggingInterval) {
      clearInterval(this.loggingInterval);
    }
  }
}

const costMonitor = new CostMonitor();

// Cleanup on process exit
process.on('SIGTERM', () => {
  costMonitor.cleanup();
});

process.on('SIGINT', () => {
  costMonitor.cleanup();
});

export default costMonitor;

