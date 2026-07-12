import os
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
import socket
from .api import router
from .core.config import settings
from .core.setup import create_application, lifespan_factory

# admin = create_admin_interface()
if os.getenv("DEBUG_MODE") == "true":
    try:
        import pydevd_pycharm

        pydevd_pycharm.settrace(
            'host.docker.internal',  # ✅ reaches host machine from inside container
            port=37363, # update this port number to match the port given by pycharm debugger
            stdout_to_server=True,
            stderr_to_server=True,
            suspend=False,  # ✅ don't pause on connect — only on breakpoints
        )
    except Exception as e:
        print(f"Debugger not attached: {e}")


@asynccontextmanager
async def lifespan_with_admin(app: FastAPI) -> AsyncGenerator[None, None]:
    """Custom lifespan that includes admin initialization."""
    # Get the default lifespan
    default_lifespan = lifespan_factory(settings)

    # Run the default lifespan initialization and our admin initialization
    async with default_lifespan(app):
        #
        # Initialize admin interface if it exists
        # if admin:
        #     # Initialize admin database and setup
        #     await admin.initialize()

        yield


app = create_application(router=router, settings=settings, lifespan=lifespan_with_admin)

# Mount admin interface if enabled
# if admin:
#     app.mount(settings.CRUD_ADMIN_MOUNT_PATH, admin.app)
