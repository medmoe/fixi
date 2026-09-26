from fastapi import APIRouter

from .admin_flagged_reviews import router as admin_flagged_reviews_router
from .admin_users import router as admin_users_router
from .admin_worker_verifications import router as admin_worker_verifications_router
from .auth import router as auth_v2_router
from .files import router as files_router
from .jobs import router as jobs_router
from .notifications import router as notifications_router
from .reviews import router as reviews_router
from .trade_category import router as trade_category_router
from .users import router as users_router
from .worker_billing import router as worker_billing_router
from .worker_profile import router as worker_profiles_router

# from .worker_profile import router as worker_router

router = APIRouter(prefix="/v1")
router.include_router(auth_v2_router)
router.include_router(users_router)
router.include_router(files_router)
router.include_router(trade_category_router)
router.include_router(worker_profiles_router)
router.include_router(jobs_router)
router.include_router(notifications_router)
router.include_router(worker_billing_router)
router.include_router(reviews_router)
router.include_router(admin_users_router)
router.include_router(admin_worker_verifications_router)
router.include_router(admin_flagged_reviews_router)
