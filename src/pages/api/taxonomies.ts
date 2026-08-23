import type { APIRoute } from 'astro';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { initBackend } from '../../lib/backend';
import { slugify } from '../../lib/utils';
import { gitSync } from '../../lib/git-sync';

export const GET: APIRoute = async () => {
  await initBackend();
  const gitLocalPath = process.env.GIT_LOCAL_PATH || '/Users/crapougnax/CODE/BRAD2026/world-agronomy';
  const contentDir = path.join(gitLocalPath, 'content');

  try {
    await fs.mkdir(contentDir, { recursive: true });
    const entries = await fs.readdir(contentDir, { withFileTypes: true });
    const thematics = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const thematicSlug = entry.name;
        const indexPath = path.join(contentDir, thematicSlug, 'index.md');
        let label = thematicSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        let description = '';
        let count = 0;

        try {
          const indexContent = await fs.readFile(indexPath, 'utf-8');
          if (indexContent.startsWith('---')) {
            const parts = indexContent.split('---');
            if (parts.length >= 3) {
              const meta = parseYaml(parts[1]);
              if (meta?.title) label = meta.title;
              if (meta?.description) description = meta.description;
            }
          }
        } catch {}

        try {
          const files = await fs.readdir(path.join(contentDir, thematicSlug));
          count = files.filter(f => f.endsWith('.md') && f !== 'index.md').length;
        } catch {}

        thematics.push({
          id: thematicSlug,
          label,
          description,
          count
        });
      }
    }

    return new Response(JSON.stringify({ thematics }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  await initBackend();
  const gitLocalPath = process.env.GIT_LOCAL_PATH || '/Users/crapougnax/CODE/BRAD2026/world-agronomy';
  const body = await request.json();
  const label = body.label?.trim();
  const description = body.description?.trim() || '';

  if (!label) {
    return new Response(JSON.stringify({ error: 'Label is required' }), { status: 400 });
  }

  const slug = slugify(label);
  const thematicDir = path.join(gitLocalPath, 'content', slug);

  try {
    await fs.mkdir(thematicDir, { recursive: true });
    const indexPath = path.join(thematicDir, 'index.md');

    const indexContent = `---
type: category
title: "${label.replace(/"/g, '\\"')}"
description: "${description.replace(/"/g, '\\"')}"
tags:
  - ${slug}
  - agronomy
timestamp: "${new Date().toISOString()}"
---

# ${label}

${description || `Référentiel thématique pour ${label}.`}
`;

    await fs.writeFile(indexPath, indexContent, 'utf-8');
    await gitSync.stageAndCommit(`feat(thematic): create thematic category "${label}"`, [
      path.join('content', slug, 'index.md')
    ]);

    return new Response(JSON.stringify({ success: true, thematic: { id: slug, label, description, count: 0 } }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
