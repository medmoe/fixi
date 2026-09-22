from pathlib import Path
from string import Template

TEMPLATES_DIR = Path(__file__).parent

_SUBJECTS: dict[tuple[str, str], str] = {
    ("review_received", "ar"): "لقد تلقيت تقييماً جديداً",
    ("review_received", "fr"): "Vous avez reçu un nouvel avis",
    ("review_received", "en"): "You received a new review",
    ("worker_verification_approved", "ar"): "تم التحقق من ملفك الشخصي",
    ("worker_verification_approved", "fr"): "Votre profil a été vérifié",
    ("worker_verification_approved", "en"): "Your profile has been verified",
}


class EmailTemplateNotFound(Exception):
    pass


def render_email_template(template_name: str, language: str, variables: dict[str, str]) -> tuple[str, str]:
    """Renders `{template_name}_{language}.html`, substituting `$variable`
    placeholders. Returns (subject, html_body). Missing variables are left
    as-is rather than raising, since a notification failure must never
    block the event that triggered it."""
    path = TEMPLATES_DIR / f"{template_name}_{language}.html"
    try:
        raw_html = path.read_text(encoding="utf-8")
    except FileNotFoundError as exc:
        raise EmailTemplateNotFound(f"No email template for {template_name!r} in {language!r}") from exc

    html = Template(raw_html).safe_substitute(variables)
    subject = _SUBJECTS.get((template_name, language), template_name)
    return subject, html
