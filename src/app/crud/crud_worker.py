from fastcrud import FastCRUD

from ..models.worker import Worker
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
    Worker,
    WorkerCreate,
    WorkerUpdate | WorkerVerificationUpdate,
    WorkerUpdateInternal,
    WorkerCreateInternal,
    WorkerRead | WorkerPublicRead,
]

crud_workers = CRUDWorker(Worker)
