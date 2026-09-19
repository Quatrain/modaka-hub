import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createBetaToken, verifyBetaToken } from '../beta-login';
import { reloadConfig } from '../../../../lib/config';

describe('Beta Access Token Protocol', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.BETA_ACCESS_CODES = 'CODE-ALPHA-2026,CODE-BETA-2026';
    reloadConfig();
  });

  afterEach(() => {
    process.env = originalEnv;
    reloadConfig();
  });

  it('creates and verifies a valid signed beta token', () => {
    const token = createBetaToken('CODE-ALPHA-2026', 'Pierre B.');
    expect(token).toContain('.');

    const verified = verifyBetaToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.code).toBe('CODE-ALPHA-2026');
    expect(verified?.name).toBe('Pierre B.');
  });

  it('rejects tampered tokens', () => {
    const token = createBetaToken('CODE-ALPHA-2026', 'Pierre B.');
    const [base64, sig] = token.split('.');
    const tampered = `${base64}.invalid_signature`;

    const verified = verifyBetaToken(tampered);
    expect(verified).toBeNull();
  });

  it('rejects tokens with non-active beta codes', () => {
    const token = createBetaToken('REVOKED-CODE', 'Tester');
    const verified = verifyBetaToken(token);
    expect(verified).toBeNull();
  });
});
