"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Container } from "@/components/ui/container";
import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/features/i18n";
import { AgendaSubmitForm } from "@/features/agenda/components/agenda-submit-form";
import { useAppSelector } from "@/store/hooks";
import styles from "./agenda-submit-view.module.css";

const CANNOT_SUBMIT_AGENDA_ROLES = new Set(["guest_user", "auditor", "org_user", "user"]);

export function AgendaSubmitView() {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace("/login?redirect=%2Fagenda%2Fsubmit");
      return;
    }

    if (auth.role && CANNOT_SUBMIT_AGENDA_ROLES.has(auth.role)) {
      router.replace("/login?notice=agenda-submit&redirect=%2Fagenda%2Fsubmit");
    }
  }, [auth.isAuthenticated, auth.role, router]);

  if (!auth.isAuthenticated || (auth.role && CANNOT_SUBMIT_AGENDA_ROLES.has(auth.role))) {
    return null;
  }

  return (
    <div className={styles.page}>
      <div className={styles.bgGlowTop} aria-hidden="true" />
      <div className={styles.bgGlowBottom} aria-hidden="true" />
      <Header />

      <Container>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href="/" className={styles.breadcrumbLink}>
              {t("agendaSubmitView.home")}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{t("agendaSubmitView.current")}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{t("agendaSubmitView.badge")}</p>
            <h2 className={styles.title}>{t("agendaSubmitView.title")}</h2>
            <p className={styles.description}>{t("agendaSubmitView.description")}</p>
          </section>

          <AgendaSubmitForm />
        </main>
      </Container>

      <Footer />
    </div>
  );
}
