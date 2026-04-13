import { ReactNode } from "react";

import styles from "./content-list-view.module.css";

type ContentListItemCardProps = {
  meta: string;
  title: ReactNode;
  summary?: string;
  trailing?: ReactNode;
};

export function ContentListItemCard({ meta, title, summary, trailing }: ContentListItemCardProps) {
  return (
    <article className={styles.item}>
      <div className={styles.itemContent}>
        <p className={styles.itemMeta}>{meta}</p>
        <h4 className={styles.itemTitle}>{title}</h4>
        {summary ? <p className={styles.itemSummary}>{summary}</p> : null}
      </div>
      {trailing ? <div className={styles.itemTrailing}>{trailing}</div> : null}
    </article>
  );
}
