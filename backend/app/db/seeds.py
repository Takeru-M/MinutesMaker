from datetime import datetime

from sqlmodel import Session, select

from app.core.constants import (
    LEGACY_ROLE_ADMIN,
    LEGACY_ROLE_USER,
    MEETING_TYPE_ANNUAL,
    MEETING_TYPE_BLOCK,
    MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY,
    MEETING_SCALE_LARGE,
    MEETING_SCALE_SMALL,
    PERMISSION_DEFINITIONS,
    RELATION_TYPE_OTHER_REFERENCE,
    RELATION_TYPE_PAST_BLOCK,
    ROLE_ADMIN,
    ROLE_AUDITOR,
    ROLE_DEFINITIONS,
    ROLE_GUEST_USER,
    ROLE_ORG_ADMIN,
    ROLE_ORG_USER,
    ROLE_PERMISSION_ASSIGNMENTS,
    ROLE_USER,
)
from app.core.security import get_password_hash
from app.models.agenda import Agenda
from app.models.agenda_relation import AgendaRelation
from app.models.content import Content
from app.models.meeting import Meeting
from app.models.notice import Notice
from app.models.organization import Organization, OrganizationMembership
from app.models.role import Permission, Role, RolePermission, UserRole
from app.models.user import User


def seed_roles_and_permissions(db: Session) -> None:
    roles: dict[str, Role] = {}
    permissions: dict[str, Permission] = {}

    for role_def in ROLE_DEFINITIONS:
        role = db.exec(select(Role).where(Role.name == role_def["name"])).first()
        if role is None:
            role = Role(name=role_def["name"], description=role_def["description"])
            db.add(role)
            db.flush()
        roles[role.name] = role

    for name, resource_type, action, description in PERMISSION_DEFINITIONS:
        permission = db.exec(select(Permission).where(Permission.name == name)).first()
        if permission is None:
            permission = Permission(
                name=name,
                resource_type=resource_type,
                action=action,
                description=description,
            )
            db.add(permission)
            db.flush()
        permissions[permission.name] = permission

    for role_name, permission_names in ROLE_PERMISSION_ASSIGNMENTS.items():
        role = roles.get(role_name)
        if role is not None:
            _bind_role_permissions(db, role, permissions, permission_names)

    db.commit()


def seed_sample_users(db: Session) -> None:
    sample_users = (
        {
            "username": "platform-admin",
            "password": "Password123!",
            "role": ROLE_ADMIN,
            "full_name": "Platform Admin",
        },
        {
            "username": "org-admin-a",
            "password": "Password123!",
            "role": ROLE_ORG_ADMIN,
            "full_name": "Organization Admin A",
        },
        {
            "username": "org-user-a",
            "password": "Password123!",
            "role": ROLE_USER,
            "full_name": "Organization User A",
        },
        {
            "username": "org-user-b",
            "password": "Password123!",
            "role": ROLE_ORG_USER,
            "full_name": "Organization User B",
        },
        {
            "username": "auditor-a",
            "password": "Password123!",
            "role": ROLE_AUDITOR,
            "full_name": "Auditor User",
        },
        {
            "username": "guest-viewer",
            "password": "Password123!",
            "role": ROLE_GUEST_USER,
            "full_name": "Guest Viewer",
        },
        {
            "username": "multi-org-user",
            "password": "Password123!",
            "role": ROLE_USER,
            "full_name": "Multi Organization User",
        },
    )

    for spec in sample_users:
        user = db.exec(select(User).where(User.username == spec["username"])).first()
        if user is None:
            user = User(
                username=spec["username"],
                password_hash=get_password_hash(spec["password"]),
                role=spec["role"],
                full_name=spec["full_name"],
                is_active=True,
            )
            db.add(user)
            continue

        user.role = spec["role"]
        user.password_hash = get_password_hash(spec["password"])
        user.full_name = spec["full_name"]
        user.is_active = True

    db.commit()


