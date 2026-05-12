"use client";

import { usePathname } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { selectIsAuthenticated } from "@/store/selectors/auth";
import { AssistantFloatingWidget } from "@/features/assistant";

const EXCLUDED_PATHS = ["/login"];

export function AssistantGlobal() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const pathname = usePathname();

  if (!isAuthenticated || EXCLUDED_PATHS.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return <AssistantFloatingWidget />;
}
