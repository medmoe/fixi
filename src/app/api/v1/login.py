from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.config import settings
from ...core.db.database import async_get_db
from ...core.exceptions.http_exceptions import UnauthorizedException
from ...core.schemas import Token
from ...core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    TokenType,
    authenticate_user,
    create_access_token,
    create_token_payload,
    create_refresh_token,
    verify_token,
)
from ...crud.crud_users import crud_users

router = APIRouter(tags=["login"])


@router.post("/login", response_model=Token)
async def login_for_access_token(
        response: Response,
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
        db: Annotated[AsyncSession, Depends(async_get_db)],
) -> dict[str, str]:
    user = await authenticate_user(username_or_email=form_data.username, password=form_data.password, db=db)
    if not user:
        raise UnauthorizedException("Wrong username, email or password.")

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = create_token_payload(user)
    access_token = await create_access_token(data=token_payload, expires_delta=access_token_expires)

    refresh_token = await create_refresh_token(data=token_payload)
    max_age = settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    # set the secure flag based on environment 'dev' or 'prod'
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=max_age
    )

    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/refresh")
async def refresh_access_token(request: Request, db: AsyncSession = Depends(async_get_db)) -> dict[str, str]:
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise UnauthorizedException("Refresh token missing.")

    user_data = await verify_token(refresh_token, TokenType.REFRESH, db)
    if not user_data:
        raise UnauthorizedException("Invalid refresh token.")

    if "@" in user_data.username_or_email:
        db_user = await crud_users.get(db=db, email=user_data.username_or_email, is_deleted=False)
    else:
        db_user = await crud_users.get(db=db, username=user_data.username_or_email, is_deleted=False)

    if not db_user:
        raise UnauthorizedException("Invalid refresh token.")

    new_access_token = await create_access_token(data=create_token_payload(db_user))
    return {"access_token": new_access_token, "token_type": "bearer"}
