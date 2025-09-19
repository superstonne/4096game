/**
 * Performance Monitor for 4096 Game
 * Tracks Core Web Vitals and custom metrics
 */

(function() {
  'use strict';
  
  // Only run in production
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return;
  }
  
  // Web Vitals tracking
  function initWebVitals() {
    // Track Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          // Log LCP value
          console.log('LCP:', lastEntry.renderTime || lastEntry.loadTime);
          
          // Send to analytics if available
          if (window.op && window.op.track) {
            window.op.track('web_vitals', {
              metric: 'lcp',
              value: Math.round(lastEntry.renderTime || lastEntry.loadTime)
            });
          }
        });
        
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      } catch (e) {
        // Silently fail if not supported
      }
      
      // Track First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fid = entry.processingStart - entry.startTime;
            console.log('FID:', fid);
            
            if (window.op && window.op.track) {
              window.op.track('web_vitals', {
                metric: 'fid',
                value: Math.round(fid)
              });
            }
          });
        });
        
        fidObserver.observe({ type: 'first-input', buffered: true });
      } catch (e) {
        // Silently fail if not supported
      }
      
      // Track Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        let clsEntries = [];
        
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            if (!entry.hadRecentInput) {
              const firstSessionEntry = clsEntries[0];
              const lastSessionEntry = clsEntries[clsEntries.length - 1];
              
              // If the entry occurred more than 1 second after the previous entry or
              // more than 5 seconds after the first entry, start a new session
              if (clsEntries.length &&
                  (entry.startTime - lastSessionEntry.startTime >= 1000 ||
                   entry.startTime - firstSessionEntry.startTime >= 5000)) {
                // Log previous session
                console.log('CLS:', clsValue);
                
                if (window.op && window.op.track) {
                  window.op.track('web_vitals', {
                    metric: 'cls',
                    value: Math.round(clsValue * 1000) / 1000
                  });
                }
                
                // Start new session
                clsEntries = [entry];
                clsValue = entry.value;
              } else {
                clsEntries.push(entry);
                clsValue += entry.value;
              }
            }
          });
        });
        
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Silently fail if not supported
      }
    }
  }
  
  // Track custom game metrics
  function initGameMetrics() {
    // Track game initialization time
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', function() {
        setTimeout(function() {
          const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
          console.log('Page Load Time:', loadTime);
          
          if (window.op && window.op.track) {
            window.op.track('performance', {
              metric: 'page_load',
              value: loadTime
            });
          }
        }, 0);
      });
    }
    
    // Track time to interactive (when game is playable)
    if (window.GameManager) {
      const originalGameManager = window.GameManager;
      window.GameManager = function() {
        const startTime = performance.now();
        const instance = originalGameManager.apply(this, arguments);
        const initTime = performance.now() - startTime;
        
        console.log('Game Init Time:', initTime);
        
        if (window.op && window.op.track) {
          window.op.track('performance', {
            metric: 'game_init',
            value: Math.round(initTime)
          });
        }
        
        return instance;
      };
      window.GameManager.prototype = originalGameManager.prototype;
    }
  }
  
  // Resource timing
  function trackResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            if (entry.name.includes('.js') || entry.name.includes('.css')) {
              const loadTime = entry.responseEnd - entry.startTime;
              
              if (loadTime > 500) {
                console.warn('Slow resource:', entry.name, loadTime + 'ms');
              }
            }
          });
        });
        
        resourceObserver.observe({ type: 'resource', buffered: true });
      } catch (e) {
        // Silently fail
      }
    }
  }
  
  // Initialize all monitoring
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initWebVitals();
      initGameMetrics();
      trackResourceTiming();
    });
  } else {
    initWebVitals();
    initGameMetrics();
    trackResourceTiming();
  }
})();