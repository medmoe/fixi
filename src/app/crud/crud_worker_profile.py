from fastcrud import FastCRUD

from ..models.worker_profile import WorkerProfile
from ..schemas.worker_profile import (
    WorkerProfileCreate,
    WorkerProfileRead,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
    WorkerProfileDelete
)

CRUDWorker = FastCRUD[
    WorkerProfile,
    WorkerProfileCreate,
    WorkerProfileUpdate,
    WorkerProfileUpdateInternal,
    WorkerProfileDelete,
    WorkerProfileRead
]

crud_workers = CRUDWorker(WorkerProfile)
