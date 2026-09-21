import React from 'react';
import { MantineProvider } from '@mantine/core';
import { CurationWorkbench } from './CurationWorkbench';

export interface CurationWorkbenchAppProps {
  initialUser?: {
    name?: string;
    email?: string;
    roles?: string[];
    isAdmin?: boolean;
  } | null;
}

/**
 * Top-level React Island Root for Modaka Hub.
 * Guarantees that MantineProvider wraps the component tree at the absolute root of the island boundary.
 */
export function CurationWorkbenchApp(props: CurationWorkbenchAppProps) {
  return (
    <MantineProvider defaultColorScheme="dark">
      <CurationWorkbench {...props} />
    </MantineProvider>
  );
}

export default CurationWorkbenchApp;
