"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { apiFetch } from "@/lib/api-client";
import styles from "./login-view.module.css";

type LoginRole = "user" | "admin";

type LoginViewProps = {
  role: LoginRole;
};

const roleLabel: Record<LoginRole, string> = {
  user: "一般ユーザ",
  admin: "管理者",
};

export function LoginView({ role }: LoginViewProps) {
  const router = useRouter();
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
      setErrorMessage("ユーザ名とパスワードを入力してください。");
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
        setErrorMessage("ログインに失敗しました。認証情報を確認してください。");
        return;
      }

      const data: { message: string; role: string } = await response.json();
      setSuccessMessage(`ログインに成功しました（${data.role}）。`);
      
      // ログイン成功時にホームページへ遷移
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch {
      setErrorMessage("サーバーに接続できませんでした。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <p className={styles.brand}>資料共有システム</p>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.card}>
          <span className={styles.badge}>{roleLabel[role]}ログイン</span>
          <h1 className={styles.title}>ようこそ、{roleLabel[role]}ページへ</h1>
          <p className={styles.description}>
            ユーザ名とパスワードを入力してください。
          </p>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label htmlFor={`${role}-username`} className={styles.label}>
                ユーザ名
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
                パスワード
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
              {isSubmitting ? "認証中..." : "ログイン"}
            </button>
          </form>

          <div className={styles.switchRow}>
            {isAdmin ? (
              <Link href="/login" className={styles.switchLink}>
                一般ユーザはこちら
              </Link>
            ) : (
              <Link href="/admin" className={styles.switchLink}>
                サイト管理者はこちら
              </Link>
            )}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.footerText}>© 2019-2026 Kumano Dormitory IT Section</p>
        </div>
      </footer>
    </div>
  );
}
