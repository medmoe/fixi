from fastcrud import FastCRUD

from ..models import NotificationLog

crud_notification_logs: FastCRUD = FastCRUD(NotificationLog)
