from typing import cast

from weasyprint import HTML


def html_to_pdf(html: str) -> bytes:
    """Renders HTML (+ inline CSS) to PDF bytes via WeasyPrint -- Pango's
    text shaping handles correctly-joined Arabic script, which is why this
    isn't a pure-Python PDF lib building pages by hand (see invoice
    templates for the actual AR/FR markup)."""
    return cast(bytes, HTML(string=html).write_pdf())
