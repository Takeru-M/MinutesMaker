"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setCurrentOrg } from "@/store/slices/auth-slice";
import { selectMemberships } from "@/store/selectors/auth";
import { useParams } from "next/navigation";

/**
 * Hook to sync current org ID from URL params to Redux state
 * Expected URL pattern: /orgs/[orgId]/...
 * 
 * This hook should be called in a layout or page component that has access to [orgId] dynamic segment
 */
export function useOrgIdSync() {
  const dispatch = useAppDispatch();
  const params = useParams();
  const memberships = useAppSelector(selectMemberships);

  useEffect(() => {
    if (!params) {
      return;
    }

    const orgId = params.orgId;
    if (!orgId) {
      // No orgId in URL, clear current org
      dispatch(setCurrentOrg(null));
      return;
    }

    // Parse orgId from URL (could be string or array)
    const orgIdNum = typeof orgId === "string" ? parseInt(orgId, 10) : parseInt(orgId[0], 10);

    if (isNaN(orgIdNum)) {
      console.warn("Invalid orgId in URL:", orgId);
      dispatch(setCurrentOrg(null));
      return;
    }

    // Verify that the user has access to this org
    const hasMembership = memberships.some((m) => m.organization.id === orgIdNum);

    if (!hasMembership) {
      console.warn("User does not have membership in org:", orgIdNum);
      // Don't dispatch - let the page handle the 403
      return;
    }

    // Sync orgId to Redux state
    dispatch(setCurrentOrg(orgIdNum));
  }, [params, memberships, dispatch]);
}

/**
 * Hook to get current org ID from state
 * Returns null if no org is selected
 */
export function useCurrentOrgId(): number | null {
  return useAppSelector((state) => state.auth.currentOrgId);
}

/**
 * Hook to get current org membership details
 * Returns null if no org is selected or user has no membership
 */
export function useCurrentOrgMembership() {
  return useAppSelector((state) => {
    const orgId = state.auth.currentOrgId;
    if (!orgId) {
      return null;
    }

    return state.auth.memberships.find((m) => m.organization.id === orgId) || null;
  });
}
