"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  const navItems = useMemo(
    () => [
      { label: t("header.nav.meetingSchedule"), href: "/meeting-schedule" },
      { label: t("header.nav.agendaSubmit"), href: "/agenda/submit" },
      { label: t("header.nav.notice"), href: "/notice" },
      { label: t("header.nav.repository"), href: "#" },
      { label: t("header.nav.guide"), href: "#" },
    ],
    [t],
  );

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

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

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();

    router.push(query ? `/search?q=${encodeURIComponent(query)}` : "/search");
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
          <form className={styles.searchForm} onSubmit={handleSearchSubmit} role="search">
            <label className={styles.searchLabel} htmlFor="header-search-input">
              {t("header.searchPlaceholder")}
            </label>
            <input
              id="header-search-input"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t("header.searchPlaceholder")}
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton} aria-label={t("header.searchButton")}> 
              {t("header.searchButton")}
            </button>
          </form>

          <div className={styles.menuRoot} ref={menuRef}>
            <button
              type="button"
              className={styles.gearButton}
              aria-label={t("header.settings")}
              aria-expanded={isMenuOpen}
              onClick={() => setIsMenuOpen((current) => !current)}
            >
              ⚙
            </button>

            {isMenuOpen ? (
              <div className={styles.menuPanel} role="menu" aria-label={t("header.settings")}>
                <div className={styles.menuSection}>
                  <p className={styles.menuHeading}>{t("header.language")}</p>
                  <div className={styles.langSwitch}>
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
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className={styles.menuLogoutButton}
                  aria-label={t("header.ariaLogout")}
                >
                  {isLoggingOut ? t("header.loggingOut") : t("header.logout")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </Container>
    </header>
  );
}
