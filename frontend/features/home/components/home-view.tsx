"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Container } from "@/components/ui/container";
import { Header, Footer } from "@/components/layout";
import type { AgendaListItemResponse, MeetingListItemResponse, NoticeListItemResponse } from "@/lib/api-types";
import { useI18n } from "@/features/i18n";
import { apiFetch } from "@/lib/api-client";
import styles from "./home-view.module.css";

export function HomeView() {
  const { locale, t } = useI18n();
  const [latestAgenda, setLatestAgenda] = useState<AgendaListItemResponse[]>([]);
  const [latestNotices, setLatestNotices] = useState<NoticeListItemResponse[]>([]);
  const [latestMeeting, setLatestMeeting] = useState<MeetingListItemResponse | null>(null);

  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        const response = await apiFetch("/api/v1/agendas?sort_order=newest");
        if (response.ok) {
          const agendas = (await response.json()) as AgendaListItemResponse[];
          setLatestAgenda(agendas.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch agendas:", error);
      }
    };

    const fetchNotices = async () => {
      try {
        const response = await apiFetch("/api/v1/notices?limit=500");
        if (response.ok) {
          const notices = (await response.json()) as NoticeListItemResponse[];
          setLatestNotices(notices.slice(0, 4));
        }
      } catch (error) {
        console.error("Failed to fetch notices:", error);
      }
    };

    const fetchLatestMeeting = async () => {
      try {
        const response = await apiFetch("/api/v1/meetings?limit=1");
        if (!response.ok) {
          return;
        }
        const meetings = (await response.json()) as MeetingListItemResponse[];
        setLatestMeeting(meetings[0] ?? null);
      } catch (error) {
        console.error("Failed to fetch latest meeting:", error);
      }
    };

    fetchAgendas();
    fetchNotices();
    fetchLatestMeeting();
  }, []);

  const latestMeetingHref = latestMeeting
    ? latestMeeting.meeting_scale === "large"
      ? `/meeting-schedule/${latestMeeting.id}`
      : `/meeting-schedule/${latestMeeting.id}/small`
    : "/meeting-schedule";

  const latestMeetingDate = latestMeeting
    ? new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(latestMeeting.scheduled_at))
    : t("home.latestMeetingEmpty");

  const otherLinks = [
    { label: t("home.others.o2"), href: "/agenda" },
    { label: t("home.others.o3"), href: "/agenda" },
    { label: t("home.others.o4"), href: "/repository" },
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
            <p className={styles.heroEyebrow}>{t("home.latestMeetingLabel")}</p>
            <h2 className={styles.title}>{latestMeeting?.title ?? t("home.latestMeetingEmpty")}</h2>
            <p className={styles.description}>{`${t("home.latestMeetingDateLabel")}: ${latestMeetingDate}`}</p>
            <div className={styles.heroActions}>
              <Link href={latestMeetingHref} className={styles.meetingActionCard}>
                <span className={styles.meetingActionMain}>{t("home.latestMeetingActionTitle")}</span>
                <span className={styles.meetingActionSub}>{t("home.latestMeetingActionDescription")}</span>
                <span className={styles.meetingActionArrow} aria-hidden="true">
                  →
                </span>
              </Link>
            </div>
          </section>

          <section className={styles.contentGrid}>
            <article className={styles.agendaBlock}>
              <div className={styles.blockHead}>
                <h3 className={styles.blockTitle}>{t("home.agendaViewTitle")}</h3>
                <Link href="/agenda" className={styles.inlineAction}>
                  {t("home.viewAll")}
                </Link>
              </div>

              <div className={styles.subBlock}>
                <h4 className={styles.subTitle}>{t("home.latestAgendaTitle")}</h4>
                <ul className={styles.agendaList}>
                  {latestAgenda.map((agenda) => (
                    <li key={agenda.id} className={styles.agendaItem}>
                      <Link href={typeof agenda.id === "number" ? `/agenda/${agenda.id}` : "/agenda"} className={styles.agendaLink}>
                        <span className={styles.agendaTitle}>{agenda.title}</span>
                        <span className={styles.agendaMeta}>{agenda.meeting_title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            <aside className={styles.sideBlocks}>
              <article className={styles.noticeCard}>
                <div className={styles.blockHead}>
                  <h3 className={styles.cardTitle}>{t("home.noticeTitle")}</h3>
                  <Link href="/notice" className={styles.inlineAction}>
                    {t("home.viewAll")}
                  </Link>
                </div>
                <div className={styles.subBlock}>
                  <h4 className={styles.subTitle}>{t("home.latestNoticeTitle")}</h4>
                  <ul className={styles.agendaList}>
                    {latestNotices.map((notice) => (
                      <li key={notice.id} className={styles.agendaItem}>
                        <Link href={`/notice/${notice.id}`} className={styles.agendaLink}>
                          <span className={styles.agendaTitle}>{notice.title}</span>
                          <span className={styles.agendaMeta}>{`${notice.published_at ?? notice.created_at} ・ ${notice.category}`}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>{t("home.othersTitle")}</h3>
                <ul className={styles.guideList}>
                  {otherLinks.map((link) => (
                    <li key={link.label}>
                      <Link href={link.href} className={styles.guideLink}>
                        {link.label}
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
