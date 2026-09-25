from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from ..core.schemas import TimestampSchema
from ..models.payment import PaymentMethod, PaymentStatus


class PaymentBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    payer_id: int
    amount: Decimal
    method: PaymentMethod
    job_id: int | None = None
    subscription_id: int | None = None
    payee_id: int | None = None
    recorded_by: int | None = None
    status: PaymentStatus = PaymentStatus.PENDING


class PaymentCreateInternal(PaymentBase):
    pass


class PaymentUpdateInternal(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: PaymentStatus


class PaymentRead(TimestampSchema, PaymentBase):
    model_config = ConfigDict(extra="forbid", from_attributes=True)

    id: int
