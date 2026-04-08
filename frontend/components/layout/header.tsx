"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Container } from "@/components/ui/container";
import { useI18n } from "@/features/i18n";
import { logout } from "@/lib/api-client";
import { useAppDispatch } from "@/store/hooks";
import { logoutSucceeded } from "@/store/slices/auth-slice";
import styles from "./header.module.css";

export function Header() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { locale, setLocale, t } = useI18n();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = [
    { label: t("header.nav.blockMeeting"), href: "#" },
    { label: t("header.nav.agendaSubmit"), href: "/agenda/submit" },
    { label: t("header.nav.notice"), href: "#" },
    { label: t("header.nav.repository"), href: "#" },
    { label: t("header.nav.guide"), href: "#" },
  ];

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      dispatch(logoutSucceeded());
      router.push("/login");
    } catch {
      console.error(t("header.logout"));
      setIsLoggingOut(false);
    }
  };

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.brandArea}>
            <p className={styles.brandLabel}>{t("common.appLabel")}</p>
            <h1 className={styles.brandTitle}>{t("common.appTitle")}</h1>
          </Link>
          <nav className={styles.nav} aria-label={t("header.ariaGlobalNav")}>
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className={styles.navItem}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className={styles.actions}>
            <div className={styles.langSwitch} aria-label={t("header.language")}>
              <button
                type="button"
                className={`${styles.langButton} ${locale === "ja" ? styles.langButtonActive : ""}`}
                onClick={() => setLocale("ja")}
              >
                {t("header.langJa")}
              </button>
              <button
                type="button"
                className={`${styles.langButton} ${locale === "en" ? styles.langButtonActive : ""}`}
                onClick={() => setLocale("en")}
              >
                {t("header.langEn")}
              </button>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={styles.logoutButton}
              aria-label={t("header.ariaLogout")}
            >
              {isLoggingOut ? t("header.loggingOut") : t("header.logout")}
            </button>
          </div>
        </div>
      </Container>
    </header>
  );
}
