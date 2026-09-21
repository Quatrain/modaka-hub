import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { config as appConfig } from '../../../lib/config';

function maskKey(val?: string): string {
  if (!val) return '';
  if (val.length <= 8) return '••••••••';
  return `${val.substring(0, 4)}••••••••${val.substring(val.length - 4)}`;
}

export const GET: APIRoute = async ({ locals }) => {
  const userRoles = locals.user?.roles || [];
  const isAdmin = userRoles.includes('admin');

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden', message: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    return new Response(
      JSON.stringify({ error: 'ConfigurationError', message: 'Missing required environment variable: "PUBLIC_SUPABASE_URL"' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const config = {
    llm: {
      provider: appConfig.aiProvider,
      model: appConfig.aiModel,
      apiKey: maskKey(appConfig.aiApiKey),
      hasApiKey: Boolean(appConfig.aiApiKey)
    },
    storage: {
      type: appConfig.storageType,
      documentStoragePath: appConfig.documentStoragePath,
      s3Bucket: appConfig.s3Bucket,
      s3Region: appConfig.s3Region,
      s3Endpoint: appConfig.s3Endpoint || '',
      s3AccessKey: maskKey(appConfig.s3AccessKey),
      hasSecretKey: Boolean(appConfig.s3SecretKey)
    },
    git: {
      localPath: appConfig.gitLocalPath,
      repoOwner: appConfig.gitRepoOwner,
      repoName: appConfig.gitRepoName,
      branch: appConfig.gitBranch,
      mode: appConfig.gitMode
    },
    auth: {
      supabaseUrl,
      allowedDomain: appConfig.allowedEmailDomains.join(', ')
    }
  };

  return new Response(JSON.stringify(config), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: APIRoute = async ({ request, locals }) => {
  const userRoles = locals.user?.roles || [];
  const isAdmin = userRoles.includes('admin');

  if (!isAdmin) {
    return new Response(
      JSON.stringify({ error: 'Forbidden', message: 'Admin role required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const updates = await request.json();

    // Update in-memory process.env if new plain values are supplied
    if (updates.llm?.model) process.env.GEMINI_MODEL = updates.llm.model;
    if (updates.llm?.apiKey && !updates.llm.apiKey.includes('••••')) {
      process.env.GEMINI_API_KEY = updates.llm.apiKey;
    }

    if (updates.storage?.type) process.env.STORAGE_TYPE = updates.storage.type;
    if (updates.storage?.documentStoragePath) process.env.DOCUMENT_STORAGE_PATH = updates.storage.documentStoragePath;
    if (updates.storage?.s3Bucket) process.env.S3_BUCKET = updates.storage.s3Bucket;
    if (updates.storage?.s3Region) process.env.S3_REGION = updates.storage.s3Region;
    if (updates.storage?.s3Endpoint) process.env.S3_ENDPOINT = updates.storage.s3Endpoint;
    if (updates.storage?.s3AccessKey && !updates.storage.s3AccessKey.includes('••••')) {
      process.env.S3_ACCESS_KEY = updates.storage.s3AccessKey;
    }
    if (updates.storage?.s3SecretKey && !updates.storage.s3SecretKey.includes('••••')) {
      process.env.S3_SECRET_KEY = updates.storage.s3SecretKey;
    }

    if (updates.git?.localPath) process.env.GIT_LOCAL_PATH = updates.git.localPath;
    if (updates.git?.branch) process.env.GIT_BRANCH = updates.git.branch;

    // Persist to user settings file
    const settingsPath = path.resolve(process.cwd(), 'src/config/admin_settings.json');
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(
      settingsPath,
      JSON.stringify(
        {
          updatedAt: new Date().toISOString(),
          updatedBy: locals.user?.email,
          ...updates
        },
        null,
        2
      )
    );

    return new Response(JSON.stringify({ success: true, message: 'Settings saved' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
