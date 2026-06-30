# ruff: noqa
from fastcrud.exceptions.http_exceptions import (
    CustomException,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    UnauthorizedException,
    UnprocessableEntityException,
    RateLimitException,
)

from fastapi import HTTPException, status


class DuplicateValueException(HTTPException):
    def __init__(self, detail: str = "Duplicate value error"):
        super().__init__(status_code=status.HTTP_409_CONFLICT, detail=detail)
