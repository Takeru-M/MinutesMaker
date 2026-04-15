"use client";

import { useEffect, useState } from "react";

import { getCurrentUser } from "@/lib/api-client";
import { useAppDispatch } from "@/store/hooks";
import { loginSucceeded, logoutSucceeded } from "@/store/slices/auth-slice";

type AuthBootstrapProps = {
  children: React.ReactNode;
};

export function AuthBootstrap({ children }: AuthBootstrapProps) {
  const dispatch = useAppDispatch();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!isMounted) {
          return;
        }

        if (currentUser) {
          dispatch(
            loginSucceeded({
              role: currentUser.role,
              username: currentUser.username,
              memberships: currentUser.memberships,
              activeOrganizationId: currentUser.active_organization_id ?? null,
            }),
          );
        } else {
          dispatch(logoutSucceeded());
        }
      } catch {
        if (isMounted) {
          dispatch(logoutSucceeded());
        }
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [dispatch]);

  if (!isReady) {
    return null;
  }

  return <>{children}</>;
}
