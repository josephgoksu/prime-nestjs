import { hashSync } from 'bcryptjs';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes to the scrypt format with a random salt', async () => {
    const a = await service.hash('correct horse battery staple');
    const b = await service.hash('correct horse battery staple');

    expect(a).toMatch(/^scrypt\$16384\$8\$5\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(a).not.toEqual(b);
  });

  it('verifies the right password and rejects a wrong one', async () => {
    const hash = await service.hash('password123');

    await expect(service.verify('password123', hash)).resolves.toBe(true);
    await expect(service.verify('password124', hash)).resolves.toBe(false);
  });

  it('verifies legacy bcrypt hashes', async () => {
    const legacy = hashSync('password123', 4);

    await expect(service.verify('password123', legacy)).resolves.toBe(true);
    await expect(service.verify('nope', legacy)).resolves.toBe(false);
  });

  it('rejects malformed hashes', async () => {
    await expect(service.verify('password123', 'not-a-hash')).resolves.toBe(false);
    await expect(service.verify('password123', 'scrypt$1$2$3')).resolves.toBe(false);
  });

  it('never accepts a hash with an empty or corrupt key', async () => {
    await expect(service.verify('anything', 'scrypt$16384$8$5$c2FsdA==$')).resolves.toBe(false);
    await expect(service.verify('anything', 'scrypt$16384$8$5$c2FsdA==$!!!!')).resolves.toBe(false);
    await expect(service.verify('anything', 'scrypt$16384$8$5$$a2V5')).resolves.toBe(false);
  });

  it('returns false instead of throwing for invalid parameters', async () => {
    await expect(service.verify('x', 'scrypt$abc$8$5$c2FsdA==$a2V5')).resolves.toBe(false);
    await expect(service.verify('x', 'scrypt$1000$8$5$c2FsdA==$a2V5')).resolves.toBe(false);
    await expect(service.verify('x', '$2a$10$not-a-valid-bcrypt-hash')).resolves.toBe(false);
  });

  it('flags bcrypt and weaker scrypt hashes for rehash', async () => {
    expect(service.needsRehash(hashSync('x', 4))).toBe(true);
    expect(service.needsRehash('scrypt$1024$8$1$c2FsdA==$a2V5')).toBe(true);
    expect(service.needsRehash(await service.hash('x'))).toBe(false);
  });

  it('does not block the event loop while hashing', async () => {
    let ticks = 0;
    const timer = setInterval(() => ticks++, 1);
    await Promise.all(Array.from({ length: 8 }, () => service.hash('password123')));
    clearInterval(timer);

    expect(ticks).toBeGreaterThan(0);
  });
});
