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
  gitMode: string;
  documentStoragePath: string;
  storageType: 'local' | 's3';
  s3Bucket: string;
  s3Region: string;
  s3Endpoint?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  allowedEmailDomains: string[];
  betaAccessCodes: string[];
  aiProvider: AiProviderType;
  aiModel?: string;
  aiApiKey?: string;
  aiBaseUrl?: string;
  axes: AxisDefinition[];
}

const DEFAULT_AXES: AxisDefinition[] = [
  { id: 'concepts', label: 'Concepts & Notions Clés', folder: 'concepts', color: 'blue' },
  { id: 'guides', label: 'Guides & Itinéraires', folder: 'guides', color: 'green' },
  { id: 'references', label: 'Références & Standards', folder: 'references', color: 'amber' }
];

export function loadConfig(): ModakaConfig {
  const env = process.env;

  // 1. Resolve local git path
  const gitLocalPath =
    env.GIT_LOCAL_PATH ||
    path.resolve(process.cwd(), 'data/okf');

  // 2. Check for optional JSON config file in git local path or project root
  let fileConfig: Partial<ModakaConfig> = {};
  const configCandidatePaths = [
    path.join(gitLocalPath, 'modaka-hub.config.json'),
    path.resolve(process.cwd(), 'modaka-hub.config.json'),
    path.resolve(process.cwd(), 'src/config/admin_settings.json')
  ];

  for (const candidate of configCandidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        const raw = fs.readFileSync(candidate, 'utf-8');
        const parsed = JSON.parse(raw);
        fileConfig = { ...fileConfig, ...parsed };
        break;
      } catch {
        // ignore parse error and proceed to fallbacks
      }
    }
  }

  // 3. Resolve Allowed Email Domains
  const rawDomains =
    env.ALLOWED_EMAIL_DOMAINS ||
    (fileConfig as any)?.auth?.allowedDomain ||
    '';
  const allowedEmailDomains = rawDomains
    .split(',')
    .map((d: string) => d.trim().toLowerCase())
    .filter(Boolean);

  // 4. Resolve Beta Access Codes
  const rawBetaCodes =
    env.BETA_ACCESS_CODES ||
    (fileConfig as any)?.auth?.betaAccessCodes ||
    '';
  const betaAccessCodes = (typeof rawBetaCodes === 'string' ? rawBetaCodes.split(',') : (Array.isArray(rawBetaCodes) ? rawBetaCodes : []))
    .map((c: string) => c.trim().toUpperCase())
    .filter(Boolean);

  // 5. Resolve AI Provider and Credentials
  const aiProvider = ((env.AI_PROVIDER || env.LLM_PROVIDER || fileConfig.aiProvider || 'gemini') as string).toLowerCase() as AiProviderType;

  let aiModel: string | undefined;
  let aiApiKey: string | undefined;
  let aiBaseUrl: string | undefined;

  if (aiProvider === 'deepseek') {
    aiModel = env.DEEPSEEK_MODEL || 'deepseek-chat';
    aiApiKey = env.DEEPSEEK_API_KEY;
    aiBaseUrl = env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';
  } else if (aiProvider === 'qwen') {
    aiModel = env.QWEN_MODEL || 'qwen-plus';
    aiApiKey = env.QWEN_API_KEY;
    aiBaseUrl = env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
  } else if (aiProvider === 'openai') {
    aiModel = env.OPENAI_MODEL || 'gpt-4o';
    aiApiKey = env.OPENAI_API_KEY;
    aiBaseUrl = env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  } else {
    // gemini
    aiModel = env.GEMINI_MODEL || 'gemini-2.5-flash';
    aiApiKey = env.GEMINI_API_KEY;
  }

  // 6. Assemble configuration
  return {
    appTitle: env.APP_TITLE || fileConfig.appTitle || 'Modaka-Hub',
    appSubtitle: env.APP_SUBTITLE || fileConfig.appSubtitle || 'Centre d’autorité & structuration OKF v0.1',
    badgeLabel: env.APP_BADGE_LABEL || fileConfig.badgeLabel,
    soa: env.DEFAULT_SOA || fileConfig.soa || 'modaka/authority',
    gitLocalPath,
    gitRepoOwner: env.GIT_REPO_OWNER || fileConfig.gitRepoOwner || 'modaka',
    gitRepoName: env.GIT_REPO_NAME || fileConfig.gitRepoName || 'knowledge',
    gitBranch: env.GIT_BRANCH || fileConfig.gitBranch || 'develop',
    gitMode: env.GIT_MODE || fileConfig.gitMode || 'local',
    documentStoragePath:
      env.DOCUMENT_STORAGE_PATH ||
      fileConfig.documentStoragePath ||
      path.join(gitLocalPath, 'assets'),
    storageType: (env.STORAGE_TYPE as 'local' | 's3') || (env.S3_ACCESS_KEY ? 's3' : 'local'),
    s3Bucket: env.S3_BUCKET || fileConfig.s3Bucket || 'modaka-knowledge',
    s3Region: env.S3_REGION || fileConfig.s3Region || 'us-east-1',
    s3Endpoint: env.S3_ENDPOINT || fileConfig.s3Endpoint,
    s3AccessKey: env.S3_ACCESS_KEY || fileConfig.s3AccessKey,
    s3SecretKey: env.S3_SECRET_KEY || fileConfig.s3SecretKey,
    allowedEmailDomains,
    betaAccessCodes,
    aiProvider,
    aiModel,
    aiApiKey,
    aiBaseUrl,
    axes: fileConfig.axes && fileConfig.axes.length > 0 ? fileConfig.axes : DEFAULT_AXES
  };
}

let _cachedConfig: ModakaConfig | null = null;

export function reloadConfig(): ModakaConfig {
  _cachedConfig = loadConfig();
  return _cachedConfig;
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
 * If allowedEmailDomains is empty or contains '*', all domains are allowed.
 */
export function isEmailDomainAllowed(email: string): boolean {
  if (!email) return false;
  const lower = email.toLowerCase().trim();
  const domains = config.allowedEmailDomains;

  if (domains.length === 0 || domains.includes('*')) {
    return true;
  }

  return domains.some(domain => {
    const d = domain.startsWith('@') ? domain : `@${domain}`;
    return lower.endsWith(d);
  });
}

/**
 * Validates a submitted beta access code.
 */
export function isBetaAccessCodeValid(code: string): boolean {
  if (!code) return false;
  const clean = code.trim().toUpperCase();
  return config.betaAccessCodes.includes(clean);
}
