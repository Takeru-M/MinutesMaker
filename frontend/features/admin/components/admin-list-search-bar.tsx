"use client";

import type { FormEvent } from "react";

import styles from "./admin-list-search-bar.module.css";

type AdminListSearchBarProps = {
  title: string;
  description?: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onReset: () => void;
  submitLabel?: string;
  resetLabel?: string;
};

export function AdminListSearchBar({
  title,
  description,
  value,
  placeholder,
  onChange,
  onSubmit,
  onReset,
  submitLabel = "検索",
  resetLabel = "クリア",
}: AdminListSearchBarProps) {
  return (
    <section className={styles.searchBar} aria-label={title}>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>{title}</h3>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          type="search"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <div className={styles.actions}>
          <button type="submit" className={styles.button}>
            {submitLabel}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onReset}>
            {resetLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
