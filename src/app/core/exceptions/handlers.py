from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import ValidationError


def register_validation_exception_handlers(app: FastAPI) -> None:
    """
    FastAPI's automatic 422 conversion only applies to validation errors
    raised during its own query/path/header param extraction.

    When a Depends() dependency is a plain Pydantic BaseModel (e.g.
    Annotated[WorkerProfileFilter, Depends()]) and a model_validator raises
    ValueError inside it, Pydantic raises its own ValidationError — which is
    NOT automatically caught by FastAPI and would otherwise surface as a 500.

    This handler catches that case and reshapes it into the same response
    format FastAPI uses for RequestValidationError, so client code (and
    tests) can rely on a consistent 422 shape regardless of which layer
    raised the validation error.
    """

    @app.exception_handler(ValidationError)
    async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
        # include_context=False strips the "ctx" field, which otherwise
        # contains the raw exception object (e.g. the ValueError instance
        # raised inside a model_validator) — not JSON serializable.
        # include_url=False drops the pydantic docs URL, matching FastAPI's
        # own RequestValidationError shape more closely.
        errors = exc.errors(include_context=False, include_url=False)
        for error in errors:
            # normalize the "loc" so it reads like a query-param error,
            # matching what FastAPI's native query validation would produce
            error["loc"] = ("query", *error.get("loc", ()))
            if "input" in error:
                # coerce any non-JSON-safe input value (datetime, Decimal, model
                # instances, etc.) into something JSONResponse can actually encode
                error["input"] = jsonable_encoder(error["input"])
        return JSONResponse(
            status_code=422,
            content={"detail": errors},
        )
