ROLE_PLATFORM_ADMIN = "platform_admin"
ROLE_GUEST_USER = "guest_user"
ROLE_ORG_ADMIN = "org_admin"
ROLE_ORG_USER = "org_user"
ROLE_AUDITOR = "auditor"

# Legacy role names (backward compatibility)
LEGACY_ROLE_ADMIN = "admin"
LEGACY_ROLE_USER = "user"

# Compatibility aliases used by existing endpoint guards.
ROLE_ADMIN = ROLE_PLATFORM_ADMIN
ROLE_USER = ROLE_ORG_USER

ROLE_CANONICAL_MAP = {
    LEGACY_ROLE_ADMIN: ROLE_PLATFORM_ADMIN,
    LEGACY_ROLE_USER: ROLE_ORG_USER,
}

# Meeting scale (大規模 or 小規模)
MEETING_SCALE_LARGE = "large"
MEETING_SCALE_SMALL = "small"

# Meeting types for large scale meetings
MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY = "dormitory_general_assembly"
MEETING_TYPE_BLOCK = "block"

# Meeting types for small scale meetings (Bureau/Committee/Department)
MEETING_TYPE_DEPARTMENT = "department"  # 部会
MEETING_TYPE_COMMITTEE = "committee"  # 委員会
MEETING_TYPE_BUREAU = "bureau"  # 局

# Department sub-types (部会の種類)
DEPARTMENT_TYPES = (
    "culture_department",  # 文化部
    "cooking_department",  # 炊事部
    "general_affairs_department",  # 庶務部
    "welfare_department",  # 厚生部
    "human_rights_department",  # 人権擁護部
)

# Committee sub-types (委員会の種類)
COMMITTEE_TYPES = (
    "election_management_committee",  # 選挙管理委員会
    "entry_exit_selection_committee",  # 入退寮選考委員会
    "information_committee",  # 情報委員会
    "inspection_committee",  # 監察委員会
)

# Bureau sub-types (局の種類)
BUREAU_TYPES = (
    "muc",  # MUC
    "disaster_response_bureau",  # 対処分戦略推進局
    "public_relations_bureau",  # 広報局
    "expansion_construction_bureau",  # 増築建設局
    "external_liaison_bureau",  # 寮外連携局
    "international_exchange_bureau",  # 国際交流局
    "sc",  # SC
)

# Backward compatibility
MEETING_TYPE_LARGE = MEETING_TYPE_DORMITORY_GENERAL_ASSEMBLY
MEETING_TYPE_ANNUAL = "annual"  # Legacy, keep for backward compatibility

RELATION_TYPE_PAST_BLOCK = "past_block"
RELATION_TYPE_OTHER_REFERENCE = "other_reference"

ROLE_DEFINITIONS = (
    {"name": ROLE_PLATFORM_ADMIN, "description": "Platform-wide administrator"},
    {"name": ROLE_GUEST_USER, "description": "Guest user with limited visibility"},
    {"name": ROLE_ORG_ADMIN, "description": "Organization administrator"},
    {"name": ROLE_ORG_USER, "description": "Organization member user"},
    {"name": ROLE_AUDITOR, "description": "Read-only auditor"},
)

