/** Probe endpoints. They are not logged or traced, since probes would dominate both. */
export const HEALTH_PATHS: ReadonlySet<string> = new Set(['/health/live', '/health/ready', '/health-check']);
