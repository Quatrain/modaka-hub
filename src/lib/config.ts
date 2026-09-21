import * as path from 'node:path';
import * as fs from 'node:fs';
import {
  Config,
  ConfigContainer,
  EnvConfigSource,
  ObjectConfigSource,
  ConfigurationError
} from '@quatrain/config';

export { ConfigurationError };

export type AiProviderType = 'gemini' | 'openai' | 'deepseek' | 'qwen';

export interface AxisDefinition {
  id: string;
  label: string;
  folder: string;
  color?: string;
  icon?: string;
  description?: string;
}

export interface ModakaConfig {
  appTitle: string;
  appSubtitle: string;
  badgeLabel?: string;
  soa: string;
  gitLocalPath: string;
  gitRepoOwner: string;
  gitRepoName: string;
  gitBranch: string;
  gitMode: 'local' | 'remote';
  documentStoragePath: string;
  storageType: 'local' | 's3';
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  allowedEmailDomains: string[];
  aiProvider: AiProviderType;
  aiModel: string;
  aiApiKey: string;
  aiBaseUrl?: string;
  axes: AxisDefinition[];
}

export function loadConfig(options?: { ignoreConfigFile?: boolean; configFilePath?: string }): ModakaConfig {
  const rootDir = process.cwd();

  // 1. Locate and parse configuration file if candidate exists
  let fileConfig: Record<string, unknown> = {};

  const configCandidatePaths = options?.configFilePath
    ? [options.configFilePath]
    : options?.ignoreConfigFile
      ? []
      : [
          path.resolve(rootDir, 'modaka-hub.config.json'),
          path.resolve(rootDir, 'src/config/admin_settings.json')
        ];

  for (const candidate of configCandidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf-8');
        fileConfig = JSON.parse(raw);
        break;
      } catch (err: any) {
        throw new ConfigurationError(
          'configFilePath',
          'modaka-hub',
          `Failed to parse configuration file at '${candidate}': ${err.message}`
        );
      }
    }
  }

  // 2. Initialize Config container for modaka-hub
  const sources = [new EnvConfigSource({ priority: 50 })];
  if (fileConfig && Object.keys(fileConfig).length > 0) {
    sources.push(new ObjectConfigSource(fileConfig, 'modaka-hub.config.json', 10));
  }
  const container = new ConfigContainer('modaka-hub', sources);
  Config.addConfig('modaka-hub', container, true);

  // 3. Validate Core Metadata (Fail-Fast)
  const appTitle = container.requireString(
    'appTitle',
    'Set APP_TITLE in .env or appTitle in modaka-hub.config.json.'
  );

  const appSubtitle = container.requireString(
    'appSubtitle',
    'Set APP_SUBTITLE in .env or appSubtitle in modaka-hub.config.json.'
  );

  const badgeLabel = container.getString('badgeLabel') || container.getString('APP_BADGE_LABEL');

  const soa =
    container.getString('DEFAULT_SOA') ||
    container.requireString('soa', 'Set DEFAULT_SOA in .env or soa in modaka-hub.config.json.');

  // 4. Validate Git & Local Storage (Fail-Fast)
  const gitLocalPath = container.requireString(
    'gitLocalPath',
    'Set GIT_LOCAL_PATH in .env or gitLocalPath in modaka-hub.config.json.'
  );

  const gitRepoOwner = container.requireString(
    'gitRepoOwner',
    'Set GIT_REPO_OWNER in .env or gitRepoOwner in modaka-hub.config.json.'
  );

  const gitRepoName = container.requireString(
    'gitRepoName',
    'Set GIT_REPO_NAME in .env or gitRepoName in modaka-hub.config.json.'
  );

  const gitBranch = container.requireString(
    'gitBranch',
    'Set GIT_BRANCH in .env or gitBranch in modaka-hub.config.json.'
  );

  const gitMode = container.requireEnum<'local' | 'remote'>(
    'gitMode',
    ['local', 'remote'],
    'Set GIT_MODE in .env ("local" or "remote") or gitMode in modaka-hub.config.json.'
  );

  // 5. Validate Storage Subsystem (Fail-Fast)
  const storageType = container.requireEnum<'local' | 's3'>(
    'storageType',
    ['local', 's3'],
    'Set STORAGE_TYPE in .env ("local" or "s3") or storageType in modaka-hub.config.json.'
  );

  let documentStoragePath: string;
  let s3Bucket: string | undefined;
  let s3Region: string | undefined;
  let s3Endpoint: string | undefined;
  let s3AccessKey: string | undefined;
  let s3SecretKey: string | undefined;

  if (storageType === 's3') {
    s3Bucket = container.requireString(
      's3Bucket',
      'When STORAGE_TYPE is "s3", S3_BUCKET must be explicitly configured.'
    );
    s3Region = container.requireString(
      's3Region',
      'When STORAGE_TYPE is "s3", S3_REGION must be explicitly configured.'
    );
    s3AccessKey = container.requireString(
      's3AccessKey',
      'When STORAGE_TYPE is "s3", S3_ACCESS_KEY must be explicitly configured.'
    );
    s3SecretKey = container.requireString(
      's3SecretKey',
      'When STORAGE_TYPE is "s3", S3_SECRET_KEY must be explicitly configured.'
    );
    s3Endpoint = container.getString('s3Endpoint') || container.getString('S3_ENDPOINT');
    documentStoragePath =
      container.getString('documentStoragePath') ||
      container.getString('DOCUMENT_STORAGE_PATH') ||
      path.join(gitLocalPath, 'assets');
  } else {
    documentStoragePath = container.requireString(
      'documentStoragePath',
      'When STORAGE_TYPE is "local", DOCUMENT_STORAGE_PATH must be explicitly configured in .env or config file.'
    );
  }

  // 6. Validate Auth Allowed Domains (Fail-Fast)
  const rawDomains =
    container.get('ALLOWED_EMAIL_DOMAINS') ||
    container.get('auth.allowedDomain') ||
    container.get('allowedEmailDomains');

  if (!rawDomains || (Array.isArray(rawDomains) && rawDomains.length === 0)) {
    throw new ConfigurationError(
      'allowedEmailDomains',
      'modaka-hub',
      'Missing required configuration parameter',
      'Set to \'*\' to allow all domains, or comma-separated domains (e.g. \'@example.com\').'
    );
  }

  const allowedEmailDomains = (typeof rawDomains === 'string' ? rawDomains.split(',') : (rawDomains as string[]))
    .map((d: string) => d.trim().toLowerCase())
    .filter(Boolean);

  // 7. Validate AI Provider & Credentials (Fail-Fast)
  const aiProvider = container.requireEnum<AiProviderType>(
    'aiProvider',
    ['gemini', 'deepseek', 'qwen', 'openai'],
    'Set AI_PROVIDER in .env ("gemini", "deepseek", "qwen", "openai") or aiProvider in modaka-hub.config.json.'
  );

  let aiModel: string;
  let aiApiKey: string;
  let aiBaseUrl: string | undefined;

  if (aiProvider === 'gemini') {
    aiModel =
      container.getString('GEMINI_MODEL') ||
      container.requireString('aiModel', 'When AI_PROVIDER is "gemini", GEMINI_MODEL must be explicitly configured.');
    aiApiKey =
      container.getString('GEMINI_API_KEY') ||
      container.requireString('aiApiKey', 'When AI_PROVIDER is "gemini", GEMINI_API_KEY must be explicitly configured.');
  } else if (aiProvider === 'deepseek') {
    aiModel =
      container.getString('DEEPSEEK_MODEL') ||
      container.requireString('aiModel', 'When AI_PROVIDER is "deepseek", DEEPSEEK_MODEL must be explicitly configured.');
    aiApiKey =
      container.getString('DEEPSEEK_API_KEY') ||
      container.requireString('aiApiKey', 'When AI_PROVIDER is "deepseek", DEEPSEEK_API_KEY must be explicitly configured.');
    aiBaseUrl =
      container.getString('DEEPSEEK_BASE_URL') ||
      container.requireString('aiBaseUrl', 'When AI_PROVIDER is "deepseek", DEEPSEEK_BASE_URL must be explicitly configured.');
  } else if (aiProvider === 'qwen') {
    aiModel =
      container.getString('QWEN_MODEL') ||
      container.requireString('aiModel', 'When AI_PROVIDER is "qwen", QWEN_MODEL must be explicitly configured.');
    aiApiKey =
      container.getString('QWEN_API_KEY') ||
      container.requireString('aiApiKey', 'When AI_PROVIDER is "qwen", QWEN_API_KEY must be explicitly configured.');
    aiBaseUrl =
      container.getString('QWEN_BASE_URL') ||
      container.requireString('aiBaseUrl', 'When AI_PROVIDER is "qwen", QWEN_BASE_URL must be explicitly configured.');
  } else {
    // openai
    aiModel =
      container.getString('OPENAI_MODEL') ||
      container.requireString('aiModel', 'When AI_PROVIDER is "openai", OPENAI_MODEL must be explicitly configured.');
    aiApiKey =
      container.getString('OPENAI_API_KEY') ||
      container.requireString('aiApiKey', 'When AI_PROVIDER is "openai", OPENAI_API_KEY must be explicitly configured.');
    aiBaseUrl =
      container.getString('OPENAI_BASE_URL') ||
      container.requireString('aiBaseUrl', 'When AI_PROVIDER is "openai", OPENAI_BASE_URL must be explicitly configured.');
  }

  // 8. Validate Taxonomy Axes (Fail-Fast)
  const axes = container.requireArray<AxisDefinition>(
    'axes',
    'modaka-hub.config.json must declare a non-empty \'axes\' array defining taxonomy dimensions.'
  );
  if (axes.length === 0) {
    throw new ConfigurationError(
      'axes',
      'modaka-hub',
      'Missing required configuration parameter',
      'modaka-hub.config.json must declare a non-empty \'axes\' array defining taxonomy dimensions.'
    );
  }

  return {
    appTitle,
    appSubtitle,
    badgeLabel,
    soa,
    gitLocalPath,
    gitRepoOwner,
    gitRepoName,
    gitBranch,
    gitMode,
    documentStoragePath,
    storageType,
    s3Bucket,
    s3Region,
    s3Endpoint,
    s3AccessKey,
    s3SecretKey,
    allowedEmailDomains,
    aiProvider,
    aiModel,
    aiApiKey,
    aiBaseUrl,
    axes
  };
}

let _cachedConfig: ModakaConfig | null = null;

export function reloadConfig(): ModakaConfig {
  _cachedConfig = loadConfig();
  return _cachedConfig;
}

export function resetConfigForTests(): void {
  _cachedConfig = null;
  Config.clear();
}

export function getConfig(): ModakaConfig {
  if (!_cachedConfig) {
    _cachedConfig = loadConfig();
  }
  return _cachedConfig;
}

export const config = new Proxy({} as ModakaConfig, {
  get(_target, prop: string | symbol) {
    return (getConfig() as any)[prop];
  }
});

/**
 * Checks if a given email is allowed according to domain policy.
 * If allowedEmailDomains contains '*', all domains are allowed.
 */
export function isEmailDomainAllowed(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const domains = config.allowedEmailDomains;

  if (domains.includes('*')) {
    return true;
  }

  return domains.some(domain => {
    const d = domain.startsWith('@') ? domain : `@${domain}`;
    return lower.endsWith(d);
  });
}
