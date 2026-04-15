"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { Footer, Header, PageHero } from "@/components/layout";
import { Container } from "@/components/ui/container";
import { AdminListSearchBar } from "./admin-list-search-bar";
import { useAppSelector } from "@/store/hooks";
import Link from "next/link";
import styles from "./admin-account-management-page-view.module.css";

const ADMIN_ROLES = new Set(["platform_admin", "org_admin", "admin"]);

type UserStatus = "active" | "inactive";

type AffiliationRolePair = {
  affiliation: string;
  role: string;
};

type UserManagementItem = {
  id: number;
  username: string;
  fullName: string;
  affiliationRoles: AffiliationRolePair[];
  status: UserStatus;
  updatedAt: string;
};

type RoleAssignmentItem = {
  id: number;
  username: string;
  currentRole: string;
  assignmentScope: string;
  updatedAt: string;
};

const INITIAL_USERS: UserManagementItem[] = [
  {
    id: 1,
    username: "admin01",
    fullName: "山田 太郎",
    affiliationRoles: [{ affiliation: "general_affairs_department", role: "platform_admin" }],
    status: "active",
    updatedAt: "2026-04-12T09:30:00+09:00",
  },
  {
    id: 2,
    username: "org-user-01",
    fullName: "佐藤 花子",
    affiliationRoles: [
      { affiliation: "information_committee", role: "org_user" },
      { affiliation: "public_relations_bureau", role: "auditor" },
    ],
    status: "active",
    updatedAt: "2026-04-11T15:20:00+09:00",
  },
  {
    id: 3,
    username: "auditor-team",
    fullName: "監査 担当",
    affiliationRoles: [{ affiliation: "inspection_committee", role: "auditor" }],
    status: "inactive",
    updatedAt: "2026-04-10T10:00:00+09:00",
  },
];

const DEPARTMENT_TYPES = [
  { value: "culture_department", label: "文化部" },
  { value: "cooking_department", label: "炊事部" },
  { value: "general_affairs_department", label: "庶務部" },
  { value: "welfare_department", label: "厚生部" },
  { value: "human_rights_department", label: "人権擁護部" },
] as const;

const COMMITTEE_TYPES = [
  { value: "election_management_committee", label: "選挙管理委員会" },
  { value: "entry_exit_selection_committee", label: "入退寮選考委員会" },
  { value: "information_committee", label: "情報委員会" },
  { value: "inspection_committee", label: "監察委員会" },
] as const;

const BUREAU_TYPES = [
  { value: "muc", label: "MUC" },
  { value: "disaster_response_bureau", label: "対処分戦略推進局" },
  { value: "public_relations_bureau", label: "広報局" },
  { value: "expansion_construction_bureau", label: "増築建設局" },
  { value: "external_liaison_bureau", label: "寮外連携局" },
  { value: "international_exchange_bureau", label: "国際交流局" },
  { value: "sc", label: "SC" },
] as const;

const AFFILIATION_LABELS: Map<string, string> = new Map(
  [...DEPARTMENT_TYPES, ...COMMITTEE_TYPES, ...BUREAU_TYPES].map((option) => [option.value, option.label]),
);

const AFFILIATION_OPTION_GROUPS = [
  { key: "department_types", title: "部", options: DEPARTMENT_TYPES },
  { key: "committee_types", title: "委員会", options: COMMITTEE_TYPES },
  { key: "bureau_types", title: "局", options: BUREAU_TYPES },
] as const;

const ROLE_OPTIONS = [
  { value: "platform_admin", label: "platform_admin" },
  { value: "org_admin", label: "org_admin" },
  { value: "org_user", label: "org_user" },
  { value: "auditor", label: "auditor" },
  { value: "user", label: "user" },
] as const;

const ROLE_LABELS: Map<string, string> = new Map(ROLE_OPTIONS.map((option) => [option.value, option.label]));

const DEFAULT_AFFILIATION = DEPARTMENT_TYPES[0].value;

function formatAffiliationRoleList(values: AffiliationRolePair[]): string {
  if (values.length === 0) {
    return "-";
  }

  return values
    .map((value) => `${AFFILIATION_LABELS.get(value.affiliation) ?? value.affiliation} (${ROLE_LABELS.get(value.role) ?? value.role})`)
    .join(" / ");
}

function getAffiliationLabel(value: string): string {
  return AFFILIATION_LABELS.get(value) ?? value;
}

function getRoleLabel(value: string): string {
  return ROLE_LABELS.get(value) ?? value;
}

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

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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
                        管理者機能一覧
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

