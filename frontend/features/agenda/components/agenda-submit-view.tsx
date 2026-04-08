"use client";

import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/features/i18n";
import { AgendaSubmitForm } from "@/features/agenda/components/agenda-submit-form";
import styles from "./agenda-submit-view.module.css";

export function AgendaSubmitView() {
  const { t } = useI18n();

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
