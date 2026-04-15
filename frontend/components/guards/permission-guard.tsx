"use client";

import React from "react";
import { useCanInCurrentOrg, useCanAnyInCurrentOrg } from "@/hooks/use-permissions";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated, selectCurrentOrgId } from "@/store/selectors/auth";
import { Permission } from "@/lib/permissions";

type GuardProps = {
  /**
   * Single permission to check
   */
  permission?: Permission;
  /**
   * Multiple permissions (all must be true)
   */
  permissions?: Permission[];
  /**
   * Multiple permissions (at least one must be true)
   */
  anyPermission?: Permission[];
  /**
   * Content to render if user has permission
   */
  children: React.ReactNode;
  /**
   * Fallback content to render if user doesn't have permission
   */
  fallback?: React.ReactNode;
  /**
   * Whether to require organization context
   * If true, renders fallback if no currentOrgId is set
   */
  requireOrg?: boolean;
};

/**
 * Component to conditionally render content based on permissions
 *
 * Usage:
 * ```jsx
 * <PermissionGuard permission="meeting.create">
 *   <CreateMeetingButton />
 * </PermissionGuard>
 *
 * <PermissionGuard permissions={["agenda.read", "agenda.create"]} fallback={<div>No access</div>}>
 *   <AgendaPanel />
 * </PermissionGuard>
 *
 * <PermissionGuard anyPermission={["meeting.create", "meeting.update"]}>
 *   <MeetingToolbar />
 * </PermissionGuard>
 * ```
 */
export function PermissionGuard({
  permission,
  permissions,
  anyPermission,
  children,
  fallback,
  requireOrg = false,
}: GuardProps): React.ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentOrgId = useAppSelector(selectCurrentOrgId);
  const canWithSingle = permission ? useCanInCurrentOrg(permission) : true;
  const canWithAll = permissions ? permissions.every((p) => useCanInCurrentOrg(p)) : true;
  const canWithAny = anyPermission ? useCanAnyInCurrentOrg(...anyPermission) : true;

  // Check authentication
  if (!isAuthenticated) {
    return fallback || null;
  }

  // Check org requirement
  if (requireOrg && !currentOrgId) {
    return fallback || null;
  }

  // Check permissions
  const hasPermission = canWithSingle && canWithAll && canWithAny;

  if (!hasPermission) {
    return fallback || null;
  }

  return children;
}

type ForbiddenPageProps = {
  message?: string;
  locale?: "ja" | "en";
};

/**
 * Simple 403 Forbidden page component
 */
export function ForbiddenPage({ message, locale = "ja" }: ForbiddenPageProps) {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>{locale === "ja" ? "アクセスが拒否されました" : "Access Denied"}</h1>
      <p>
        {message ||
          (locale === "ja"
            ? "このページにアクセスする権限がありません。"
            : "You do not have permission to access this page.")}
      </p>
      <a href="/">{locale === "ja" ? "ホームに戻る" : "Go Home"}</a>
    </div>
  );
}

type AuthGateProps = {
  /**
   * Content to show while loading auth state
   */
  loadingFallback?: React.ReactNode;
  /**
   * Content to show if not authenticated
   */
  unauthorizedFallback?: React.ReactNode;
  /**
   * Content to show if authenticated but org context is missing
   */
  noOrgFallback?: React.ReactNode;
  /**
   * Require organization context (if false, shows children even without org)
   */
  requireOrg?: boolean;
  /**
   * Content to render
   */
  children: React.ReactNode;
};

/**
 * Component to control visibility based on authentication state
 *
 * Useful for wrapping entire page or major sections
 */
export function AuthGate({
  loadingFallback,
  unauthorizedFallback,
  noOrgFallback,
  requireOrg = true,
  children,
}: AuthGateProps): React.ReactNode {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const currentOrgId = useAppSelector(selectCurrentOrgId);

  // Show loading state if checking auth
  if (isAuthenticated === false) {
    return unauthorizedFallback || null;
  }

  // Check org requirement
  if (requireOrg && !currentOrgId) {
    return noOrgFallback || null;
  }

  return children;
}
