from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1)
    password: str = Field(min_length=1)


class LoginResponse(BaseModel):
    message: str
    role: str


class RefreshResponse(BaseModel):
    message: str


class CurrentUserResponse(BaseModel):
    id: int
    username: str
    role: str
