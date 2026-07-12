import debugpy

# listen on all interfaces so Pycharm can connect from host machine
debugpy.listen("0.0.0.0", 5678)
print("Waiting for debugger to attach on port 5678...")
debugpy.wait_for_client()
print("Debugger attached! — starting app")

# start app normally
import uvicorn

uvicorn.run(
    'src.app.main:app',
    host="0.0.0.0",
    port=8000,
    reload=False,  # Must be False — reload conflicts with debugpy
)
