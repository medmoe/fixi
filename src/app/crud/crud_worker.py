from fastcrud import FastCRUD

from ..models.worker import WorkerProfile
from ..schemas.worker import (
    WorkerCreate,
    WorkerCreateInternal,
    WorkerPublicRead,
    WorkerRead,
    WorkerUpdate,
    WorkerUpdateInternal,
    WorkerVerificationUpdate,
)

CRUDWorker = FastCRUD[
    WorkerProfile,
    WorkerCreate,
    WorkerUpdate | WorkerVerificationUpdate,
    WorkerUpdateInternal,
    WorkerCreateInternal,
    WorkerRead | WorkerPublicRead,
]

crud_workers = CRUDWorker(WorkerProfile)
