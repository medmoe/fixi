from typing import Annotated, cast, Sequence

from fastapi import APIRouter, Depends
from fastcrud.exceptions.http_exceptions import DuplicateValueException, NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_superuser
from ...core.db.database import async_get_db
from ...crud.crud_service_category import crud_service_category
from ...models.service_category import ServiceCategory
from ...schemas.service_category import ServiceCategoryRead, ServiceCategoryCreate

router = APIRouter(tags=["Service Categories"], prefix="/service-categories")


@router.get('', response_model=list[ServiceCategoryRead], status_code=200)
async def get_service_categories(db: Annotated[AsyncSession, Depends(async_get_db)]) -> list[ServiceCategoryRead]:
    categories = await crud_service_category.get_multi(db=db, schema_to_select=ServiceCategoryRead)
    return cast(list[ServiceCategoryRead], categories["data"])


@router.post('', response_model=ServiceCategoryRead, status_code=201)
async def create_service_category(
        payload: ServiceCategoryCreate,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        _: Annotated[dict, Depends(get_current_superuser)]) -> ServiceCategoryRead:
    exists = await crud_service_category.exists(db=db, name=payload.name)

    if exists:
        raise DuplicateValueException("Service category already exists")

    created_category = await crud_service_category.create(db=db, object=payload)
    category = await crud_service_category.get(
        db=db, id=created_category.id, schema_to_select=ServiceCategoryRead
    )

    if category is None:
        raise NotFoundException("Service category not found")

    return cast(ServiceCategoryRead, category)


@router.post("/bulk", response_model=list[ServiceCategoryRead], status_code=201)
async def bulk_create_service_categories(
        payload: Sequence[ServiceCategoryCreate],
        db: Annotated[AsyncSession, Depends(async_get_db)],
        _: Annotated[dict, Depends(get_current_superuser)]
) -> list[ServiceCategoryRead]:
    names = set([category.name for category in payload])
    existing_result = await db.execute(select(ServiceCategory.name).where(ServiceCategory.name.in_(names)))
    existing_names = set(existing_result.scalars().all())

    if existing_names:
        raise DuplicateValueException("Service category already exists")

    created_categories = await crud_service_category.create_many(db=db, objects=payload)
    return [cast(ServiceCategoryRead, category) for category in created_categories]
