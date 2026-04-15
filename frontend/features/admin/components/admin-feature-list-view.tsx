"use client";

import Link from "next/link";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import { useAppSelector } from "@/store/hooks";
import { ForbiddenPage } from "@/components/guards/permission-guard";
import { useCanInCurrentOrg } from "@/hooks/use-permissions";
import styles from "./admin-feature-list-view.module.css";

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

export function AdminFeatureListView() {
  const { t } = useI18n();
  const auth = useAppSelector((state) => state.auth);
  const canAccessInCurrentOrg = useCanInCurrentOrg("org.read");
  const hasAdminRole = auth.role ? ADMIN_ROLES.has(auth.role) : false;
  const canAccessAdmin = hasAdminRole || canAccessInCurrentOrg;

  if (!canAccessAdmin) {
    return <ForbiddenPage message="Admin access required" locale="en" />;
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
    accountPermission: "/admin/features/account-permission/user-management",
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
                    <div className={styles.breadcrumb}>
                      <Link href="/" className={styles.breadcrumbLink}>
                        {t("adminFeatureCommon.home")}
                      </Link>
                      <span className={styles.breadcrumbCurrent}>/ {t("adminFeatureCommon.featureList")}</span>
                    </div>

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
                  {href ? (
                    <Link href={href} className={styles.cardLinkWrapper}>
                      <h2 className={styles.cardTitle}>{t(`adminFeatureList.items.${featureKey}.title`)}</h2>
                      <p className={styles.cardDescription}>{t(`adminFeatureList.items.${featureKey}.description`)}</p>
                    </Link>
                  ) : (
                    <>
                      <h2 className={styles.cardTitle}>{t(`adminFeatureList.items.${featureKey}.title`)}</h2>
                      <p className={styles.cardDescription}>{t(`adminFeatureList.items.${featureKey}.description`)}</p>
                      <p className={styles.cardMeta}>{t("adminFeatureList.comingSoon")}</p>
                    </>
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
