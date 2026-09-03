/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user?: {
      id: string;
      email: string;
      name?: string;
      roles: string[];
      customClaims?: Record<string, any>;
      subjectType?: 'human' | 'agent' | 'service';
    };
    rbac?: import('@quatrain/auth-rbac').RbacRequestContext;
  }
}
