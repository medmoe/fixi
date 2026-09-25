from fastcrud import FastCRUD

from ..models import Payment

crud_payments: FastCRUD = FastCRUD(Payment)
