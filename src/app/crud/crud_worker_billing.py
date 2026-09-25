from fastcrud import FastCRUD

from ..models import WorkerBilling

crud_worker_billing: FastCRUD = FastCRUD(WorkerBilling)
