from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field

class TradeCategoryBase(BaseModel):
    pass

class TradeCategory(TradeCategoryBase):
    pass

class TradeCategoryCreate(TradeCategoryBase):
    pass

class TradeCategoryUpdate(TradeCategoryBase):
    pass

class TradeCategoryInternal(TradeCategoryBase):
    pass


class TradeCategoryRead(TradeCategoryBase):
    pass

class TradeCategoryDelete(TradeCategoryBase):
    pass


