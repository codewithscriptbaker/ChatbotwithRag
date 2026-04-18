from pathlib import Path


def extract_text(file_path: Path) -> str:
    ext = file_path.suffix.lower()

    if ext == ".pdf":
        return _parse_pdf(file_path)
    elif ext == ".docx":
        return _parse_docx(file_path)
    elif ext in {".txt", ".md", ".csv"}:
        return _parse_text(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


def _parse_pdf(file_path: Path) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(str(file_path))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text.strip())
    return "\n\n".join(pages)


def _parse_docx(file_path: Path) -> str:
    from docx import Document

    doc = Document(str(file_path))
    return "\n\n".join(para.text for para in doc.paragraphs if para.text.strip())


def _parse_text(file_path: Path) -> str:
    return file_path.read_text(encoding="utf-8", errors="replace")
