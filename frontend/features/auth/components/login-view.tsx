"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { useI18n } from "@/features/i18n";
import type { AuthRole, LoginResponse } from "@/lib/api-types";
import { apiFetch, getCurrentUser } from "@/lib/api-client";
import { useAppDispatch } from "@/store/hooks";
import { loginSucceeded } from "@/store/slices/auth-slice";
import styles from "./login-view.module.css";

export function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { locale, setLocale, t } = useI18n();
  const redirectTarget = searchParams.get("redirect");
  const agendaSubmitNotice = searchParams.get("notice") === "agenda-submit";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loginWithRole = async (role: AuthRole) => {
    return apiFetch(`/api/v1/auth/login/${role}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });
  };

  /**
   * Determine post-login redirect URL based on active organization
   */
  const getPostLoginRedirect = (activeOrgId: number | null): string => {
    if (redirectTarget) {
      return redirectTarget;
    }

    if (agendaSubmitNotice) {
      return activeOrgId ? `/orgs/${activeOrgId}/agenda/submit` : "/agenda/submit";
    }

    if (activeOrgId) {
      return `/orgs/${activeOrgId}`;
    }

    return "/";
  };

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
      const userResponse = await loginWithRole("user");
      const response = userResponse.status === 403 ? await loginWithRole("admin") : userResponse;

      if (!response.ok) {
        setErrorMessage(t("login.errors.failed"));
        return;
      }

      const loginData = (await response.json()) as LoginResponse;
      const currentUser = await getCurrentUser();
      setSuccessMessage(t("login.success", { role: loginData.role }));

      dispatch(
        loginSucceeded({
          role: loginData.role,
          username,
          memberships: currentUser?.memberships ?? [],
          activeOrganizationId: loginData.active_organization_id ?? null,
        }),
      );

      const redirectUrl = getPostLoginRedirect(loginData.active_organization_id ?? null);
      router.replace(redirectUrl);
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
          <h1 className={styles.title}>{t("login.title")}</h1>
          <p className={styles.description}>{t("login.description")}</p>
          {agendaSubmitNotice ? (
            <p className={styles.noticeMessage}>
              {locale === "ja"
                ? "議案投稿には個人アカウントでのログインが必要です。個人アカウントでログインしてください。"
                : "Submitting agendas requires an individual account. Please sign in with your individual account."}
            </p>
          ) : null}

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor="login-username" className={styles.label}>
                {t("login.labels.username")}
              </label>
              <input
                id="login-username"
                name="username"
                type="text"
                className={styles.input}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password" className={styles.label}>
                {t("login.labels.password")}
              </label>
              <input
                id="login-password"
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
