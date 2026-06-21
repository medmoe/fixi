from fastapi import APIRouter

from .auth import router as auth_v2_router
from .files import router as files_router
from .login import router as login_router
from .logout import router as logout_router
from .marketplace import router as marketplace_router
from .posts import router as posts_router
from .rate_limits import router as rate_limits_router
from .service_categories import router as service_category_router
from .tasks import router as tasks_router
from .tiers import router as tiers_router
from .users import router as users_router
from .worker import router as worker_router

router = APIRouter(prefix="/v1")
router.include_router(auth_v2_router)
router.include_router(login_router)
router.include_router(logout_router)
router.include_router(marketplace_router)
router.include_router(users_router)
router.include_router(posts_router)
router.include_router(tasks_router)
router.include_router(tiers_router)
router.include_router(rate_limits_router)
router.include_router(files_router)
router.include_router(worker_router)
router.include_router(service_category_router)
