from fastcrud import FastCRUD

from ..models import ServiceCategory
from ..schemas.service_category import ServiceCategoryCreate, ServiceCategoryRead, ServiceCategoryUpdate, \
    ServiceCategoryUpdateInternal, ServiceCategoryDelete

CRUDWorker = FastCRUD[
    ServiceCategory,
    ServiceCategoryCreate,
    ServiceCategoryUpdate,
    ServiceCategoryUpdateInternal,
    ServiceCategoryDelete,
    ServiceCategoryRead
]

crud_service_category = CRUDWorker(ServiceCategory)
