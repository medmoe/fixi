## Setting Up PyCharm Professional Debugger with Docker

### Step 1 — Install `debugpy` in your project

```bash
# add to pyproject.toml
uv add debugpy --dev

# or if using requirements
pip install debugpy
```

---

### Step 2 — Add debug entry point to your app

Create a debug launcher that wraps your FastAPI app with `debugpy`:

```python
# src/debug_main.py
import debugpy

# ✅ listen on all interfaces so PyCharm can connect from host machine
debugpy.listen(("0.0.0.0", 5678))
print("⏳ Waiting for debugger to attach on port 5678...")
debugpy.wait_for_client()  # blocks until PyCharm connects
print("✅ Debugger attached — starting app")

# then start your app normally
import uvicorn
uvicorn.run(
    "src.app.main:app",
    host="0.0.0.0",
    port=8000,
    reload=False,  # ✅ must be False — reload conflicts with debugpy
)
```

---

### Step 3 — Add debug service to `docker-compose.yml`

```yaml
# docker-compose.yml

services:
  web:
    build: .
    command: python -m src.debug_main   # ✅ use debug launcher
    ports:
      - "8000:8000"
      - "5678:5678"                     # ✅ expose debugpy port to host
    volumes:
      - ./src:/app/src                  # ✅ live code sync
    environment:
      - PYTHONDONTWRITEBYTECODE=1
      - PYTHONUNBUFFERED=1             # ✅ see print statements immediately
    env_file:
      - src/.env
```

Or add a separate debug service that doesn't affect your normal `web` service:

```yaml
services:
  web:
    # ... your existing web service unchanged

  web-debug:
    build: .
    command: python -m debugpy --listen 0.0.0.0:5678 --wait-for-client -m uvicorn src.app.main:app --host 0.0.0.0 --port 8000
    ports:
      - "8000:8000"
      - "5678:5678"
    volumes:
      - ./src:/app/src
    depends_on:
      - db
      - redis
    env_file:
      - src/.env
```

---

### Step 4 — Configure PyCharm Remote Debugger

1. Go to **Run → Edit Configurations**
2. Click **+** → select **Python Debug Server**
3. Fill in:

```
Name:           Fixi Docker Debugger
IDE host name:  localhost
Port:           5678
```

4. Under **Path mappings** click the folder icon and add:

```
Local path:   /home/medse/PycharmProjects/fixi/src
Remote path:  /app/src
```

This tells PyCharm how to map your local source files to the container's file paths.

5. Click **OK** to save.

---

### Step 5 — Start the debug session

**Terminal:**
```bash
# start the debug container
docker compose up web-debug
# you'll see: ⏳ Waiting for debugger to attach on port 5678...
```

**PyCharm:**
1. Set a breakpoint — click the gutter next to any line
2. Click the **bug icon** (Debug) next to your `Fixi Docker Debugger` config
3. PyCharm connects → container prints `✅ Debugger attached`
4. Make a request to your API → execution stops at your breakpoint

---

### Step 6 — Verify path mappings work

If breakpoints show as grey with a warning icon, the path mapping is wrong. Check by printing the file path inside your app:

```python
# temporarily add to any endpoint
import os
print(__file__)
# output: /app/src/app/api/v1/auth.py
# → remote path should be /app/src
# → local path should be /home/medse/PycharmProjects/fixi/src
```

---

### Step 7 — Configure for pytest debugging (optional)

To debug tests running inside Docker:

```yaml
# docker-compose.test.yml — add debug variant
services:
  tests-debug:
    build: .
    command: >
      python -m debugpy --listen 0.0.0.0:5678 --wait-for-client
      -m pytest tests/ -v -x --no-cov
    ports:
      - "5678:5678"
    volumes:
      - ./src:/app/src
      - ./tests:/app/tests
    env_file:
      - src/.env.test
    depends_on:
      - test-db
      - test-redis
```

Run:
```bash
docker compose -f docker-compose.test.yml up tests-debug
# PyCharm connects → pytest runs with debugger attached
```

---

### Debugging workflow

```
1. Set breakpoint in PyCharm (red dot in gutter)
2. docker compose up web-debug
3. Click debug button in PyCharm
4. Hit the endpoint via browser/Swagger/curl/httpx
5. Execution pauses at breakpoint

PyCharm debug panel gives you:
├── Variables pane    → inspect all local/global variables
├── Console          → evaluate expressions live
├── Call stack       → see full execution path
└── Step controls:
    F8  → Step Over (next line)
    F7  → Step Into (enter function)
    F9  → Resume (continue to next breakpoint)
    ⇧F8 → Step Out (exit current function)
```

---

### Common issues

| Issue | Cause | Fix |
|---|---|---|
| Breakpoints grey/hollow | Path mapping wrong | Check `__file__` output vs mapping |
| Connection refused | Port 5678 not exposed | Add `5678:5678` to ports |
| App starts without waiting | `wait_for_client()` missing | Add it to debug launcher |
| Reload conflicts | `reload=True` with debugpy | Set `reload=False` |
| Timeout connecting | Container not running | `docker compose up web-debug` first |
| Variables show `<not available>` | Code optimized | Add `PYTHONDONTWRITEBYTECODE=1` |