"use client";

import Link from "next/link";
import { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { Footer, Header } from "@/components/layout";
import styles from "./content-list-view.module.css";

type ContentListPageItem = {
  id: string;
  rendered: ReactNode;
};

type ContentListViewProps = {
  homeLabel: string;
  homeHref: string;
  currentLabel: string;
  badge: string;
  title: string;
  description: string;
  searchTitle?: string;
  sectionTitle: string;
  totalItems: number;
  countLabel: string;
  searchForm?: ReactNode;
  emptyState: string;
  pageItems: ContentListPageItem[];
  currentPage: number;
  pageNumbers: number[];
  paginationAriaLabel: string;
  buildPageHref: (page: number) => string;
};

export function ContentListView({
  homeLabel,
  homeHref,
  currentLabel,
  badge,
  title,
  description,
  searchTitle,
  sectionTitle,
  totalItems,
  countLabel,
  searchForm,
  emptyState,
  pageItems,
  currentPage,
  pageNumbers,
  paginationAriaLabel,
  buildPageHref,
}: ContentListViewProps) {
  return (
    <div className={styles.page}>
      <div className={styles.bgGlowTop} aria-hidden="true" />
      <div className={styles.bgGlowBottom} aria-hidden="true" />
      <Header />

      <Container>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href={homeHref} className={styles.breadcrumbLink}>
              {homeLabel}
            </Link>
            <span className={styles.breadcrumbSeparator}>/</span>
            <span className={styles.breadcrumbCurrent}>{currentLabel}</span>
          </div>

          <section className={styles.hero}>
            <p className={styles.badge}>{badge}</p>
            <h2 className={styles.title}>{title}</h2>
            <p className={styles.description}>{description}</p>
          </section>

          {searchTitle && searchForm ? (
            <section className={styles.searchSection}>
              <h3 className={styles.searchTitle}>{searchTitle}</h3>
              {searchForm}
            </section>
          ) : null}

          <section className={styles.listSection}>
            <div className={styles.sectionHeader}>
              <h3 className={styles.sectionTitle}>{sectionTitle}</h3>
              <p className={styles.sectionMeta}>{countLabel.replace("{{count}}", String(totalItems))}</p>
            </div>

            {pageItems.length === 0 ? (
              <div className={styles.emptyState}>{emptyState}</div>
            ) : (
              <>
                <ul className={styles.list}>
                  {pageItems.map((item) => (
                    <li key={item.id} className={styles.listItem}>
                      {item.rendered}
                    </li>
                  ))}
                </ul>

                <nav className={styles.pagination} aria-label={paginationAriaLabel}>
                  {pageNumbers.map((page) => (
                    <Link
                      key={page}
                      href={buildPageHref(page)}
                      className={`${styles.paginationButton} ${currentPage === page ? styles.paginationButtonActive : ""}`}
                      aria-current={currentPage === page ? "page" : undefined}
                    >
                      {page}
                    </Link>
                  ))}
                </nav>
              </>
            )}
          </section>
        </main>
      </Container>

      <Footer />
    </div>
  );
}
