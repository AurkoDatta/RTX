/**
 * Backend-enforced sanity limits on render jobs. These bound worst-case
 * render time and prevent a client from requesting an arbitrarily expensive
 * render, independent of whatever a scene's own JSON claims -- both the
 * scene-save endpoints and the render-job endpoint validate against these.
 */
export const RENDER_CAPS = {
  minWidth: 64,
  maxWidth: 640,
  minHeight: 64,
  maxHeight: 480,
  minSamples: 1,
  maxSamples: 200,
  minBounceDepth: 1,
  maxBounceDepth: 8,
  maxObjects: 50,
};
