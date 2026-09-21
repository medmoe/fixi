from fastcrud import FastCRUD
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import DeviceToken
from ..schemas.device_token import DeviceTokenCreateInternal, DeviceTokenRead, DeviceTokenUpdateInternal


class CRUDDeviceToken(FastCRUD):
    async def register(self, db: AsyncSession, object: DeviceTokenCreateInternal) -> DeviceTokenRead:
        """Upsert by token -- a device re-registering an already-known token
        (e.g. a different user logging into the same browser) reassigns it
        rather than creating a duplicate row."""
        existing = await self.exists(db=db, token=object.token)
        if existing:
            return await self.update(
                db=db,
                object=DeviceTokenUpdateInternal(user_id=object.user_id, platform=object.platform, last_seen=object.last_seen),
                token=object.token,
                schema_to_select=DeviceTokenRead,
                return_as_model=True,
            )
        return await self.create(db=db, object=object, schema_to_select=DeviceTokenRead, return_as_model=True)


crud_device_tokens: CRUDDeviceToken = CRUDDeviceToken(DeviceToken)
