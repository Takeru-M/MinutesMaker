"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import { useAppSelector } from "@/store/hooks";
import styles from "./admin-feature-page-shell.module.css";

type AdminFeaturePageItem = {
  title: string;
  description: string;
};

type AdminFeaturePageShellProps = {
  redirectPath: string;
  badge: string;
  title: string;
  description: string;
  sectionTitle: string;
  items: AdminFeaturePageItem[];
};

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

export function AdminFeaturePageShell({
  redirectPath,
  badge,
  title,
  description,
  sectionTitle,
  items,
}: AdminFeaturePageShellProps) {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.role, redirectPath, router]);

  if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
    return null;
  }

  return (
    <div className={styles.page}>
      <Header />
      <Container>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href="/admin/features" className={styles.breadcrumbLink}>
              {t("adminFeatureCommon.featureList")}
            </Link>
            <span className={styles.breadcrumbCurrent}>/ {title}</span>
          </div>

          <PageHero badge={badge} title={title} description={description}>
            <p className={styles.notice}>{t("adminFeatureCommon.restrictedNotice")}</p>
          </PageHero>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>{sectionTitle}</h2>
            <div className={styles.grid}>
              {items.map((item) => (
                <article key={item.title} className={styles.card}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <p className={styles.cardDescription}>{item.description}</p>
                </article>
              ))}
            </div>
          </section>
        </main>
      </Container>
      <Footer />
    </div>
  );
}
