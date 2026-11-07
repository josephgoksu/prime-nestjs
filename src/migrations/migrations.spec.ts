import { readdirSync } from 'node:fs';
import { migrations } from './index';

describe('migrations index', () => {
  it('registers every migration file', () => {
    const files = readdirSync(__dirname).filter((f) => /^\d+-.+\.ts$/.test(f));
    const registered = migrations.map((m) => m.name);

    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const timestamp = file.split('-')[0];
      expect(registered.some((name) => name.endsWith(timestamp))).toBe(true);
    }
    expect(registered).toHaveLength(files.length);
  });

  it('keeps migrations in timestamp order', () => {
    const timestamps = migrations.map((m) => Number(/(\d+)$/.exec(m.name)?.[1]));
    expect([...timestamps].sort((a, b) => a - b)).toEqual(timestamps);
  });
});
