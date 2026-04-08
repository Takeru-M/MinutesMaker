"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { AuthRole } from "@/features/auth/types/auth-role";
import { useI18n } from "@/features/i18n";
import { apiFetch } from "@/lib/api-client";
import { useAppDispatch } from "@/store/hooks";
import { loginSucceeded } from "@/store/slices/auth-slice";
import styles from "./login-view.module.css";

type LoginViewProps = {
  role: AuthRole;
};

export function LoginView({ role }: LoginViewProps) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { locale, setLocale, t } = useI18n();
  const isAdmin = role === "admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!username || !password) {
      setErrorMessage(t("login.errors.required"));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/api/v1/auth/login/${role}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setErrorMessage(t("login.errors.failed"));
        return;
      }

      const data: { message: string; role: string } = await response.json();
      setSuccessMessage(t("login.success", { role: data.role }));
      dispatch(loginSucceeded({ role, username }));
      
      // ログイン成功時にホームページへ遷移
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch {
      setErrorMessage(t("login.errors.connection"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <p className={styles.brand}>{t("common.appLabel")}</p>
          <div>
            <button type="button" onClick={() => setLocale("ja")} disabled={locale === "ja"}>
              JA
            </button>
            <button type="button" onClick={() => setLocale("en")} disabled={locale === "en"}>
              EN
            </button>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <span className={styles.badge}>{t(`login.role.${role}`)}</span>
          <h1 className={styles.title}>{t("login.title", { role: t(`login.role.${role}`) })}</h1>
          <p className={styles.description}>{t("login.description")}</p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor={`${role}-username`} className={styles.label}>
                {t("login.labels.username")}
              </label>
              <input
                id={`${role}-username`}
                name="username"
                type="text"
                className={styles.input}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor={`${role}-password`} className={styles.label}>
                {t("login.labels.password")}
              </label>
              <input
                id={`${role}-password`}
                name="password"
                type="password"
                className={styles.input}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            {errorMessage ? <p className={styles.errorMessage}>{errorMessage}</p> : null}
            {successMessage ? <p className={styles.successMessage}>{successMessage}</p> : null}

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? t("login.submitting") : t("login.submit")}
            </button>
          </form>

          <div className={styles.switchRow}>
            {isAdmin ? (
              <Link href="/login" className={styles.switchLink}>
                {t("login.switchToUser")}
              </Link>
            ) : (
              <Link href="/admin" className={styles.switchLink}>
                {t("login.switchToAdmin")}
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerText}>{t("common.footerText")}</p>
        </div>
      </footer>
    </div>
  );
}
