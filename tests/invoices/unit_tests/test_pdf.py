"""Unit test for html_to_pdf -- does WeasyPrint actually produce a valid
PDF, including with Arabic (RTL, shaped) text?"""

from src.app.services.invoices.pdf import html_to_pdf


class TestHtmlToPdf:
    def test_produces_valid_pdf_bytes(self):
        pdf = html_to_pdf("<html><body><h1>Invoice</h1></body></html>")

        assert isinstance(pdf, bytes)
        assert pdf.startswith(b"%PDF")

    def test_renders_arabic_text_without_error(self):
        pdf = html_to_pdf('<html dir="rtl"><body><h1>فاتورة رقم 1</h1></body></html>')

        assert pdf.startswith(b"%PDF")
