"use client";

import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import styles from "./footer.module.css";

export function Footer() {
  const { t } = useI18n();

  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.footerInner}>
          <p>{t("common.footerText")}</p>
        </div>
      </Container>
    </footer>
  );
}
