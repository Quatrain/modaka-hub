import * as path from 'node:path';
import * as fs from 'node:fs';

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

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Requires an explicit configuration parameter from environment variable or JSON config file.
 * Throws ConfigurationError immediately (fail-fast) without silent defaults.
 */
function requireParam<T = string>(
  name: string,
  envKey: string,
  fileValue: any,
  helpText: string
): T {
  const envVal = process.env[envKey];
  const value = envVal !== undefined && envVal !== '' ? envVal : fileValue;

  if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
    throw new ConfigurationError(
      `[Bootstrap] Missing required configuration parameter: '${name}' (env: '${envKey}'). ${helpText}`
    );
  }

  return (typeof value === 'string' ? value.trim() : value) as T;
}

export function loadConfig(options?: { ignoreConfigFile?: boolean; configFilePath?: string }): ModakaConfig {
  const env = process.env;

  // 1. Locate and parse configuration file if candidate exists
  let fileConfig: Partial<ModakaConfig> = {};
  const rootDir = process.cwd();

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
        const parsed = JSON.parse(raw);
        fileConfig = { ...fileConfig, ...parsed };
        break;
      } catch (err: any) {
        throw new ConfigurationError(
          `[Bootstrap] Failed to parse configuration file at '${candidate}': ${err.message}`
        );
      }
    }
  }

  // 2. Validate Core Metadata (Fail-Fast)
  const appTitle = requireParam<string>(
    'appTitle',
    'APP_TITLE',
    fileConfig.appTitle,
    'Set APP_TITLE in .env or appTitle in modaka-hub.config.json.'
  );

  const appSubtitle = requireParam<string>(
    'appSubtitle',
    'APP_SUBTITLE',
    fileConfig.appSubtitle,
    'Set APP_SUBTITLE in .env or appSubtitle in modaka-hub.config.json.'
  );

  const badgeLabel = env.APP_BADGE_LABEL || fileConfig.badgeLabel;

  const soa = requireParam<string>(
    'soa',
    'DEFAULT_SOA',
    fileConfig.soa,
    'Set DEFAULT_SOA in .env or soa in modaka-hub.config.json.'
  );

  // 3. Validate Git & Local Storage (Fail-Fast)
  const gitLocalPath = requireParam<string>(
    'gitLocalPath',
    'GIT_LOCAL_PATH',
    fileConfig.gitLocalPath,
    'Set GIT_LOCAL_PATH in .env or gitLocalPath in modaka-hub.config.json.'
  );

  const gitRepoOwner = requireParam<string>(
    'gitRepoOwner',
    'GIT_REPO_OWNER',
    fileConfig.gitRepoOwner,
    'Set GIT_REPO_OWNER in .env or gitRepoOwner in modaka-hub.config.json.'
  );

  const gitRepoName = requireParam<string>(
    'gitRepoName',
    'GIT_REPO_NAME',
    fileConfig.gitRepoName,
    'Set GIT_REPO_NAME in .env or gitRepoName in modaka-hub.config.json.'
  );

  const gitBranch = requireParam<string>(
    'gitBranch',
    'GIT_BRANCH',
    fileConfig.gitBranch,
    'Set GIT_BRANCH in .env or gitBranch in modaka-hub.config.json.'
  );

  const gitModeRaw = requireParam<string>(
    'gitMode',
    'GIT_MODE',
    fileConfig.gitMode,
    'Set GIT_MODE in .env ("local" or "remote") or gitMode in modaka-hub.config.json.'
  );
  if (gitModeRaw !== 'local' && gitModeRaw !== 'remote') {
    throw new ConfigurationError(
      `[Bootstrap] Invalid GIT_MODE '${gitModeRaw}'. Must be explicitly declared as 'local' or 'remote'.`
    );
  }
  const gitMode = gitModeRaw as 'local' | 'remote';

  // 4. Validate Storage Subsystem (Fail-Fast)
  const storageTypeRaw = requireParam<string>(
    'storageType',
    'STORAGE_TYPE',
    fileConfig.storageType,
    'Set STORAGE_TYPE in .env ("local" or "s3") or storageType in modaka-hub.config.json.'
  );
  if (storageTypeRaw !== 'local' && storageTypeRaw !== 's3') {
    throw new ConfigurationError(
      `[Bootstrap] Invalid STORAGE_TYPE '${storageTypeRaw}'. Must be explicitly declared as 'local' or 's3'.`
    );
  }
  const storageType = storageTypeRaw as 'local' | 's3';

  let documentStoragePath: string;
  let s3Bucket: string | undefined;
  let s3Region: string | undefined;
  let s3Endpoint: string | undefined;
  let s3AccessKey: string | undefined;
  let s3SecretKey: string | undefined;

  if (storageType === 's3') {
    s3Bucket = requireParam<string>(
      's3Bucket',
      'S3_BUCKET',
      fileConfig.s3Bucket,
      'When STORAGE_TYPE is "s3", S3_BUCKET must be explicitly configured.'
    );
    s3Region = requireParam<string>(
      's3Region',
      'S3_REGION',
      fileConfig.s3Region,
      'When STORAGE_TYPE is "s3", S3_REGION must be explicitly configured.'
    );
    s3AccessKey = requireParam<string>(
      's3AccessKey',
      'S3_ACCESS_KEY',
      fileConfig.s3AccessKey,
      'When STORAGE_TYPE is "s3", S3_ACCESS_KEY must be explicitly configured.'
    );
    s3SecretKey = requireParam<string>(
      's3SecretKey',
      'S3_SECRET_KEY',
      fileConfig.s3SecretKey,
      'When STORAGE_TYPE is "s3", S3_SECRET_KEY must be explicitly configured.'
    );
    s3Endpoint = env.S3_ENDPOINT || fileConfig.s3Endpoint;
    documentStoragePath = env.DOCUMENT_STORAGE_PATH || fileConfig.documentStoragePath || path.join(gitLocalPath, 'assets');
  } else {
    documentStoragePath = requireParam<string>(
      'documentStoragePath',
      'DOCUMENT_STORAGE_PATH',
      fileConfig.documentStoragePath,
      'When STORAGE_TYPE is "local", DOCUMENT_STORAGE_PATH must be explicitly configured in .env or config file.'
    );
  }

  // 5. Validate Auth Allowed Domains (Fail-Fast)
  const rawDomains =
    env.ALLOWED_EMAIL_DOMAINS ||
    (fileConfig as any)?.auth?.allowedDomain ||
    fileConfig.allowedEmailDomains;

  if (!rawDomains || (Array.isArray(rawDomains) && rawDomains.length === 0)) {
    throw new ConfigurationError(
      `[Bootstrap] Missing required configuration parameter: 'allowedEmailDomains' (env: 'ALLOWED_EMAIL_DOMAINS'). Set to '*' to allow all domains, or comma-separated domains (e.g. '@brad.ag').`
    );
  }

  const allowedEmailDomains = (typeof rawDomains === 'string' ? rawDomains.split(',') : rawDomains)
    .map((d: string) => d.trim().toLowerCase())
    .filter(Boolean);

  // 6. Validate AI Provider & Credentials (Fail-Fast)
  const rawAiProvider = requireParam<string>(
    'aiProvider',
    'AI_PROVIDER',
    fileConfig.aiProvider,
    'Set AI_PROVIDER in .env ("gemini", "deepseek", "qwen", "openai") or aiProvider in modaka-hub.config.json.'
  ).toLowerCase();

  if (!['gemini', 'deepseek', 'qwen', 'openai'].includes(rawAiProvider)) {
    throw new ConfigurationError(
      `[Bootstrap] Invalid AI_PROVIDER '${rawAiProvider}'. Must be one of: 'gemini', 'deepseek', 'qwen', 'openai'.`
    );
  }
  const aiProvider = rawAiProvider as AiProviderType;

  let aiModel: string;
  let aiApiKey: string;
  let aiBaseUrl: string | undefined;

  if (aiProvider === 'gemini') {
    aiModel = requireParam<string>(
      'aiModel',
      'GEMINI_MODEL',
      fileConfig.aiModel,
      'When AI_PROVIDER is "gemini", GEMINI_MODEL must be explicitly configured.'
    );
    aiApiKey = requireParam<string>(
      'aiApiKey',
      'GEMINI_API_KEY',
      fileConfig.aiApiKey,
      'When AI_PROVIDER is "gemini", GEMINI_API_KEY must be explicitly configured.'
    );
  } else if (aiProvider === 'deepseek') {
    aiModel = requireParam<string>(
      'aiModel',
      'DEEPSEEK_MODEL',
      fileConfig.aiModel,
      'When AI_PROVIDER is "deepseek", DEEPSEEK_MODEL must be explicitly configured.'
    );
    aiApiKey = requireParam<string>(
      'aiApiKey',
      'DEEPSEEK_API_KEY',
      fileConfig.aiApiKey,
      'When AI_PROVIDER is "deepseek", DEEPSEEK_API_KEY must be explicitly configured.'
    );
    aiBaseUrl = requireParam<string>(
      'aiBaseUrl',
      'DEEPSEEK_BASE_URL',
      fileConfig.aiBaseUrl,
      'When AI_PROVIDER is "deepseek", DEEPSEEK_BASE_URL must be explicitly configured.'
    );
  } else if (aiProvider === 'qwen') {
    aiModel = requireParam<string>(
      'aiModel',
      'QWEN_MODEL',
      fileConfig.aiModel,
      'When AI_PROVIDER is "qwen", QWEN_MODEL must be explicitly configured.'
    );
    aiApiKey = requireParam<string>(
      'aiApiKey',
      'QWEN_API_KEY',
      fileConfig.aiApiKey,
      'When AI_PROVIDER is "qwen", QWEN_API_KEY must be explicitly configured.'
    );
    aiBaseUrl = requireParam<string>(
      'aiBaseUrl',
      'QWEN_BASE_URL',
      fileConfig.aiBaseUrl,
      'When AI_PROVIDER is "qwen", QWEN_BASE_URL must be explicitly configured.'
    );
  } else {
    // openai
    aiModel = requireParam<string>(
      'aiModel',
      'OPENAI_MODEL',
      fileConfig.aiModel,
      'When AI_PROVIDER is "openai", OPENAI_MODEL must be explicitly configured.'
    );
    aiApiKey = requireParam<string>(
      'aiApiKey',
      'OPENAI_API_KEY',
      fileConfig.aiApiKey,
      'When AI_PROVIDER is "openai", OPENAI_API_KEY must be explicitly configured.'
    );
    aiBaseUrl = requireParam<string>(
      'aiBaseUrl',
      'OPENAI_BASE_URL',
      fileConfig.aiBaseUrl,
      'When AI_PROVIDER is "openai", OPENAI_BASE_URL must be explicitly configured.'
    );
  }

  // 7. Validate Taxonomy Axes (Fail-Fast)
  const axes = fileConfig.axes;
  if (!Array.isArray(axes) || axes.length === 0) {
    throw new ConfigurationError(
      `[Bootstrap] Missing required configuration parameter: 'axes'. modaka-hub.config.json must declare a non-empty 'axes' array defining taxonomy dimensions.`
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
