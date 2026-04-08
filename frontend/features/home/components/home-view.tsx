"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Container } from "@/components/ui/container";
import { logout } from "@/lib/api-client";
import styles from "./home-view.module.css";

const navItems = [
  "ホーム",
  "ブロック会議",
  "議案投稿",
  "お知らせ",
  "資料置き場",
  "利用方法",
];

const latestAgenda = [
  {
    title: "第1回 施設改善に関する議案",
    meta: "2026/04/07 ・ 総務",
  },
  {
    title: "新年度オリエンテーション運用議案",
    meta: "2026/04/05 ・ 情報委員会",
  },
  {
    title: "備品購入フロー見直し議案",
    meta: "2026/04/03 ・ 会計",
  },
  {
    title: "防災訓練実施計画議案",
    meta: "2026/04/01 ・ 監察",
  },
];

const guideLinks = [
  "資料登録の手順",
  "議案作成テンプレート",
  "権限と公開範囲",
  "更新履歴の確認方法",
];

const relatedSystems = [
  { label: "熊野寮ホームページ", href: "https://kumano-ryo.com/" },
  {
    label: "寮生向け内部ページ",
    href: "https://www.kumano-ryo.com/internal/index.html",
  },
  { label: "pokke 荷物の管理はこちらから", href: "https://pokke.kumano-ryo.com/" },
  { label: "mics 入寮面接/新入寮生の管理はこちらから", href: "https://mics.kumano-ryo.com/" },
  { label: "inspection 監察委員会の業務はこちらから", href: "https://inspection.kumano-ryo.com/" },
  { label: "it-section 情報委員会の業務はこちらから", href: "https://kumapticon.kumano-ryo.com/" },
];

export function HomeView() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      // ログアウト成功後、ログインページへ遷移
      router.push("/login");
    } catch {
      console.error("ログアウトに失敗しました");
      setIsLoggingOut(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.bgGlowTop} aria-hidden="true" />
      <div className={styles.bgGlowBottom} aria-hidden="true" />
      <header className={styles.header}>
        <Container>
          <div className={styles.headerInner}>
            <div className={styles.brandArea}>
              <p className={styles.brandLabel}>資料共有システム</p>
              <h1 className={styles.brandTitle}>Kumano Docs Portal</h1>
            </div>
            <nav className={styles.nav} aria-label="グローバルナビゲーション">
              {navItems.map((item) => (
                <Link key={item} href="#" className={styles.navItem}>
                  {item}
                </Link>
              ))}
            </nav>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={styles.logoutButton}
              aria-label="ログアウト"
            >
              {isLoggingOut ? "ログアウト中..." : "ログアウト"}
            </button>
          </div>
        </Container>
      </header>

      <Container>
        <main className={styles.main}>
          <div className={styles.brandArea}>
            <p className={styles.screenLabel}>資料共有システム</p>
          </div>
          <section className={styles.hero}>
            <p className={styles.badge}>TOP PAGE</p>
            <h2 className={styles.title}>必要な資料に、速く、迷わずアクセス。</h2>
            <p className={styles.description}>
              参考サイト内の主要コンテンツを、読みやすさ重視のレイアウトへ再構成しています。
              機能実装前の画面モックとして、ナビゲーション、議案閲覧、新着一覧、関連システム導線を搭載しています。
            </p>
          </section>

          <section className={styles.contentGrid}>
            <article className={styles.agendaBlock}>
              <div className={styles.blockHead}>
                <h3 className={styles.blockTitle}>議案の閲覧</h3>
                <Link href="#" className={styles.inlineAction}>
                  すべて見る
                </Link>
              </div>
              <p className={styles.blockDescription}>
                最新の議案や検討項目を確認できます。詳細ページは後続実装で接続予定です。
              </p>

              <div className={styles.subBlock}>
                <h4 className={styles.subTitle}>新着議案一覧</h4>
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
                <h3 className={styles.cardTitle}>資料検索</h3>
                <p className={styles.cardText}>カテゴリ・作成日・担当で資料を絞り込みます。</p>
              </article>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>お知らせ</h3>
                <p className={styles.cardText}>運用変更やメンテナンス情報をここに表示します。</p>
              </article>
              <article className={styles.card}>
                <h3 className={styles.cardTitle}>運用ガイド</h3>
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
            <h3 className={styles.linksTitle}>関連システム</h3>
            <div className={styles.linksGrid}>
              {relatedSystems.map((item) => (
                <Link key={item.href} href={item.href} target="_blank" rel="noreferrer" className={styles.linkItem}>
                  {item.label}
                </Link>
              ))}
            </div>
          </section>

          <section className={styles.healthSection}>
            <Link href="/api/health" className={styles.healthLink}>
              Health API を確認
            </Link>
          </section>
        </main>
      </Container>

      <footer className={styles.footer}>
        <Container>
          <div className={styles.footerInner}>
            <p>© 2019-2026 Kumano Dormitory IT Section</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
