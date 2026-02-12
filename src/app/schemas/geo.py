from pydantic import BaseModel


class WorkerNearbyRead(BaseModel):
    user_id: int
    username: str
    bio: str | None
    location: str
    distance_km: float


class NearbyJobRead(BaseModel):
    job_id: int
    title: str
    description: str
    status: str
    customer_id: int
    customer_username: str
    customer_location: str
    distance_km: float