def seed_organizations_and_memberships(db: Session) -> None:
    org_specs = (
        {"slug": "organization-a", "name": "Organization A"},
        {"slug": "organization-b", "name": "Organization B"},
    )
    organizations: dict[str, Organization] = {}

    for spec in org_specs:
        organization = db.exec(select(Organization).where(Organization.slug == spec["slug"])).first()
        if organization is None:
            organization = Organization(name=spec["name"], slug=spec["slug"], is_active=True)
            db.add(organization)
            db.flush()
        organizations[spec["slug"]] = organization

    role_map = {role.name: role for role in db.exec(select(Role)).all()}
    membership_specs = (
        ("org-admin-a", "organization-a", ROLE_ORG_ADMIN, True),
        ("org-user-a", "organization-a", ROLE_ORG_USER, True),
        ("org-user-b", "organization-b", ROLE_ORG_USER, True),
        ("auditor-a", "organization-a", ROLE_AUDITOR, True),
        ("multi-org-user", "organization-a", ROLE_ORG_USER, True),
        ("multi-org-user", "organization-b", ROLE_ORG_ADMIN, False),
    )

    for username, org_slug, role_name, is_primary in membership_specs:
        user = db.exec(select(User).where(User.username == username)).first()
        organization = organizations.get(org_slug)
        role = role_map.get(role_name)
        if (
            user is None
            or organization is None
            or role is None
            or user.id is None
            or organization.id is None
            or role.id is None
        ):
            continue

        membership = db.exec(
            select(OrganizationMembership).where(
                OrganizationMembership.user_id == user.id,
                OrganizationMembership.organization_id == organization.id,
            )
        ).first()
        if membership is None:
            db.add(
                OrganizationMembership(
                    user_id=user.id,
                    organization_id=organization.id,
                    role_id=role.id,
                    is_primary=is_primary,
                    assigned_by=user.id,
                )
            )
        else:
            membership.role_id = role.id
            membership.is_primary = is_primary
            membership.is_active = True

    db.commit()


def seed_default_user_role_assignments(db: Session) -> None:
    managed_roles = [role_def["name"] for role_def in ROLE_DEFINITIONS]
    role_map = {role.name: role for role in db.exec(select(Role).where(Role.name.in_(managed_roles))).all()}
    if not role_map:
        return

    users = db.exec(select(User)).all()
    for user in users:
        if user.role == LEGACY_ROLE_ADMIN:
            role_name = ROLE_ADMIN
        elif user.role == LEGACY_ROLE_USER:
            role_name = ROLE_USER
        else:
            role_name = user.role if user.role in role_map else ROLE_GUEST_USER

        role = role_map[role_name]

        existing = db.exec(
            select(UserRole).where(UserRole.user_id == user.id, UserRole.role_id == role.id)
        ).first()
        if existing is None:
            db.add(UserRole(user_id=user.id, role_id=role.id, assigned_by=user.id))

    db.commit()


