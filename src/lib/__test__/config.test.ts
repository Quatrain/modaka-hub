import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, isEmailDomainAllowed, ConfigurationError, resetConfigForTests } from '../config';

describe('Configuration Layer & Fail-Fast Contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    resetConfigForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetConfigForTests();
  });

  it('fails fast and throws ConfigurationError when required parameters are unset', () => {
    delete process.env.APP_TITLE;
    delete process.env.DEFAULT_SOA;
    delete process.env.AI_PROVIDER;

    expect(() => loadConfig({ ignoreConfigFile: true })).toThrowError(ConfigurationError);
    expect(() => loadConfig({ ignoreConfigFile: true })).toThrow(/Missing required configuration parameter/);
  });

  it('loads valid configuration when all required parameters are provided in config file', () => {
    const conf = loadConfig();
    expect(typeof conf.appTitle).toBe('string');
    expect(conf.appTitle.length).toBeGreaterThan(0);
    expect(typeof conf.soa).toBe('string');
    expect(conf.soa.length).toBeGreaterThan(0);
    expect(conf.aiProvider).toBe('gemini');
    expect(conf.storageType).toBe('local');
    expect(conf.axes.length).toBeGreaterThan(0);
  });

  it('fails fast when AI provider credentials are missing', () => {
    process.env.AI_PROVIDER = 'deepseek';
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_MODEL;
    delete process.env.DEEPSEEK_BASE_URL;

    expect(() => loadConfig()).toThrowError(ConfigurationError);
    expect(() => loadConfig()).toThrow(/When AI_PROVIDER is "deepseek"/);
  });

  it('validates email domains properly according to policy', () => {
    process.env.ALLOWED_EMAIL_DOMAINS = '*';
    resetConfigForTests();
    expect(isEmailDomainAllowed('john@anywhere.com')).toBe(true);

    process.env.ALLOWED_EMAIL_DOMAINS = '@brad.ag';
    resetConfigForTests();
    const conf = loadConfig();
    expect(conf.allowedEmailDomains).toEqual(['@brad.ag']);
    expect(isEmailDomainAllowed('curator@brad.ag')).toBe(true);
    expect(isEmailDomainAllowed('stranger@external.com')).toBe(false);
  });
});
