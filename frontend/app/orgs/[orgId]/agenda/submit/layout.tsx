"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type AgendaSubmitLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

export default function AgendaSubmitLayout({ children }: AgendaSubmitLayoutProps) {
  const canAccess = useCanInCurrentOrg("agenda.create");

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
