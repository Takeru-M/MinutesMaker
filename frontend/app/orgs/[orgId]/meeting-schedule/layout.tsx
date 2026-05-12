"use client";

import React from "react";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import { ForbiddenPage } from "@/components/guards/permission-guard";

type MeetingScheduleLayoutProps = {
  children: React.ReactNode;
  params: {
    orgId: string;
  };
};

export default function MeetingScheduleLayout({ children }: MeetingScheduleLayoutProps) {
  const canAccess = useCanInCurrentOrg("meeting.read_list");

  if (!canAccess) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}
