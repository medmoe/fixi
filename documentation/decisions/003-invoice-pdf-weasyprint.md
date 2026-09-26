# 003 — Invoice PDFs: WeasyPrint, not a pure-Python PDF library

## Decision

Phase 8 Issue 3 (invoice generation, AR + FR) renders invoices as HTML (using the same `string.Template` `$var` pattern as the notification email templates) and converts to PDF with **WeasyPrint**, rather than a pure-Python PDF-drawing library (fpdf2, reportlab).

## Why

The acceptance bar was "generates correctly in both languages" — for Arabic that means correct script shaping and joining (a plain PDF-drawing library has no text-shaping engine and would render disconnected/wrong-order Arabic letters). WeasyPrint delegates text layout to Pango, which shapes Arabic correctly via CSS (`dir="rtl"`) with no extra library-specific work, and reuses the HTML-template pattern already established for AR/FR/EN notification emails instead of introducing a second templating approach.

## Alternatives considered

- **fpdf2 / reportlab** (pure Python, no system dependencies): would need `arabic-reshaper` + `python-bidi` bolted on to get correct Arabic shaping, plus manual RTL layout math (right-aligned text, reversed table columns) built by hand — meaningfully more code and more ways to get Arabic subtly wrong, for the sake of avoiding system dependencies.
- **wkhtmltopdf / pdfkit**: also needs a system binary, and has known unreliable RTL/complex-script rendering; effectively no better than WeasyPrint on the one axis that mattered here.

## Consequences

- The Docker image (`Dockerfile`, final stage) needs Pango/Cairo/GDK-Pixbuf/HarfBuzz system libraries plus fonts (DejaVu for Latin/French, Amiri for Arabic Naskh) — this is why `web`'s image is larger than a typical FastAPI image, and why `web`/`worker`/`tests` all need rebuilding (not just a `pip`/`uv` sync) whenever these system packages change.
- Invoice PDFs are generated lazily on first request and cached via `WorkerBilling.invoice_key` (MinIO) rather than regenerated per request — a `WeasyPrint` render isn't free, and the invoice content doesn't change after the fact.
- If this dependency ever needs removing (e.g. to shrink the image), a hand-rolled Arabic-shaping pipeline would be the real cost of doing so — not just swapping libraries.
