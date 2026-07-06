from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from ...core.db.database import async_get_db
from ...crud.crud_trade_categories import crud_trade_category
from ...schemas.trade_category import TradeCategoryRead, TradeCategoryWithChildren

router = APIRouter(tags=["Trade Category"])


# response_model uses TradeCategoryWithChildren (superset of TradeCategoryRead) so that
# the nested=true branch can include children; flat items will have children=[] by default.
@router.get("/trade-categories", response_model=list[TradeCategoryWithChildren])
async def read_trade_categories(
        request: Request,
        response: Response,
        db: Annotated[AsyncSession, Depends(async_get_db)],
        nested: bool = False,
) -> list[TradeCategoryWithChildren] | list[TradeCategoryRead]:
    response.headers["Cache-Control"] = "public, max-age=3600"
    if nested:
        return await crud_trade_category.get_nested(db=db)

    result = await crud_trade_category.get_multi(
        db=db,
        schema_to_select=TradeCategoryRead,
        return_as_model=True,
    )
    return result["data"]
