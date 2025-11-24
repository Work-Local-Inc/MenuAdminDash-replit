/**
 * Utility functions for device detection
 */

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check for touch support
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Check user agent for mobile patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileUA = mobileRegex.test(navigator.userAgent);
  
  // Check screen width (typical mobile breakpoint)
  const isMobileWidth = window.innerWidth < 768;
  
  // Return true if any mobile indicators are present
  return hasTouch || isMobileUA || isMobileWidth;
}

export function hasCamera(): boolean {
  if (typeof navigator === 'undefined') return false;
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