export function AdminUserManagementPageView() {
  const [users, setUsers] = useState<UserManagementItem[]>(INITIAL_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFullNameCustomized, setIsFullNameCustomized] = useState(false);

  const createEmptyAffiliationRole = (): AffiliationRolePair => ({
    affiliation: DEFAULT_AFFILIATION,
    role: "org_user",
  });

  const selectedUser = useMemo(() => users.find((user) => user.id === selectedId) ?? null, [users, selectedId]);
  const [form, setForm] = useState<Omit<UserManagementItem, "id" | "updatedAt">>({
    username: "",
    fullName: "",
    affiliationRoles: [createEmptyAffiliationRole()],
    status: "active",
  });

  const filteredUsers = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) {
      return users;
    }

    return users.filter((user) => {
      const haystack = [
        user.username,
        user.fullName,
        formatAffiliationRoleList(user.affiliationRoles),
        user.affiliationRoles.map((item) => item.affiliation).join(" "),
        user.affiliationRoles.map((item) => item.role).join(" "),
        user.status,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [searchQuery, users]);

  const activeCount = filteredUsers.filter((user) => user.status === "active").length;

  const resetForm = () => {
    setSelectedId(null);
    setIsFullNameCustomized(false);
    setForm({
      username: "",
      fullName: "",
      affiliationRoles: [createEmptyAffiliationRole()],
      status: "active",
    });
  };

  const startEdit = (user: UserManagementItem) => {
    setSelectedId(user.id);
    setIsFullNameCustomized(true);
    setForm({
      username: user.username,
      fullName: user.fullName,
      affiliationRoles:
        user.affiliationRoles.length > 0 ? user.affiliationRoles.map((item) => ({ ...item })) : [createEmptyAffiliationRole()],
      status: user.status,
    });
    setStatusMessage(null);
  };

  const handleUsernameBlur = () => {
    if (isFullNameCustomized) {
      return;
    }

    setForm((prev) => ({
      ...prev,
      fullName: prev.username,
    }));
  };

  const saveUser = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (form.affiliationRoles.length === 0) {
      setStatusMessage("所属を1つ以上選択してください。");
      return;
    }

    const affiliations = form.affiliationRoles.map((item) => item.affiliation);
    if (new Set(affiliations).size !== affiliations.length) {
      setStatusMessage("同じ所属が重複しています。所属ごとに1つのロールを設定してください。");
      return;
    }

    if (selectedId === null) {
      const next: UserManagementItem = {
        id: users.length > 0 ? Math.max(...users.map((user) => user.id)) + 1 : 1,
        ...form,
        updatedAt: new Date().toISOString(),
      };
      setUsers((prev) => [next, ...prev]);
      setStatusMessage("ユーザを登録しました。");
    } else {
      setUsers((prev) =>
        prev.map((user) =>
          user.id === selectedId
            ? {
                ...user,
                ...form,
                updatedAt: new Date().toISOString(),
              }
            : user,
        ),
      );
      setStatusMessage("ユーザ情報を更新しました。");
    }

    resetForm();
  };

  const deleteUser = (id: number) => {
    if (!window.confirm("このユーザを削除しますか？")) {
      return;
    }

    setUsers((prev) => prev.filter((user) => user.id !== id));
    if (selectedId === id) {
      resetForm();
    }
    setStatusMessage("ユーザを削除しました。");
  };

  const updateAffiliationRole = (index: number, nextValue: Partial<AffiliationRolePair>) => {
    setForm((prev) => ({
      ...prev,
      affiliationRoles: prev.affiliationRoles.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...nextValue,
            }
          : item,
      ),
    }));
  };

  const addAffiliationRole = () => {
    setForm((prev) => ({
      ...prev,
      affiliationRoles: [...prev.affiliationRoles, createEmptyAffiliationRole()],
    }));
  };

  const removeAffiliationRole = (index: number) => {
    setForm((prev) => {
      if (prev.affiliationRoles.length === 1) {
        return prev;
      }

      return {
        ...prev,
        affiliationRoles: prev.affiliationRoles.filter((_, itemIndex) => itemIndex !== index),
      };
    });
  };

  return (
    <ManagementShell
      redirectPath="/admin/features/account-permission/user-management"
      badge="ADMIN USER MANAGEMENT"
      title="アカウント / 権限管理"
      description="ユーザ情報の検索、一覧確認、登録・更新を行います。"
    >
      {statusMessage ? <p className={styles.message}>{statusMessage}</p> : null}

      <section className={styles.grid}>
        <article className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>ユーザ一覧と編集</h2>
              <p className={styles.sectionMeta}>ユーザを検索し、状態・所属・ロールを管理します。</p>
            </div>
            <div className={styles.buttonRow}>
              <span className={styles.statusBadge}>{`全${filteredUsers.length}件`}</span>
              <span className={`${styles.statusBadge} ${styles.badgePublished}`}>{`有効${activeCount}件`}</span>
            </div>
          </div>

          <div className={styles.panel}>
            <AdminListSearchBar
              title="ユーザ検索"
              description="ユーザ名、氏名、所属とロールの組み合わせで絞り込みます。"
              value={searchQuery}
              placeholder="例: admin01, 庶務部, org_admin"
              onChange={setSearchQuery}
              onSubmit={(event) => event.preventDefault()}
              onReset={() => setSearchQuery("")}
            />

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>ユーザ名</th>
                    <th>氏名</th>
                    <th>所属ごとのロール</th>
                    <th>状態</th>
                    <th>更新日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length > 0 ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>{user.username}</td>
                        <td>{user.fullName}</td>
                        <td>
                          <div className={styles.mappingList}>
                            {user.affiliationRoles.map((item) => (
                              <div key={`${user.id}-${item.affiliation}`} className={styles.mappingItem}>
                                <span>{getAffiliationLabel(item.affiliation)}</span>
                                <span className={styles.mappingArrow}>→</span>
                                <span>{getRoleLabel(item.role)}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.statusBadge} ${user.status === "active" ? styles.badgePublished : styles.badgeDraft}`}>
                            {user.status === "active" ? "有効" : "無効"}
                          </span>
                        </td>
                        <td>{formatDateTime(user.updatedAt)}</td>
                        <td>
                          <div className={styles.tableActions}>
                            <button type="button" className={styles.secondaryButton} onClick={() => startEdit(user)}>
                              編集
                            </button>
                            <button type="button" className={styles.dangerButton} onClick={() => deleteUser(user.id)}>
                              削除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className={styles.emptyState}>
                        {searchQuery.trim() ? "条件に一致するユーザはありません。" : "ユーザが登録されていません。"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <form className={styles.subGrid} onSubmit={saveUser}>
              <div>
                <h3 className={styles.sectionTitle}>ユーザ登録・更新フォーム</h3>
                <p className={styles.sectionMeta}>
                  {selectedUser ? `編集中: ${selectedUser.username}` : "新規ユーザを登録するか、一覧から編集対象を選択してください。"}
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
                    onBlur={handleUsernameBlur}
                  />
                </label>

                <label className={styles.field}>
                  <span className={styles.label}>氏名</span>
                  <input
                    className={styles.input}
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      setIsFullNameCustomized(nextValue.trim().length > 0);
                      setForm((prev) => ({ ...prev, fullName: nextValue }));
                    }}
                  />
                </label>

                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <span className={styles.label}>所属とロール</span>
                  <div className={styles.mappingEditor}>
                    {form.affiliationRoles.map((item, index) => (
                      <div key={`affiliation-role-${index}`} className={styles.mappingEditorRow}>
                        <select
                          className={styles.select}
                          value={item.affiliation}
                          onChange={(event) => updateAffiliationRole(index, { affiliation: event.target.value })}
                        >
                          {AFFILIATION_OPTION_GROUPS.map((group) => (
                            <optgroup key={group.key} label={group.title}>
                              {group.options.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>

                        <select
                          className={styles.select}
                          value={item.role}
                          onChange={(event) => updateAffiliationRole(index, { role: event.target.value })}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          className={styles.dangerButton}
                          onClick={() => removeAffiliationRole(index)}
                          disabled={form.affiliationRoles.length === 1}
                        >
                          削除
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className={styles.buttonRow}>
                    <button type="button" className={styles.secondaryButton} onClick={addAffiliationRole}>
                      所属×ロールを追加
                    </button>
                  </div>
                  <p className={styles.helpText}>所属はプルダウンで選択し、対応するロールを横並びで設定してください。</p>
                </div>

                <label className={styles.field}>
                  <span className={styles.label}>状態</span>
                  <select
                    className={styles.select}
                    value={form.status}
                    onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as UserStatus }))}
                  >
                    <option value="active">有効</option>
                    <option value="inactive">無効</option>
                  </select>
                </label>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.primaryButton}>
                  {selectedId === null ? "ユーザを登録" : "ユーザ情報を更新"}
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
                        <td>{formatDateTime(assignment.updatedAt)}</td>
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
