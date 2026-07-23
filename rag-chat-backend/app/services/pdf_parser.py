"""
PDF text extraction, page-aware.
Keeping extraction page-aware (rather than one giant string) is what lets
citations point to an exact page number later in the pipeline.
"""
import fitz  # PyMuPDF


def extract_pages(file_bytes: bytes) -> list[dict]:
    """
    Returns [{"page_number": 1, "text": "..."}, ...]
    page_number is 1-indexed to match how humans reference PDF pages.
    """
    pages = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for i, page in enumerate(doc):
            text = page.get_text("text")
            if text and text.strip():
                pages.append({"page_number": i + 1, "text": text})
    return pages


def get_page_count(file_bytes: bytes) -> int:
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        return doc.page_count