def seed_sample_agendas(db: Session) -> None:
    admin = db.exec(select(User).where(User.role == ROLE_ADMIN)).first()
    if admin is None or admin.id is None:
        return

    meetings: dict[str, Meeting] = {}
    meeting_specs = [
        {
            "key": "dormitory_assembly_20260420",
            "title": "寮生大会",
            "description": "新規議案投稿の対象となる大規模会議です。",
            "scheduled_at": datetime(2026, 4, 20, 18, 0, 0),
            "meeting_type": MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY,
            "meeting_scale": MEETING_SCALE_LARGE,
        },
        {
            "key": "block_20260413",
            "title": "ブロック会議",
            "description": "過去ブロック会議の参照用会議です。",
            "scheduled_at": datetime(2026, 4, 13, 18, 0, 0),
            "meeting_type": MEETING_TYPE_BLOCK,
            "meeting_scale": MEETING_SCALE_LARGE,
        },
        {
            "key": "annual_20260331",
            "title": "年次会議",
            "description": "年議案参照用の会議です。",
            "scheduled_at": datetime(2026, 3, 31, 18, 0, 0),
            "meeting_type": MEETING_TYPE_ANNUAL,
            "meeting_scale": MEETING_SCALE_LARGE,
        },
    ]

    for spec in meeting_specs:
        meeting = db.exec(
            select(Meeting).where(
                Meeting.meeting_type == spec["meeting_type"],
                Meeting.scheduled_at == spec["scheduled_at"],
            )
        ).first()
        if meeting is None:
            meeting = Meeting(
                title=spec["title"],
                description=spec["description"],
                scheduled_at=spec["scheduled_at"],
                location="大会議室" if spec["meeting_type"] == MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY else "中会議室",
                status="scheduled",
                meeting_type=spec["meeting_type"],
                meeting_scale=spec["meeting_scale"],
                minutes_scope_policy="agenda",
                created_by=admin.id,
            )
            db.add(meeting)
            db.flush()
        else:
            meeting.title = spec["title"]
            meeting.description = spec["description"]
            meeting.scheduled_at = spec["scheduled_at"]
            meeting.location = "大会議室" if spec["meeting_type"] == MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY else "中会議室"
            meeting.status = "scheduled"
            meeting.meeting_type = spec["meeting_type"]
            meeting.meeting_scale = spec["meeting_scale"]
            meeting.minutes_scope_policy = "agenda"
        meetings[spec["key"]] = meeting

    agenda_specs = [
        {
            "key": "large_facility",
            "meeting_key": "dormitory_assembly_20260420",
            "meeting_date": datetime(2026, 4, 20, 18, 0, 0).date(),
            "meeting_type": MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY,
            "title": "施設改善に関する議案",
            "responsible": "施設管理委員会",
            "description": None,
            "content": "1. 改善要望の共有\n2. 優先順位の確認\n3. 担当割り当て",
            "agenda_types": ["discussion"],
            "voting_items": None,
            "order_no": 1,
        },
        {
            "key": "large_purchase",
            "meeting_key": "dormitory_assembly_20260420",
            "meeting_date": datetime(2026, 4, 20, 18, 0, 0).date(),
            "meeting_type": MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY,
            "title": "備品購入フロー見直し議案",
            "responsible": "総務委員会",
            "description": None,
            "content": "1. 現行フローの課題\n2. 改善案\n3. 実施時期の確認",
            "agenda_types": ["discussion", "voting"],
            "voting_items": "購買申請ワークフローを新方式へ移行する。",
            "order_no": 2,
        },
        {
            "key": "block_disaster",
            "meeting_key": "block_20260413",
            "meeting_date": datetime(2026, 4, 13, 18, 0, 0).date(),
            "meeting_type": MEETING_TYPE_BLOCK,
            "title": "防災訓練実施計画議案",
            "responsible": "防災担当",
            "description": None,
            "content": "1. 日程調整\n2. 担当者確認\n3. 必要備品の確認",
            "agenda_types": ["announcement", "discussion"],
            "voting_items": None,
            "order_no": 1,
        },
        {
            "key": "block_budget",
            "meeting_key": "block_20260413",
            "meeting_date": datetime(2026, 4, 13, 18, 0, 0).date(),
            "meeting_type": MEETING_TYPE_BLOCK,
            "title": "ブロック予算配分に関する議案",
            "responsible": "会計担当",
            "description": None,
            "content": "1. 配分案確認\n2. 修正点整理\n3. 最終確認",
            "agenda_types": ["discussion", "voting"],
            "voting_items": "配分案Aを承認する。",
            "order_no": 2,
        },
        {
            "key": "annual_policy",
            "meeting_key": "annual_20260331",
            "meeting_date": datetime(2026, 3, 31, 18, 0, 0).date(),
            "meeting_type": MEETING_TYPE_ANNUAL,
            "title": "年次運営方針に関する議案",
            "responsible": "運営委員会",
            "description": None,
            "content": "1. 前年度振り返り\n2. 新年度方針\n3. 課題の引き継ぎ",
            "agenda_types": ["announcement", "discussion"],
            "voting_items": None,
            "order_no": 1,
        },
    ]

    agendas: dict[str, Agenda] = {}
    for spec in agenda_specs:
        meeting = meetings[spec["meeting_key"]]
        if meeting.id is None:
            continue

        meeting_id = meeting.id
        agenda = db.exec(
            select(Agenda).where(Agenda.meeting_id == meeting_id, Agenda.order_no == spec["order_no"])
        ).first()
        if agenda is None:
            agenda = Agenda(
                meeting_id=meeting_id,
                meeting_date=spec["meeting_date"],
                meeting_type=spec["meeting_type"],
                title=spec["title"],
                responsible=spec["responsible"],
                description=spec["description"],
                content=spec["content"],
                status="published",
                priority=3,
                agenda_types=spec["agenda_types"],
                voting_items=spec["voting_items"],
                order_no=spec["order_no"],
                created_by=admin.id,
                updated_by=admin.id,
            )
            db.add(agenda)
            db.flush()
        else:
            agenda.title = spec["title"]
            agenda.meeting_date = spec["meeting_date"]
            agenda.meeting_type = spec["meeting_type"]
            agenda.responsible = spec["responsible"]
            agenda.description = spec["description"]
            agenda.content = spec["content"]
            agenda.status = "published"
            agenda.priority = 3
            agenda.agenda_types = spec["agenda_types"]
            agenda.voting_items = spec["voting_items"]
            agenda.order_no = spec["order_no"]
        agendas[spec["key"]] = agenda

    relation_specs = [
        ("large_facility", "block_disaster", RELATION_TYPE_PAST_BLOCK),
        ("large_facility", "annual_policy", RELATION_TYPE_OTHER_REFERENCE),
    ]
    for source_key, target_key, relation_type in relation_specs:
        source_agenda = agendas.get(source_key)
        target_agenda = agendas.get(target_key)
        if source_agenda is None or target_agenda is None:
            continue
        if source_agenda.id is None or target_agenda.id is None:
            continue

        source_id = source_agenda.id
        target_id = target_agenda.id
        existing_relation = db.exec(
            select(AgendaRelation).where(
                AgendaRelation.source_agenda_id == source_id,
                AgendaRelation.target_agenda_id == target_id,
                AgendaRelation.relation_type == relation_type,
            )
        ).first()
        if existing_relation is None:
            db.add(
                AgendaRelation(
                    source_agenda_id=source_id,
                    target_agenda_id=target_id,
                    relation_type=relation_type,
                )
            )

    db.commit()


