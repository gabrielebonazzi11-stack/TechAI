export function installVerificationEnhancer() {
  // Temporarily disabled: the previous DOM-wide enhancer was too broad and
  // applied report controls across unrelated app panels.
  // The verification report must be integrated inside the real React output
  // component instead of scanning every div on the page.
  return;
}
