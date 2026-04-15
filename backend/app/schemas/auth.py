from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)
    organization_id: int | None = Field(default=None, ge=1)


class OrganizationResponse(BaseModel):
    id: int
    name: str
    slug: str


class MembershipResponse(BaseModel):
    organization: OrganizationResponse
    role: str
    is_primary: bool


class LoginResponse(BaseModel):
    message: str
    role: str
    active_organization_id: int | None = None


class RefreshResponse(BaseModel):
    message: str


class LoginOptionsResponse(BaseModel):
    memberships: list[MembershipResponse] = Field(default_factory=list)


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    role: str
    active_organization_id: int | None = None
    memberships: list[MembershipResponse] = Field(default_factory=list)
