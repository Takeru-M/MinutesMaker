"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type GuideLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

export default function GuideLayout({ children }: GuideLayoutProps) {
  const canAccess = useCanInCurrentOrg("guide.read");

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
