import { isHealthPath } from './health-paths';

describe('isHealthPath', () => {
  it.each(['/health/live', '/health/ready', '/health-check', '/health/live/', '/Health/Ready', '/health/live?probe=1'])('matches %s', (url) => {
    expect(isHealthPath(url)).toBe(true);
  });

  it.each(['/', '/health', '/tasks', '/health/live/x', undefined])('does not match %s', (url) => {
    expect(isHealthPath(url)).toBe(false);
  });
});
