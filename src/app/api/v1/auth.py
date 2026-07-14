from datetime import timedelta
from typing import Annotated, Optional, cast

from fastapi import APIRouter, Cookie, Depends, Request, Response
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import EnvironmentOption, settings
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, UnauthorizedException
from ...core.schemas import Token
from ...core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenType,
    authenticate_user,
    blacklist_tokens,
    create_access_token,
    create_refresh_token,
    create_token_payload,
    get_password_hash,
    oauth2_scheme,
    verify_password,
    verify_token,
)
from ...crud.crud_users import crud_users
from ...models import CustomerProfile, User, UserRole, WorkerProfile
from ...schemas.auth import LoginRequest, RegisterCustomer, RegisterRequest, RegisterResponse, RegisterWorker
from ...schemas.user import UserRead
from ..dependencies import rate_limiter_dependency

router = APIRouter(tags=["auth-v2"], prefix="/auth")


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(payload: RegisterRequest, db: Annotated[AsyncSession, Depends(async_get_db)]) -> RegisterResponse:
    async with db.begin():
        email_exists = await crud_users.exists(db=db, email=payload.email)
        if email_exists:
            raise DuplicateValueException("Email already registered")
        username_exists = await crud_users.exists(db=db, username=payload.username)
        if username_exists:
            raise DuplicateValueException("Username already registered")
        user = User(hashed_password=get_password_hash(payload.password), username=payload.username, email=payload.email, name=payload.name, role_type=UserRole(payload.role_type))
        db.add(user)
        await db.flush()
        if isinstance(payload, RegisterCustomer):
            db.add(CustomerProfile(user_id=user.id))
        elif isinstance(payload, RegisterWorker):
            db.add(WorkerProfile(user_id=user.id))
        await db.refresh(user)
    return RegisterResponse(id=user.id, username=user.username, email=user.email, role_type=user.role_type)


@router.post("/login", response_model=Token, dependencies=[Depends(rate_limiter_dependency)])
async def login(
        response: Response,
        credentials: LoginRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    user = await authenticate_user(username_or_email=credentials.username_or_email, password=credentials.password, db=db)
    if not user:
        # Dummy hash compare to equalize response time
        dummy_hash = get_password_hash("dummy")
        await verify_password("dummy", dummy_hash)
        raise UnauthorizedException("Wrong username, email or password.")

    token_payload = create_token_payload(cast(User, user))
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = await create_access_token(data=token_payload, expires_delta=access_token_expires)
    refresh_token = await create_refresh_token(data=token_payload)

    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == EnvironmentOption.PRODUCTION,
        samesite="lax",
        max_age=max_age,
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/logout")
async def logout(
        response: Response,
        access_token: str = Depends(oauth2_scheme),
        refresh_token: Optional[str] = Cookie(None, alias="refresh_token"),
        db: AsyncSession = Depends(async_get_db),
) -> dict[str, str]:
    try:
        if not refresh_token:
            raise UnauthorizedException("Refresh token not found")

        await blacklist_tokens(access_token=access_token, refresh_token=refresh_token, db=db)
        response.delete_cookie(key="refresh_token")

        return {"message": "Logged out successfully"}

    except JWTError:
        raise UnauthorizedException("Invalid token.")


@router.post("/refresh")
async def refresh_access_token(request: Request, db: AsyncSession = Depends(async_get_db)) -> dict[str, str]:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise UnauthorizedException("Refresh token missing.")

    user_data = await verify_token(refresh_token, TokenType.REFRESH, db)
    if not user_data:
        raise UnauthorizedException("Invalid refresh token.")

    if "@" in user_data.username_or_email:
        db_user = await crud_users.get(db=db, email=user_data.username_or_email, is_deleted=False, schema_to_select=UserRead, return_as_model=True)
    else:
        db_user = await crud_users.get(db=db, username=user_data.username_or_email, is_deleted=False, schema_to_select=UserRead, return_as_model=True)

    if not db_user:
        raise UnauthorizedException("Invalid refresh token.")

    new_access_token = await create_access_token(data=create_token_payload(User(**db_user.model_dump())))
    return {"access_token": new_access_token, "token_type": "bearer"}
