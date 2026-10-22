from fastapi import HTTPException


class ApiError(HTTPException):
    """HTTPException whose body is {"detail": code} plus optional retry_after (and Retry-After)."""

    def __init__(self, status_code: int, detail: str, retry_after: int | None = None) -> None:
        headers = {"Retry-After": str(retry_after)} if retry_after else None
        super().__init__(status_code, detail, headers=headers)
        self.retry_after = retry_after

    def body(self) -> dict:
        out: dict = {"detail": self.detail}
        if self.retry_after:
            out["retry_after"] = self.retry_after
        return out
