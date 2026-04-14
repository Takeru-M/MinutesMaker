"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import { useAppSelector } from "@/store/hooks";
import styles from "./admin-feature-list-view.module.css";

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

export function AdminFeatureListView() {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace("/login?redirect=%2Fadmin%2Ffeatures");
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.role, router]);

  if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
    return null;
  }

  const featureKeys = [
    "accountPermission",
    "meetingOperations",
    "notice",
    "repository",
    "guide",
    "audit",
    "aiOperations",
  ] as const;

  const featureHrefMap: Partial<Record<(typeof featureKeys)[number], string>> = {
    accountPermission: "/admin/features/account-permission",
    meetingOperations: "/admin/features/meeting-operations",
    notice: "/admin/features/notice",
    repository: "/admin/features/repository",
    guide: "/admin/features/guide",
    audit: "/admin/features/audit",
    aiOperations: "/admin/features/ai-operations",
  };

  return (
    <div className={styles.page}>
      <Header />
      <Container>
        <main className={styles.main}>
          <PageHero
            badge={t("adminFeatureList.badge")}
            title={t("adminFeatureList.title")}
            description={t("adminFeatureList.description")}
          >
            <p className={styles.notice}>{t("adminFeatureList.restrictedNotice")}</p>
          </PageHero>

          <section className={styles.grid}>
            {featureKeys.map((featureKey) => {
              const href = featureHrefMap[featureKey];

              return (
                <article key={featureKey} className={styles.card}>
                  <h2 className={styles.cardTitle}>{t(`adminFeatureList.items.${featureKey}.title`)}</h2>
                  <p className={styles.cardDescription}>{t(`adminFeatureList.items.${featureKey}.description`)}</p>
                  {href ? (
                    <Link href={href} className={styles.cardActionLink}>
                      {t("adminFeatureList.openPage")}
                    </Link>
                  ) : (
                    <p className={styles.cardMeta}>{t("adminFeatureList.comingSoon")}</p>
                  )}
                </article>
              );
            })}
          </section>
        </main>
      </Container>
      <Footer />
    </div>
  );
}
