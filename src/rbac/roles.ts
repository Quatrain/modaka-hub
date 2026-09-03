import { RbacPolicyEngine, type RoleDefinition } from '@quatrain/auth-rbac';

/**
 * Modaka-Hub declarative role definitions and permissions.
 *
 * Enforces fine-grained route access and Field-Level Security (FLS)
 * across anonymous visitors, Bradtech curators, and administrators.
 */
export const modakaRoles: RoleDefinition[] = [
  // 1. Anonymous Public Visitor (unauthenticated)
  {
    id: 'anonymous',
    name: 'Anonymous Visitor',
    routes: [
      { pattern: '/login', actions: ['*'], access: 'allow' },
      { pattern: '/api/auth/**', actions: ['*'], access: 'allow' },
      { pattern: '/_astro/**', actions: ['*'], access: 'allow' },
      { pattern: '/favicon.*', actions: ['*'], access: 'allow' },
      { pattern: '/assets/**', actions: ['*'], access: 'allow' },
      { pattern: '/**', actions: ['*'], access: 'deny' }
    ]
  },

  // 2. Canonical Curator Role
  {
    id: 'curator',
    name: 'Content Curator',
    inherits: ['anonymous'],
    routes: [
      { pattern: '/', actions: ['READ'], access: 'allow' },
      { pattern: '/api/auth/me', actions: ['READ'], access: 'allow' },
      { pattern: '/api/taxonomies', actions: ['READ'], access: 'allow' },
      { pattern: '/api/curate', actions: ['READ', 'WRITE'], access: 'allow' },
      { pattern: '/api/extract', actions: ['READ', 'WRITE'], access: 'allow' },
      { pattern: '/api/telemetry', actions: ['READ', 'WRITE'], access: 'allow' },
      { pattern: '/api/upload', actions: ['WRITE'], access: 'allow' },
      { pattern: '/api/queue/**', actions: ['READ', 'WRITE'], access: 'allow' },
      { pattern: '/api/git/status', actions: ['READ'], access: 'allow' },
      { pattern: '/api/git/commit', actions: ['WRITE'], access: 'allow' }
    ],
    entities: {
      document: {
        defaultMode: 'readwrite',
        fields: {
          soa: 'readonly', // Immutable authority source for standard curators
          revision: 'readonly' // Revision managed centrally
        }
      }
    }
  },

  // Downstream role alias for Bradtech deployment
  {
    id: 'user-brad',
    name: 'Bradtech Curator',
    inherits: ['curator']
  },

  // 3. Canonical Administrator Role
  {
    id: 'admin',
    name: 'System Administrator',
    inherits: ['curator'],
    routes: [
      { pattern: '/**', actions: ['*'], access: 'allow' }
    ],
    entities: {
      document: {
        defaultMode: 'readwrite',
        fields: {
          soa: 'readwrite',
          revision: 'readwrite'
        }
      }
    }
  },

  // Downstream role alias for Bradtech deployment
  {
    id: 'admin-brad',
    name: 'Bradtech Administrator',
    inherits: ['admin']
  }
];

export const rbacEngine = new RbacPolicyEngine(modakaRoles);
