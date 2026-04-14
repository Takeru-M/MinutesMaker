import type { ReactNode } from "react";

import styles from "./page-hero.module.css";

type PageHeroProps = {
  badge: string;
  title: string;
  description: string;
  children?: ReactNode;
};

export function PageHero({ badge, title, description, children }: PageHeroProps) {
  return (
    <section className={styles.hero}>
      <p className={styles.badge}>{badge}</p>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.description}>{description}</p>
      {children ? <div className={styles.extra}>{children}</div> : null}
    </section>
  );
}
