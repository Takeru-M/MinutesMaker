"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import styles from "./content-list-view.module.css";

type ContentSearchField = {
  name: string;
  label: string;
  type: "date" | "text";
  placeholder?: string;
};

type ContentSearchFormProps = {
  fields: ContentSearchField[];
  initialValues: Record<string, string>;
  submitLabel: string;
  resetLabel: string;
  buildHref: (values: Record<string, string>) => string;
  resetHref: string;
};

export function ContentSearchForm({
  fields,
  initialValues,
  submitLabel,
  resetLabel,
  buildHref,
  resetHref,
}: ContentSearchFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useEffect(() => {
    setValues(initialValues);
  }, [initialValues]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    router.push(buildHref(values));
  };

  const handleReset = () => {
    setValues(initialValues);
    router.push(resetHref);
  };

  return (
    <form onSubmit={handleSubmit} className={styles.searchForm}>
      {fields.map((field) => (
        <div key={field.name} className={styles.searchField}>
          <label htmlFor={field.name} className={styles.searchLabel}>
            {field.label}
          </label>
          <input
            id={field.name}
            type={field.type}
            value={values[field.name] ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            placeholder={field.placeholder}
            className={styles.searchInput}
          />
        </div>
      ))}

      <div className={styles.searchActions}>
        <button type="submit" className={styles.searchPrimaryButton}>
          {submitLabel}
        </button>
        <button type="button" className={styles.searchSecondaryButton} onClick={handleReset}>
          {resetLabel}
        </button>
      </div>
    </form>
  );
}
