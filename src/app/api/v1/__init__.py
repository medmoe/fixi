from fastapi import APIRouter

from .auth import router as auth_v2_router
from .files import router as files_router
from .users import router as users_router

# from .worker_profile import router as worker_router

router = APIRouter(prefix="/v1")
router.include_router(auth_v2_router)
router.include_router(users_router)
router.include_router(files_router)
# router.include_router(worker_router)
