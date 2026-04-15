"use client";

import React from "react";
import { useOrgIdSync } from "@/hooks/use-current-org";
import { useAppSelector } from "@/store/hooks";
import { selectMemberships, selectCurrentOrgId } from "@/store/selectors/auth";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type OrgLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

/**
 * Layout for org-specific routes
 *
 * This layout:
 * 1. Syncs orgId from URL params to Redux state
 * 2. Validates that the user has membership in this org
 * 3. Renders forbidden page if user doesn't have access
 * 4. Renders children if everything is OK
 */
export default function OrgLayout({ children, params }: OrgLayoutProps) {
  // Sync orgId from URL to Redux state
  useOrgIdSync();

  // Get current state
  const currentOrgId = useAppSelector(selectCurrentOrgId);
  const memberships = useAppSelector(selectMemberships);

  // Parse orgId from params
  const orgId = parseInt(params.orgId, 10);

  // Check if orgId is valid
  if (isNaN(orgId)) {
    return <ForbiddenPage message="Invalid organization ID" locale="en" />;
  }

  // Check if user has membership
  const hasMembership = memberships.some((m) => m.organization.id === orgId);

  if (!hasMembership) {
    return <ForbiddenPage message="You do not have access to this organization" locale="en" />;
  }

  // Check if current org is synced (if not, might be still loading)
  if (currentOrgId === null) {
    // In theory this shouldn't happen if useOrgIdSync worked,
    // but add a safety check
    return <div>Loading...</div>;
  }

  return <>{children}</>;
}
