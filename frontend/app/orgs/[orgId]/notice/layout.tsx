"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type NoticeLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

export default function NoticeLayout({ children }: NoticeLayoutProps) {
  const canAccess = useCanInCurrentOrg("notice.read");

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
