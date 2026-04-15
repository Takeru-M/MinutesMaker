"use client";

import { useCurrentOrgMembership } from "@/hooks/use-current-org";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/selectors/auth";

export default function OrgHomePage() {
  const membership = useCurrentOrgMembership();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);

  if (!isAuthenticated) {
    return <div>Not authenticated</div>;
  }

  if (!membership) {
    return <div>Loading organization...</div>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Organization: {membership.organization.name}</h1>
      <p>Role: {membership.role}</p>
      <p>Primary: {membership.is_primary ? "Yes" : "No"}</p>

      <nav style={{ marginTop: "2rem" }}>
        <ul>
          <li>
            <a href={`/orgs/${membership.organization.id}/agenda`}>Agenda</a>
          </li>
          <li>
            <a href={`/orgs/${membership.organization.id}/meeting-schedule`}>Meeting Schedule</a>
          </li>
          <li>
            <a href={`/orgs/${membership.organization.id}/admin`}>Admin</a>
          </li>
          <li>
            <a href={`/orgs/${membership.organization.id}/guide`}>Guide</a>
          </li>
        </ul>
      </nav>
    </div>
  );
}