PERMISSION_DEFINITIONS = (
    ("meeting.read_list", "meeting", "read_list", "Read meeting schedule list"),
    ("meeting.read_detail", "meeting", "read_detail", "Read meeting detail"),
    ("meeting.qa.ask", "meeting", "qa_ask", "Ask meeting QA"),
    ("meeting.qa.ingest", "meeting", "qa_ingest", "Ingest meeting QA sources"),
    ("meeting.create", "meeting", "create", "Create meetings"),
    ("meeting.update", "meeting", "update", "Update meetings"),
    ("meeting.delete", "meeting", "delete", "Delete meetings"),
    ("agenda.read", "agenda", "read", "Read agenda items"),
    ("agenda.create", "agenda", "create", "Create agenda items"),
    ("agenda.update", "agenda", "update", "Update agenda items"),
    ("agenda.delete", "agenda", "delete", "Delete agenda items"),
    ("minutes.read", "minutes", "read", "Read minutes"),
    ("minutes.create", "minutes", "create", "Create minutes"),
    ("minutes.update", "minutes", "update", "Update minutes"),
    ("minutes.approve", "minutes", "approve", "Approve minutes"),
    ("minutes.publish", "minutes", "publish", "Publish minutes"),
    ("notice.read", "notice", "read", "Read notices"),
    ("notice.create", "notice", "create", "Create notices"),
    ("notice.update", "notice", "update", "Update notices"),
    ("notice.delete", "notice", "delete", "Delete notices"),
    ("notice.publish", "notice", "publish", "Publish notices"),
    ("repository.read", "repository", "read", "Read repository documents"),
    ("repository.create", "repository", "create", "Create repository documents"),
    ("repository.update", "repository", "update", "Update repository documents"),
    ("repository.delete", "repository", "delete", "Delete repository documents"),
    ("guide.read", "guide", "read", "Read guide contents"),
    ("guide.create", "guide", "create", "Create guide contents"),
    ("guide.update", "guide", "update", "Update guide contents"),
    ("guide.delete", "guide", "delete", "Delete guide contents"),
    ("org.read", "organization", "read", "Read organizations"),
    ("org.update", "organization", "update", "Update organizations"),
    ("org.member.manage", "organization_member", "manage", "Manage organization members"),
    ("user.read", "user", "read", "Read users"),
    ("user.invite", "user", "invite", "Invite users"),
    ("user.update", "user", "update", "Update users"),
    ("user.deactivate", "user", "deactivate", "Deactivate users"),
    ("role.assign", "role", "assign", "Assign roles"),
    ("role.revoke", "role", "revoke", "Revoke roles"),
)

PLATFORM_ADMIN_PERMISSION_NAMES = frozenset(name for name, *_ in PERMISSION_DEFINITIONS)

ORG_ADMIN_PERMISSION_NAMES = frozenset(
    {
        "meeting.read_list",
        "meeting.read_detail",
        "meeting.qa.ask",
        "meeting.qa.ingest",
        "meeting.create",
        "meeting.update",
        "agenda.read",
        "agenda.create",
        "agenda.update",
        "minutes.read",
        "minutes.create",
        "minutes.update",
        "minutes.approve",
        "notice.read",
        "notice.create",
        "notice.update",
        "notice.publish",
        "repository.read",
        "repository.create",
        "repository.update",
        "guide.read",
        "guide.create",
        "guide.update",
        "user.read",
        "user.invite",
        "user.update",
        "org.read",
    }
)

ORG_USER_PERMISSION_NAMES = frozenset(
    {
        "meeting.read_list",
        "meeting.read_detail",
        "meeting.qa.ask",
        "meeting.qa.ingest",
        "agenda.read",
        "agenda.create",
        "minutes.read",
        "minutes.create",
        "minutes.update",
        "notice.read",
        "repository.read",
        "guide.read",
    }
)

AUDITOR_PERMISSION_NAMES = frozenset(
    {
        "meeting.read_list",
        "meeting.read_detail",
        "meeting.qa.ask",
        "agenda.read",
        "minutes.read",
        "notice.read",
        "repository.read",
        "guide.read",
        "user.read",
    }
)

GUEST_USER_PERMISSION_NAMES = frozenset(
    {
        "meeting.read_list",
        "agenda.read",
        "minutes.read",
    }
)

ROLE_PERMISSION_ASSIGNMENTS = {
    ROLE_PLATFORM_ADMIN: PLATFORM_ADMIN_PERMISSION_NAMES,
    ROLE_ORG_ADMIN: ORG_ADMIN_PERMISSION_NAMES,
    ROLE_ORG_USER: ORG_USER_PERMISSION_NAMES,
    ROLE_AUDITOR: AUDITOR_PERMISSION_NAMES,
    ROLE_GUEST_USER: GUEST_USER_PERMISSION_NAMES,
}

# Backward compatibility aliases used by existing seed code paths.
PERSONAL_ACCOUNT_PERMISSION_NAMES = ORG_ADMIN_PERMISSION_NAMES
SHARED_ACCOUNT_PERMISSION_NAMES = ORG_USER_PERMISSION_NAMES

AGENDA_RELATION_TYPES = (
    RELATION_TYPE_PAST_BLOCK,
    RELATION_TYPE_OTHER_REFERENCE,
)
