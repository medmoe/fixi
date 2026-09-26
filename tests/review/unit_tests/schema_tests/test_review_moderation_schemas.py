"""Schema tests for flagged-review moderation (Phase 8 Issue 7)."""

from datetime import UTC, datetime

import pytest
from pydantic import ValidationError

from src.app.schemas.review import FlaggedReviewRead, ReviewReportCreateRequest


class TestReviewReportCreateRequest:
    def test_reason_optional(self):
        schema = ReviewReportCreateRequest()
        assert schema.reason is None

    def test_valid_with_reason(self):
        schema = ReviewReportCreateRequest(reason="Spam content")
        assert schema.reason == "Spam content"

    def test_reason_max_length(self):
        with pytest.raises(ValidationError):
            ReviewReportCreateRequest(reason="a" * 501)

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            ReviewReportCreateRequest(reason="ok", unexpected="value")  # type: ignore[call-arg]


class TestFlaggedReviewRead:
    def payload(self, **overrides) -> dict:
        defaults = {
            "id": 1, "rating": 1, "comment": "Rude", "reviewer_name": "Ali", "reviewee_name": "Sara",
            "report_count": 2, "created_at": datetime.now(UTC),
        }
        return {**defaults, **overrides}

    def test_valid(self):
        schema = FlaggedReviewRead(**self.payload())
        assert schema.report_count == 2
        assert schema.reviewer_name == "Ali"
        assert schema.reviewee_name == "Sara"

    def test_comment_can_be_none(self):
        schema = FlaggedReviewRead(**self.payload(comment=None))
        assert schema.comment is None

    def test_from_orm_like_row(self):
        class FakeRow:
            id = 1
            rating = 1
            comment = None
            reviewer_name = "Ali"
            reviewee_name = "Sara"
            report_count = 3
            created_at = datetime.now(UTC)

        schema = FlaggedReviewRead.model_validate(FakeRow())
        assert schema.report_count == 3

    def test_extra_fields_forbidden(self):
        with pytest.raises(ValidationError):
            FlaggedReviewRead(**self.payload(unexpected="value"))
