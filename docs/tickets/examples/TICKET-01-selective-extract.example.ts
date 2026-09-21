/**
 * TICKET-01 — Selective Forks Engine & Git Provisioning for Client Instances
 * https://github.com/Quatrain/modaka-hub/issues/1
 *
 * Starter skeleton for src/pages/api/extract.ts (Astro API route), implementing
 * the two pieces the ticket specifies:
 *   1. Context Matching Algorithm — filter content/ by the
 *      target multi-axial profile (soils, climates, lat/alt, itineraries).
 *   2. Git Sub-Tree Provisioning Pipeline — materialize the matches into a
 *      dedicated bare repo with upstream lineage metadata.
 *
 * This is also the critical-path item for the whole ecosystem: modaka's
 * TICKET-03 (bi-directional sync) and downstream client verticals both assume this
 * endpoint exists — nothing downstream of modaka-hub can get real data
 * without it. See the roadmap doc for sequencing.
 *
 * NOT wired to the real OKF reader — walking `content/` here with a plain fs
 * scan rather than importing OKFBackendAdapter, since its exact read API
 * wasn't available to check while drafting this. Swap `loadCorpus()` for a
 * call into @quatrain/okf's OKFBackendAdapter once confirmed; the matching
 * and provisioning logic below is independent of how the frontmatter is read.
 */

import type { APIRoute } from 'astro'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const execFileAsync = promisify(execFile)

// ---------------------------------------------------------------------------
// 1. Context Matching Algorithm
// ---------------------------------------------------------------------------

export interface FarmProfile {
   farmTenantId: string
   soils: string[]
   climates: string[]
   itineraries: string[]
   latitude?: number
   longitude?: number
   altitude?: number
}

interface OkfDocument {
   filePath: string
   relPath: string
   frontmatter: Record<string, any>
}

async function loadCorpus(contentRoot: string): Promise<OkfDocument[]> {
   const docs: OkfDocument[] = []

   async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
         const full = path.join(dir, entry.name)
         if (entry.isDirectory()) {
            await walk(full)
         } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md') {
            const raw = await fs.readFile(full, 'utf-8')
            const { data } = matter(raw)
            docs.push({ filePath: full, relPath: path.relative(contentRoot, full), frontmatter: data })
         }
      }
   }

   await walk(contentRoot)
   return docs
}

/**
 * A document matches a farm profile if it shares at least one soil AND one
 * climate tag with the profile (a viticulture-biologique itinerary on
 * argilo-calcaire soil is useless to a sableux/semi-aride farm), OR the
 * itinerary tag matches directly regardless of soil/climate (technique
 * guides that are pedoclimate-agnostic, e.g. "faca-roulage" equipment specs).
 * Adjust this rule with real curator feedback — it's a starting heuristic,
 * not a settled algorithm.
 */
function matchesProfile(doc: OkfDocument, profile: FarmProfile): boolean {
   const soils: string[] = doc.frontmatter.soils ?? []
   const climates: string[] = doc.frontmatter.climates ?? []
   const itineraries: string[] = doc.frontmatter.itineraries ?? []

   const soilMatch = soils.some((s) => profile.soils.includes(s))
   const climateMatch = climates.some((c) => profile.climates.includes(c))
   const itineraryMatch = itineraries.some((i) => profile.itineraries.includes(i))

   if (itineraryMatch && (soils.length === 0 || climates.length === 0)) return true
   return soilMatch && climateMatch
}

// ---------------------------------------------------------------------------
// 2. Git Sub-Tree Provisioning Pipeline
// ---------------------------------------------------------------------------

