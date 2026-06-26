from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import EnvironmentOption
from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import DuplicateValueException, UnauthorizedException
from ...core.schemas import Token
from ...core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    create_token_payload,
    get_password_hash, verify_password,
)
from ...crud.crud_users import crud_users
from ...models import CustomerProfile, WorkerProfile, User
from ...schemas.auth import LoginRequest, RegisterCustomer, RegisterWorker, RegisterRequest, RegisterResponse

router = APIRouter(tags=["auth-v2"], prefix="/auth")


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register_v2(
        payload: RegisterRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> RegisterResponse:
    async with db.begin():
        existing = await crud_users.get_by_email_or_username(db=db, email=payload.email, username=payload.username)
        if existing:
            raise DuplicateValueException("Username or email already registered")

        user = User(hashed_password=get_password_hash(payload.password), username=payload.username, email=payload.email, name=payload.name)
        db.add(user)
        await db.flush()

        if isinstance(payload, RegisterCustomer):
            db.add(CustomerProfile(user_id=user.id))
        elif isinstance(payload, RegisterWorker):
            db.add(WorkerProfile(user_id=user.id))

        await db.refresh(user)
    return RegisterResponse(id=user.id, username=user.username, email=user.email, role=user.role_type)


# rate limiter should be implemented here
@router.post("/login", response_model=Token)
async def login_v2(
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

    token_payload = create_token_payload(user)
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
