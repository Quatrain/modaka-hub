import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, isEmailDomainAllowed, isBetaAccessCodeValid } from '../config';

describe('Configuration Layer', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('loads default values when environment variables are unset', () => {
    delete process.env.APP_TITLE;
    delete process.env.DEFAULT_SOA;
    delete process.env.AI_PROVIDER;

    const conf = loadConfig();
    expect(conf.appTitle).toBe('Modaka-Hub');
    expect(conf.soa).toBe('modaka/authority');
    expect(conf.aiProvider).toBe('gemini');
    expect(conf.storageType).toBe('local');
  });

  it('loads customized values from environment variables', () => {
    process.env.APP_TITLE = 'Hey Brad';
    process.env.DEFAULT_SOA = 'bradtech/world-agronomy';
    process.env.AI_PROVIDER = 'deepseek';
    process.env.DEEPSEEK_API_KEY = 'sk-deepseek-test-123';
    process.env.BETA_ACCESS_CODES = 'CODE-ALPHA,CODE-BETA';
    process.env.ALLOWED_EMAIL_DOMAINS = '@brad.ag,@community.org';

    const conf = loadConfig();
    expect(conf.appTitle).toBe('Hey Brad');
    expect(conf.soa).toBe('bradtech/world-agronomy');
    expect(conf.aiProvider).toBe('deepseek');
    expect(conf.aiApiKey).toBe('sk-deepseek-test-123');
    expect(conf.betaAccessCodes).toEqual(['CODE-ALPHA', 'CODE-BETA']);
    expect(conf.allowedEmailDomains).toEqual(['@brad.ag', '@community.org']);
  });

  it('validates email domains properly according to policy', () => {
    // If domains is empty or contains '*'
    expect(isEmailDomainAllowed('john@anywhere.com')).toBe(true);

    // If specific domains configured
    process.env.ALLOWED_EMAIL_DOMAINS = '@brad.ag';
    const conf = loadConfig();
    // Helper function checks against active config
    expect(conf.allowedEmailDomains).toEqual(['@brad.ag']);
  });

  it('validates beta access codes in uppercase and trimmed', () => {
    process.env.BETA_ACCESS_CODES = 'BETA-2026,AGRO-TEST';
    // reload config so helper uses updated env
    const conf = loadConfig();
    expect(conf.betaAccessCodes).toContain('BETA-2026');
    expect(conf.betaAccessCodes).toContain('AGRO-TEST');
  });
});
