"use client";

import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Header, Footer } from "@/components/layout";
import { useI18n } from "@/features/i18n";
import styles from "./home-view.module.css";

export function HomeView() {
  const { t } = useI18n();

  const latestAgenda = [
    { title: t("home.latestAgenda.a1Title"), meta: t("home.latestAgenda.a1Meta") },
    { title: t("home.latestAgenda.a2Title"), meta: t("home.latestAgenda.a2Meta") },
    { title: t("home.latestAgenda.a3Title"), meta: t("home.latestAgenda.a3Meta") },
    { title: t("home.latestAgenda.a4Title"), meta: t("home.latestAgenda.a4Meta") },
  ];

  const guideLinks = [
    t("home.guides.g1"),
    t("home.guides.g2"),
    t("home.guides.g3"),
    t("home.guides.g4"),
  ];

  const relatedSystems = [
    { label: t("home.relatedSystems.s1"), href: "https://kumano-ryo.com/" },
    { label: t("home.relatedSystems.s2"), href: "https://www.kumano-ryo.com/internal/index.html" },
    { label: t("home.relatedSystems.s3"), href: "https://pokke.kumano-ryo.com/" },
    { label: t("home.relatedSystems.s4"), href: "https://mics.kumano-ryo.com/" },
    { label: t("home.relatedSystems.s5"), href: "https://inspection.kumano-ryo.com/" },
    { label: t("home.relatedSystems.s6"), href: "https://kumapticon.kumano-ryo.com/" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.bgGlowTop} aria-hidden="true" />
      <div className={styles.bgGlowBottom} aria-hidden="true" />
      <Header />

      <Container>
        <main className={styles.main}>
          <div className={styles.brandArea}>
            <p className={styles.screenLabel}>{t("common.appLabel")}</p>
          </div>
          <section className={styles.hero}>
            <p className={styles.badge}>{t("home.topPage")}</p>
            <h2 className={styles.title}>{t("home.title")}</h2>
            <p className={styles.description}>{t("home.description")}</p>
          </section>

          <section className={styles.contentGrid}>
            <article className={styles.agendaBlock}>
              <div className={styles.blockHead}>
                <h3 className={styles.blockTitle}>{t("home.agendaViewTitle")}</h3>
                <Link href="#" className={styles.inlineAction}>
                  {t("home.viewAll")}
                </Link>
              </div>
              <p className={styles.blockDescription}>
                {t("home.agendaViewDescription")}
              </p>

              <div className={styles.subBlock}>
                <h4 className={styles.subTitle}>{t("home.latestAgendaTitle")}</h4>
                <ul className={styles.agendaList}>
                  {latestAgenda.map((agenda) => (
                    <li key={agenda.title} className={styles.agendaItem}>
                      <Link href="#" className={styles.agendaLink}>
                        {agenda.title}
                      </Link>
                      <p className={styles.agendaMeta}>{agenda.meta}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className={styles.sideBlocks}>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>{t("home.searchTitle")}</h3>
                <p className={styles.cardText}>{t("home.searchDescription")}</p>
              </article>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>{t("home.noticeTitle")}</h3>
                <p className={styles.cardText}>{t("home.noticeDescription")}</p>
              </article>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>{t("home.guideTitle")}</h3>
                <ul className={styles.guideList}>
                  {guideLinks.map((guide) => (
                    <li key={guide}>
                      <Link href="#" className={styles.guideLink}>
                        {guide}
                      </Link>
                    </li>
                  ))}
                </ul>
              </article>
            </aside>
          </section>

          <section className={styles.linksSection}>
            <h3 className={styles.linksTitle}>{t("home.linksTitle")}</h3>
            <div className={styles.linksGrid}>
              {relatedSystems.map((item) => (
                <Link key={item.href} href={item.href} target="_blank" rel="noreferrer" className={styles.linkItem}>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        </main>
      </Container>

      <Footer />
    </div>
  );
}