async function provisionFarmRepo(
   farmsRoot: string,
   profile: FarmProfile,
   matched: OkfDocument[],
   upstreamRevision: string
): Promise<{ repoPath: string; fileCount: number }> {
   const repoPath = path.join(farmsRoot, `${profile.farmTenantId}.git`)

   // 1. bare repo as the durable artifact, plus a scratch worktree to build
   //    the initial commit — bare repos can't be written to directly.
   await execFileAsync('git', ['init', '--bare', repoPath])

   const worktree = path.join(farmsRoot, `.worktree-${profile.farmTenantId}`)
   await fs.rm(worktree, { recursive: true, force: true })
   await fs.mkdir(worktree, { recursive: true })
   await execFileAsync('git', ['init', worktree])

   // 2. materialize matched files only, preserving their relative structure
   for (const doc of matched) {
      const dest = path.join(worktree, doc.relPath)
      await fs.mkdir(path.dirname(dest), { recursive: true })
      await fs.copyFile(doc.filePath, dest)
   }

   // 3. lineage metadata — a dedicated file rather than editing every
   //    frontmatter block, so provisioning is a pure copy + one extra file
   const lineagePath = path.join(worktree, '.modaka-hub-lineage.yml')
   await fs.writeFile(
      lineagePath,
      [
         `upstream_soa: quatrain/authority`,
         `upstream_revision: ${upstreamRevision}`,
         `farm_tenant_id: ${profile.farmTenantId}`,
         `provisioned_at: ${new Date().toISOString()}`,
      ].join('\n') + '\n'
   )

   await execFileAsync('git', ['-C', worktree, 'add', '-A'])
   await execFileAsync('git', [
      '-C', worktree, 'commit',
      '-m', `chore: initial selective fork for ${profile.farmTenantId} (rev ${upstreamRevision})`,
   ])
   await execFileAsync('git', ['-C', worktree, 'remote', 'add', 'origin', repoPath])
   await execFileAsync('git', ['-C', worktree, 'push', 'origin', 'HEAD:main'])

   // clean up the scratch worktree — the bare repo is the artifact
   await fs.rm(worktree, { recursive: true, force: true })

   return { repoPath, fileCount: matched.length }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST: APIRoute = async ({ request }) => {
   const body = (await request.json()) as FarmProfile

   if (!body.farmTenantId || !Array.isArray(body.soils) || !Array.isArray(body.climates)) {
      return new Response(
         JSON.stringify({ error: 'farmTenantId, soils[] and climates[] are required' }),
         { status: 400 }
      )
   }

   // TODO: auth guard — only the `Extractor` role from AGENTS.md's RBAC
   // section may call this endpoint (see docs/tickets/TICKET-04 for the
   // formal RBAC transition model this should plug into).

   const contentRoot = process.env.OKF_STORAGE_PATH ?? path.resolve('authority/content')
   const farmsRoot = process.env.FARMS_REPO_ROOT ?? path.resolve('farms')
   const upstreamRevision = process.env.SOA_REVISION ?? 'unknown'

   const corpus = await loadCorpus(contentRoot)
   const matched = corpus.filter((doc) => matchesProfile(doc, body))

   if (matched.length === 0) {
      return new Response(
         JSON.stringify({ error: 'No matching documents for this farm profile', profile: body }),
         { status: 422 }
      )
   }

   const { repoPath, fileCount } = await provisionFarmRepo(farmsRoot, body, matched, upstreamRevision)

   return new Response(
      JSON.stringify({
         farmTenantId: body.farmTenantId,
         repoPath,
         fileCount,
         upstreamRevision,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
   )
}

/**
 * Acceptance criteria from the ticket, and where this skeleton stands:
 * - [~] /api/extract returns exact multi-axial matches as an OKF-compliant
 *       bundle — matching logic is here, but is a first-pass heuristic
 *       (see matchesProfile's comment) that needs curator validation.
 * - [~] Automated generation of standalone Git repos with sanitized history
 *       — repos are generated fresh (single commit, no upstream history
 *       leakage) but "sanitized" for secrets/credentials isn't checked yet.
 * - [ ] Zero credential leaks during downstream provisioning — not
 *       addressed here; before this ships, audit that no .env, API keys or
 *       admin-only frontmatter fields (curatedBy emails?) end up in the
 *       farm's public repo.
 */
