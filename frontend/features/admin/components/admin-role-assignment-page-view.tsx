"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { AdminListSearchBar } from "./admin-list-search-bar";
import { useI18n } from "@/features/i18n";
import { formatJaDateTime } from "@/lib/date-formatter";
import { ADMIN_ROLES } from "@/lib/permissions";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import styles from "./admin-account-management-page-view.module.css";

type RoleAssignmentItem = {
  id: number;
  username: string;
  currentRole: string;
  assignmentScope: string;
  updatedAt: string;
};

const INITIAL_ASSIGNMENTS: RoleAssignmentItem[] = [
  {
    id: 1,
    username: "admin01",
    currentRole: "platform_admin",
    assignmentScope: "全体",
    updatedAt: "2026-04-12T09:30:00+09:00",
  },
  {
    id: 2,
    username: "org-user-01",
    currentRole: "org_user",
    assignmentScope: "運営部",
    updatedAt: "2026-04-11T15:20:00+09:00",
  },
  {
    id: 3,
    username: "auditor-team",
    currentRole: "auditor",
    assignmentScope: "監査室",
    updatedAt: "2026-04-10T10:00:00+09:00",
  },
];

function ManagementShell({
  redirectPath,
  badge,
  title,
  description,
  children,
}: {
  redirectPath: string;
  badge: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const auth = useAppSelector((state) => state.auth);
  const { t } = useI18n();

  useEffect(() => {
    if (!auth.isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
      return;
    }

    if (auth.role && !ADMIN_ROLES.has(auth.role)) {
      router.replace("/");
    }
  }, [auth.isAuthenticated, auth.role, redirectPath, router]);

  if (!auth.isAuthenticated || !auth.role || !ADMIN_ROLES.has(auth.role)) {
    return null;
  }

  return (
    <div className={styles.page}>
      <Header />
      <Container>
        <main className={styles.main}>
          <div className={styles.breadcrumb}>
            <Link href="/admin/features" className={styles.breadcrumbLink}>
              {t("adminFeatureCommon.featureList")}
            </Link>
            <span className={styles.breadcrumbCurrent}>/ {title}</span>
          </div>

          <PageHero badge={badge} title={title} description={description} />

          {children}
        </main>
      </Container>
      <Footer />
    </div>
  );
}

export function AdminRoleAssignmentPageView() {
  const [assignments, setAssignments] = useState<RoleAssignmentItem[]>(INITIAL_ASSIGNMENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<RoleAssignmentItem, "id" | "updatedAt">>({
    username: "",
    currentRole: "org_user",
    assignmentScope: "",
  });

  const filteredAssignments = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return assignments;
    }

    return assignments.filter((assignment) => {
      const haystack = [assignment.username, assignment.currentRole, assignment.assignmentScope].join(" ").toLowerCase();
      return haystack.includes(normalized);
    });
  }, [assignments, searchQuery]);

  const resetForm = () => {
    setSelectedId(null);
    setForm({
      username: "",
      currentRole: "org_user",
      assignmentScope: "",
    });
  };

  const startEdit = (assignment: RoleAssignmentItem) => {
    setSelectedId(assignment.id);
    setForm({
      username: assignment.username,
      currentRole: assignment.currentRole,
      assignmentScope: assignment.assignmentScope,
    });
    setStatusMessage(null);
  };

  const saveAssignment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selectedId === null) {
      const next: RoleAssignmentItem = {
        id: assignments.length > 0 ? Math.max(...assignments.map((assignment) => assignment.id)) + 1 : 1,
        ...form,
        updatedAt: new Date().toISOString(),
      };
      setAssignments((prev) => [next, ...prev]);
      setStatusMessage("ロール割り当てを登録しました。");
    } else {
      setAssignments((prev) =>
        prev.map((assignment) =>
          assignment.id === selectedId
            ? {
                ...assignment,
                ...form,
                updatedAt: new Date().toISOString(),
              }
            : assignment,
        ),
      );
      setStatusMessage("ロール割り当てを更新しました。");
    }

    resetForm();
  };

  const deleteAssignment = (id: number) => {
    if (!window.confirm("このロール割り当てを削除しますか？")) {
      return;
    }

    setAssignments((prev) => prev.filter((assignment) => assignment.id !== id));
    if (selectedId === id) {
      resetForm();
    }
    setStatusMessage("ロール割り当てを削除しました。");
  };

  const adminCount = filteredAssignments.filter((assignment) => assignment.currentRole.includes("admin")).length;

  return (
    <ManagementShell
      redirectPath="/admin/features/account-permission/role-assignment"
      badge="ADMIN ROLE ASSIGNMENT"
      title="ロール割り当て"
      description="ロールの検索、割り当て状況の確認、更新を行います。"
    >
      {statusMessage ? <p className={styles.message}>{statusMessage}</p> : null}

      <section className={styles.grid}>
        <article className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>ロール割り当て一覧と編集</h2>
              <p className={styles.sectionMeta}>ユーザごとのロールと適用範囲を管理します。</p>
            </div>
            <div className={styles.buttonRow}>
              <span className={styles.statusBadge}>{`全${filteredAssignments.length}件`}</span>
              <span className={`${styles.statusBadge} ${styles.badgePublished}`}>{`管理者系${adminCount}件`}</span>
            </div>
          </div>

          <div className={styles.panel}>
            <AdminListSearchBar
              title="ロール割り当て検索"
              description="ユーザ名、ロール、適用範囲で絞り込みます。"
              value={searchQuery}
              placeholder="例: org_admin, 監査室"
              onChange={setSearchQuery}
              onSubmit={(event) => event.preventDefault()}
              onReset={() => setSearchQuery("")}
            />

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ユーザ名</th>
                    <th>現在ロール</th>
                    <th>適用範囲</th>
                    <th>更新日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => (
                      <tr key={assignment.id}>
                        <td>{assignment.username}</td>
                        <td>{assignment.currentRole}</td>
                        <td>{assignment.assignmentScope}</td>
                        <td>{formatJaDateTime(assignment.updatedAt)}</td>
                        <td>
                          <div className={styles.tableActions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => startEdit(assignment)}>
                              編集
                            </button>
                            <button type="button" className={styles.dangerButton} onClick={() => deleteAssignment(assignment.id)}>
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.emptyState}>
                        {searchQuery.trim() ? "条件に一致するロール割り当てはありません。" : "ロール割り当てが登録されていません。"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form className={styles.subGrid} onSubmit={saveAssignment}>
              <div>
                <h3 className={styles.sectionTitle}>ロール割り当てフォーム</h3>
                <p className={styles.sectionMeta}>
                  {selectedId === null
                    ? "新規割り当てを登録するか、一覧から編集対象を選択してください。"
                    : `編集中: ${assignments.find((assignment) => assignment.id === selectedId)?.username ?? "-"}`}
                </p>
              </div>

              <div className={styles.formGrid}>
                <label className={styles.field}>
                  <span className={styles.label}>ユーザ名</span>
                  <input
                    className={styles.input}
                    type="text"
                    required
                    value={form.username}
                    onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>ロール</span>
                  <select
                    className={styles.select}
                    value={form.currentRole}
                    onChange={(event) => setForm((prev) => ({ ...prev, currentRole: event.target.value }))}
                  >
                    <option value="platform_admin">platform_admin</option>
                    <option value="org_admin">org_admin</option>
                    <option value="org_user">org_user</option>
                    <option value="auditor">auditor</option>
                    <option value="user">user</option>
                  </select>
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>適用範囲</span>
                  <input
                    className={styles.input}
                    type="text"
                    required
                    value={form.assignmentScope}
                    onChange={(event) => setForm((prev) => ({ ...prev, assignmentScope: event.target.value }))}
                  />
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  {selectedId === null ? "割り当てを登録" : "割り当てを更新"}
                </button>
                <button type="button" className={styles.secondaryButton} onClick={resetForm}>
                  クリア
                </button>
              </div>
            </form>
          </div>
        </article>
      </section>
    </ManagementShell>
  );
}
