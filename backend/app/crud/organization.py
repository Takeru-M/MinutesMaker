from sqlmodel import Session, select

from app.models.organization import Organization, OrganizationMembership
from app.models.role import Role


def get_organization_by_id(db: Session, organization_id: int) -> Organization | None:
    stmt = select(Organization).where(Organization.id == organization_id)
    return db.exec(stmt).first()


def get_membership(db: Session, *, user_id: int, organization_id: int) -> OrganizationMembership | None:
    stmt = select(OrganizationMembership).where(
        OrganizationMembership.user_id == user_id,
        OrganizationMembership.organization_id == organization_id,
        OrganizationMembership.is_active.is_(True),
    )
    return db.exec(stmt).first()


def list_user_memberships(db: Session, user_id: int) -> list[OrganizationMembership]:
    stmt = select(OrganizationMembership).where(
        OrganizationMembership.user_id == user_id,
        OrganizationMembership.is_active.is_(True),
    )
    return list(db.exec(stmt).all())


def list_user_memberships_with_details(
    db: Session,
    user_id: int,
) -> list[tuple[OrganizationMembership, Organization, Role]]:
    stmt = (
        select(OrganizationMembership, Organization, Role)
        .join(Organization, Organization.id == OrganizationMembership.organization_id)
        .join(Role, Role.id == OrganizationMembership.role_id)
        .where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.is_active.is_(True),
            Organization.is_active.is_(True),
            Role.is_active.is_(True),
        )
        .order_by(OrganizationMembership.is_primary.desc(), OrganizationMembership.id)
    )
    return list(db.exec(stmt).all())


def get_user_role_for_organization(db: Session, user_id: int, organization_id: int) -> str | None:
    stmt = (
        select(Role.name)
        .join(OrganizationMembership, OrganizationMembership.role_id == Role.id)
        .where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.organization_id == organization_id,
            OrganizationMembership.is_active.is_(True),
            Role.is_active.is_(True),
        )
    )
    return db.exec(stmt).first()


def get_primary_active_membership(db: Session, user_id: int) -> OrganizationMembership | None:
    stmt = (
        select(OrganizationMembership)
        .where(
            OrganizationMembership.user_id == user_id,
            OrganizationMembership.is_active.is_(True),
        )
        .order_by(OrganizationMembership.is_primary.desc(), OrganizationMembership.id)
    )
    return db.exec(stmt).first()