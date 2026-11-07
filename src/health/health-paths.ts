/** Probe endpoints. They are not logged or traced, since probes would dominate both. */
export const HEALTH_PATHS: ReadonlySet<string> = new Set(['/health/live', '/health/ready', '/health-check']);

/**
 * True for a request to a probe endpoint. Matches the way Express routes: the query string, a
 * trailing slash and letter case are ignored, so `/Health/Live/?x=1` counts as `/health/live`.
 */
export const isHealthPath = (url: string | undefined): boolean => {
  const path = (url ?? '').split('?')[0].toLowerCase();
  return HEALTH_PATHS.has(path.length > 1 && path.endsWith('/') ? path.slice(0, -1) : path);
};
