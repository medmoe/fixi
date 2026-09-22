import pytest

from src.app.services.notifications.email_templates import EmailTemplateNotFound, render_email_template


@pytest.mark.unit
class TestRenderEmailTemplate:
    def test_renders_the_french_template_with_substituted_variables(self):
        subject, html = render_email_template(
            "review_received",
            "fr",
            {"recipient_name": "Amina", "reviewer_name": "Karim", "rating": "5", "job_title": "Plomberie", "comment": "Super travail", "app_url": "https://fixi.example/dashboard"},
        )

        assert subject == "Vous avez reçu un nouvel avis"
        assert "Amina" in html
        assert "Karim" in html
        assert "5/5" in html
        assert "Plomberie" in html
        assert "Super travail" in html
        assert "https://fixi.example/dashboard" in html

    def test_renders_the_arabic_template_with_substituted_variables(self):
        subject, html = render_email_template(
            "review_received",
            "ar",
            {"recipient_name": "أمينة", "reviewer_name": "كريم", "rating": "5", "job_title": "سباكة", "comment": "عمل رائع", "app_url": "https://fixi.example/dashboard"},
        )

        assert subject == "لقد تلقيت تقييماً جديداً"
        assert 'dir="rtl"' in html
        assert "أمينة" in html
        assert "كريم" in html

    def test_renders_the_english_template_with_substituted_variables(self):
        subject, html = render_email_template(
            "review_received",
            "en",
            {"recipient_name": "Amina", "reviewer_name": "Karim", "rating": "5", "job_title": "Plumbing", "comment": "Great work", "app_url": "https://fixi.example/dashboard"},
        )

        assert subject == "You received a new review"
        assert "Amina" in html
        assert "Karim" in html
        assert "5/5" in html
        assert "Plumbing" in html
        assert "Great work" in html

    def test_renders_worker_verification_approved_in_every_language(self):
        for language in ("ar", "fr", "en"):
            subject, html = render_email_template(
                "worker_verification_approved", language, {"recipient_name": "Yacine", "app_url": "https://fixi.example/dashboard"}
            )
            assert subject
            assert "Yacine" in html
            assert "https://fixi.example/dashboard" in html

    def test_missing_variables_are_left_blank_rather_than_raising(self):
        subject, html = render_email_template("review_received", "fr", {})
        assert subject
        assert html  # renders without KeyError even though every $variable is unset

    def test_unknown_template_raises_email_template_not_found(self):
        with pytest.raises(EmailTemplateNotFound):
            render_email_template("does_not_exist", "fr", {})

    def test_unknown_language_raises_email_template_not_found(self):
        with pytest.raises(EmailTemplateNotFound):
            render_email_template("review_received", "de", {})
