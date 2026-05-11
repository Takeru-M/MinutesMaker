"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type RepositoryLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

export default function RepositoryLayout({ children }: RepositoryLayoutProps) {
  const canAccess = useCanInCurrentOrg("repository.read");

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
