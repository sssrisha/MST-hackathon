from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["issuer", "bidder"] = "bidder"
    issuer_registration_key: str | None = Field(default=None, min_length=32, max_length=256)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: EmailStr
    role: str
    is_active: bool


class UserProfileResponse(UserResponse):
    roles: list[str]


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse