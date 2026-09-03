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

  // 2. Standard Bradtech Curator (user-brad)
  {
    id: 'user-brad',
    name: 'Bradtech Curator',
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
          soa: 'readonly', // Immutable authority source for regular curateurs
          revision: 'readonly' // Revision managed centrally
        }
      }
    }
  },

  // Role alias for curator
  {
    id: 'curator',
    name: 'Curator',
    inherits: ['user-brad']
  },

  // 3. Bradtech Administrator (admin-brad)
  {
    id: 'admin-brad',
    name: 'Bradtech Administrator',
    inherits: ['user-brad'],
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

  // Role alias for admin
  {
    id: 'admin',
    name: 'Administrator',
    inherits: ['admin-brad']
  }
];

export const rbacEngine = new RbacPolicyEngine(modakaRoles);
