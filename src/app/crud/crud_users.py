from fastcrud import FastCRUD

from src.app.models import User

from ..schemas.user import UserCreateInternal, UserDelete, UserRead, UserUpdate, UserUpdateInternal


class CRUDUser(FastCRUD[User, UserCreateInternal, UserUpdate, UserUpdateInternal, UserDelete, UserRead]):
    pass


crud_users = CRUDUser(User)