def seed_notices(db: Session) -> None:
    admin = db.exec(select(User).where(User.role == ROLE_ADMIN)).first()
    if admin is None or admin.id is None:
        return

    notice_specs = [
        {
            "title": "重要なお知らせ：システムメンテナンス予定",
            "content": "4月15日（月）午前2時から午前6時までシステムメンテナンスを実施します。\n\nこの期間中はシステムをご利用いただけません。\nご迷惑をおかけして申し訳ございません。",
            "category": "important",
            "status": "published",
            "is_pinned": True,
            "published_at": datetime(2026, 4, 12, 9, 0, 0),
        },
        {
            "title": "お知らせ：新機能のリリース",
            "content": "このたび、会議資料の自動生成機能がリリースされました。\n\n詳細な使い方は以下のマニュアルをご参照ください。\nマニュアルはシステム内の「ガイド」セクションでご確認いただけます。",
            "category": "info",
            "status": "published",
            "is_pinned": False,
            "published_at": datetime(2026, 4, 10, 14, 30, 0),
        },
        {
            "title": "注意：ファイルアップロード制限の変更",
            "content": "セキュリティ強化のため、ファイルアップロード制限を以下のように変更いたします。\n\n・対応ファイル形式：PDF, Excel, Word のみ\n・ファイルサイズ上限：50MB から 100MB に変更\n・変更開始日：4月20日",
            "category": "warning",
            "status": "published",
            "is_pinned": False,
            "published_at": datetime(2026, 4, 8, 10, 0, 0),
        },
        {
            "title": "一般的なお知らせ：定例会議のスケジュール",
            "content": "4月の定例会議は以下の日程で実施されます。\n\n・大規模会議：4月20日（土）18時\n・ブロック会議：4月13日（日）18時\n\n詳細な議案はシステム内でご確認ください。",
            "category": "info",
            "status": "published",
            "is_pinned": False,
            "published_at": datetime(2026, 4, 5, 11, 15, 0),
        },
        {
            "title": "重要な通知：会議規則の改正",
            "content": "このたび、会議規則の一部が改正されました。\n\n改正内容：\n1. 議案投稿期限を会議の7日前から10日前に変更\n2. 最小参加者数を50名から40名に変更\n\n詳細は会議規則のドキュメントをご参照ください。",
            "category": "important",
            "status": "published",
            "is_pinned": False,
            "published_at": datetime(2026, 4, 1, 8, 30, 0),
        },
    ]

    for spec in notice_specs:
        notice = db.exec(
            select(Notice).where(Notice.title == spec["title"])
        ).first()
        if notice is None:
            notice = Notice(
                title=spec["title"],
                content=spec["content"],
                category=spec["category"],
                status=spec["status"],
                is_pinned=spec["is_pinned"],
                published_at=spec["published_at"],
                created_by=admin.id,
                updated_by=admin.id,
            )
            db.add(notice)

    db.commit()


