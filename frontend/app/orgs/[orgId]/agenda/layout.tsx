"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type AgendaLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

export default function AgendaLayout({ children }: AgendaLayoutProps) {
  const canAccess = useCanInCurrentOrg("agenda.read");

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
