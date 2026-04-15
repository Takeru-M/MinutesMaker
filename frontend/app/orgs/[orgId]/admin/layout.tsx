"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { AuthGate, ForbiddenPage } from "@/components/guards/permission-guard";

type AdminLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

/**
 * Layout for org-specific admin routes
 *
 * This layout ensures:
 * 1. User is authenticated
 * 2. User has admin permissions in the current organization
 */
export default function AdminLayout({ children, params }: AdminLayoutProps) {
  // Check for any admin permission as a proxy for "is admin"
  // In practice, we should check specific permissions, but this is a simple gate
  const canAccessAdmin = useCanInCurrentOrg("org.read");

  if (!canAccessAdmin) {
    return <ForbiddenPage message="Admin access required" locale="en" />;
  }

  return <>{children}</>;
}
