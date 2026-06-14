from typing import Sequence

from fastcrud import FastCRUD
from sqlalchemy import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import ServiceCategory
from ..schemas.service_category import (
    ServiceCategoryCreate,
    ServiceCategoryDelete,
    ServiceCategoryRead,
    ServiceCategoryUpdate,
    ServiceCategoryUpdateInternal,
)

CRUDWorker = FastCRUD[
    ServiceCategory,
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryUpdateInternal,
    ServiceCategoryDelete,
    ServiceCategoryRead
]


class CRUDServiceCategory(CRUDWorker):
    async def create_many(
            self,
            db: AsyncSession,
            objects: Sequence[ServiceCategoryCreate],
    ) -> list[ServiceCategory]:
        if not objects:
            return []

        values = [obj.model_dump() for obj in objects]
        statement = insert(ServiceCategory).returning(ServiceCategory)
        result = await db.execute(statement, values)
        await db.commit()
        return list(result.scalars().all())


crud_service_category = CRUDServiceCategory(ServiceCategory)