def _bind_role_permissions(
    db: Session,
    role: Role,
    permissions: dict[str, Permission],
    permitted_names: frozenset[str],
) -> None:
    permitted_ids: set[int] = set()
    for permission_name in permitted_names:
        permission_id = permissions[permission_name].id
        if permission_id is not None:
            permitted_ids.add(permission_id)

    existing_role_permissions = db.exec(
        select(RolePermission).where(RolePermission.role_id == role.id)
    ).all()

    existing_permission_ids: set[int] = set()
    for role_permission in existing_role_permissions:
        existing_permission_ids.add(role_permission.permission_id)
        if role_permission.permission_id not in permitted_ids:
            db.delete(role_permission)

    for permission_name in permitted_names:
        permission = permissions[permission_name]
        if permission.id is not None and permission.id not in existing_permission_ids:
            db.add(RolePermission(role_id=role.id, permission_id=permission.id))


def seed_contents(db: Session) -> None:
    admin = db.exec(select(User).where(User.role == ROLE_ADMIN)).first()
    if admin is None or admin.id is None:
        return

    # Repository content items
    repository_specs = [
        {
            "title": "会議資料テンプレート",
            "content": "会議資料作成時のテンプレートです。\n\n【使用方法】\n1. このテンプレートをダウンロード\n2. 自分の内容に置き換える\n3. 指定のフォーマットで保存\n\n【注意事項】\n- 大文字・小文字の区別に注意\n- 記号は全角を使用\n- ファイルサイズは 100MB 以下",
            "created_at": datetime(2026, 4, 11, 10, 0, 0),
        },
        {
            "title": "会議資料の提出手順",
            "content": "会議資料をシステムに提出するための手順書です。\n\n【提出期限】\n会議開始の 10 日前までに提出してください。\n\n【提出方法】\n1. ログイン\n2. 「資料置き場」から「新規追加」をクリック\n3. 必要な情報を入力\n4. PDFファイルをアップロード\n5. 「提出」ボタンをクリック\n\n不明な点はお問い合わせください。",
            "created_at": datetime(2026, 4, 10, 14, 30, 0),
        },
        {
            "title": "共有ファイル命名規則",
            "content": "共有ファイルを保存する際の命名規則です。\n\n【フォーマット】\nYYYYMMDD_部署名_ファイル名.pdf\n\n【例】\n20260412_総務_年度予算案.pdf\n20260412_情報委員会_システム仕様書.pdf\n\n【ルール】\n- 日付は 8 桁（YYYYMMDD 形式）\n- 部署名は全角カタカナ\n- 複数単語の場合はアンダースコアで区切る\n- 特殊文字は使用しない",
            "created_at": datetime(2026, 4, 9, 9, 15, 0),
        },
        {
            "title": "配布資料の保存先一覧",
            "content": "各部署の配布資料保存先一覧です。\n\n【保存先】\n- 総務部：/共有ドライブ/総務\n- 情報委員会：/共有ドライブ/情報\n- 施設管理委員会：/共有ドライブ/施設\n- 会計担当：/共有ドライブ/会計\n- 防災担当：/共有ドライブ/防災\n\n【アクセス権】\nアクセス権は各部署の管理者に申請してください。",
            "created_at": datetime(2026, 4, 8, 11, 0, 0),
        },
    ]

    # Guide content items
    guide_specs = [
        {
            "title": "はじめに読む利用手順",
            "content": "このシステムを初めて利用される方向けの基本的な使い方です。\n\n【基本機能】\n1. ログイン：ユーザー名とパスワードでログイン\n2. ダッシュボード：最新情報が表示されます\n3. 各セクション：目的別に情報を確認できます\n\n【ログイン方法】\n1. トップページの「ログイン」をクリック\n2. ユーザー名を入力\n3. パスワードを入力\n4. 「ログイン」ボタンをクリック\n\n詳細は各セクションのガイドをご覧ください。",
            "created_at": datetime(2026, 4, 11, 10, 0, 0),
        },
        {
            "title": "ログインとログアウト",
            "content": "ログイン機能とログアウト機能の詳細な説明です。\n\n【ログイン】\nシステムを利用するにはログインが必要です。\n- 専用のログインページからアクセス\n- ユーザー名とパスワードを入力\n- セッションは 24 時間で自動削除\n\n【ログアウト】\n- ページ右上のメニューから「ログアウト」を選択\n- または 24 時間の操作がない場合は自動ログアウト\n\n【セキュリティ】\n- パスワードは定期的に変更してください\n- 共用端末での利用後は必ずログアウト",
            "created_at": datetime(2026, 4, 10, 14, 30, 0),
        },
        {
            "title": "議案一覧の見方",
            "content": "議案一覧ページの見方と操作方法です。\n\n【画面構成】\n- 上部：検索ボックス（キーワード検索可能）\n- 中央：議案一覧（最新順に表示）\n- 右側：フィルタオプション（タイプ別に絞込可能）\n\n【表示項目】\n- 議案タイトル\n- 担当部署\n- ステータス（公開中/下書き/アーカイブ）\n- 作成日時\n\n【操作】\n- タイトルをクリックで詳細ページへ遷移\n- 検索ボックスでキーワード検索\n- ページネーションで別ページへ移動",
            "created_at": datetime(2026, 4, 9, 10, 0, 0),
        },
        {
            "title": "議案詳細ページの使い方",
            "content": "議案の詳細ページの見方です。\n\n【詳細ページの構成】\n1. ヘッダー：議案タイトル、ステータス、作成日時\n2. メイン：議案の内容\n3. サイドバー：関連情報\n4. フッター：操作ボタン\n\n【主な情報】\n- 議案タイトルと説明\n- 担当部署\n- 議案の種類（重要/通常）\n- 添付ファイル（ある場合）\n- 関連議案への リンク\n\n【操作】\n- PDFダウンロード：添付ファイルをダウンロード\n- 印刷：議案を印刷形式で表示\n- 共有：SNSやメールで共有",
            "created_at": datetime(2026, 4, 8, 15, 0, 0),
        },
    ]

    # Seed repository contents
    for spec in repository_specs:
        content = db.exec(
            select(Content).where(
                Content.content_type == "repository",
                Content.title == spec["title"],
                Content.deleted_at.is_(None),
            )
        ).first()
        if content is None:
            content = Content(
                content_type="repository",
                title=spec["title"],
                content=spec["content"],
                status="published",
                created_by=admin.id,
                updated_by=admin.id,
                created_at=spec["created_at"],
                updated_at=spec["created_at"],
            )
            db.add(content)
        else:
            content.content = spec["content"]
            content.updated_at = datetime.utcnow()

    db.flush()

    # Seed guide contents
    for spec in guide_specs:
        content = db.exec(
            select(Content).where(
                Content.content_type == "guide",
                Content.title == spec["title"],
                Content.deleted_at.is_(None),
            )
        ).first()
        if content is None:
            content = Content(
                content_type="guide",
                title=spec["title"],
                content=spec["content"],
                status="published",
                created_by=admin.id,
                updated_by=admin.id,
                created_at=spec["created_at"],
                updated_at=spec["created_at"],
            )
            db.add(content)
        else:
            content.content = spec["content"]
            content.updated_at = datetime.utcnow()

    db.commit()

