from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud.crud_service_category import crud_service_category
from ...schemas.service_category import ServiceCategoryRead

router = APIRouter(tags=["Service Categories"], prefix="/service-categories")


@router.get('', response_model=list[ServiceCategoryRead])
async def get_service_categories(db: Annotated[AsyncSession, Depends(async_get_db)]):
    return await crud_service_category.get_all(db=db)

