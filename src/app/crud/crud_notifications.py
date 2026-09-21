from fastcrud import FastCRUD

from ..models import Notification

crud_notifications: FastCRUD = FastCRUD(Notification)
