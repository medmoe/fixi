from fastcrud import FastCRUD

from ..models import AdminActionLog

crud_admin_action_log: FastCRUD = FastCRUD(AdminActionLog)
