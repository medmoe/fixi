from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ...api.dependencies import require_role
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
    get_password_hash,
)
from ...crud.crud_users import crud_users
from ...models import CustomerProfile, HandymanProfile, User, UserRole
from ...schemas.auth import LoginRequest, RegisterCustomer, RegisterHandyman, RegisterRequest, RegisterResponse

router = APIRouter(tags=["auth-v2"], prefix="/auth")


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register_v2(
        payload: RegisterRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> RegisterResponse:
    user = User(
        name=payload.name,
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role_type=payload.role,
    )

    try:
        async with db.begin():
            email_exists = await crud_users.exists(db=db, email=payload.email)
            if email_exists:
                raise DuplicateValueException("Email is already registered")

            username_exists = await crud_users.exists(db=db, username=payload.username)
            if username_exists:
                raise DuplicateValueException("Username not available")

            db.add(user)
            await db.flush()

            if isinstance(payload, RegisterCustomer):
                db.add(
                    CustomerProfile(
                        user_id=user.id,
                        saved_addresses=payload.saved_addresses,
                        loyalty_points=payload.loyalty_points,
                    )
                )
            elif isinstance(payload, RegisterHandyman):
                db.add(
                    HandymanProfile(
                        user_id=user.id,
                        skill_category=payload.skill_category,
                        skills=payload.skills,
                        certification_urls=payload.certification_urls,
                        hourly_rate=payload.hourly_rate,
                        availability=payload.availability,
                    )
                )
    except IntegrityError as exc:
        raise DuplicateValueException("Username or email not available") from exc

    await db.refresh(user)
    return RegisterResponse(id=user.id, username=user.username, email=user.email, role=user.role_type)


@router.post("/login", response_model=Token)
async def login_v2(
        response: Response,
        credentials: LoginRequest,
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    user = await authenticate_user(username_or_email=credentials.username_or_email, password=credentials.password,
                                   db=db)
    if not user:
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
        secure=False,
        samesite="lax",
        max_age=max_age,
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/handyman-area", dependencies=[Depends(require_role(UserRole.worker.value))])
async def handyman_only_example() -> dict[str, str]:
    return {"message": "Handyman access granted"}
