"""
Resume text extraction (PDF / DOCX) and NLP-based field parsing.
"""
import re
import os
from pathlib import Path
from typing import Dict, Any, List

# ── Tech skill keyword list ───────────────────────────────
TECH_SKILLS: List[str] = [
    "python", "java", "javascript", "typescript", "c", "c++", "c#",
    "go", "rust", "ruby", "php", "swift", "kotlin", "scala", "r",
    "react", "angular", "vue", "next.js", "svelte", "node.js", "express",
    "django", "flask", "fastapi", "spring", "laravel", "rails",
    "sql", "mysql", "postgresql", "sqlite", "mongodb", "redis",
    "cassandra", "dynamodb", "elasticsearch", "firebase",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform",
    "ansible", "jenkins", "github actions", "ci/cd",
    "machine learning", "deep learning", "nlp", "computer vision",
    "tensorflow", "pytorch", "keras", "scikit-learn", "huggingface",
    "pandas", "numpy", "matplotlib", "seaborn", "opencv",
    "html", "css", "sass", "tailwind", "bootstrap",
    "rest api", "graphql", "grpc", "websocket",
    "linux", "git", "agile", "scrum", "jira",
    "excel", "tableau", "power bi", "spark", "hadoop", "kafka",
]

EDUCATION_KEYWORDS = [
    "bachelor", "b.sc", "b.tech", "b.e.", "bsc", "btech",
    "master", "m.sc", "m.tech", "msc", "mtech", "mba",
    "phd", "ph.d", "doctorate",
    "diploma", "degree", "university", "college", "institute",
    "engineering", "science", "technology", "arts", "commerce",
]


# ── Text extraction ───────────────────────────────────────

def extract_text_from_pdf(file_path: str) -> str:
    """Extract text from a PDF using pdfplumber."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
        return "\n".join(text_parts).strip()
    except ImportError:
        raise RuntimeError("pdfplumber is not installed. Run: pip install pdfplumber")
    except Exception as e:
        raise RuntimeError(f"PDF extraction failed: {e}")


def extract_text_from_docx(file_path: str) -> str:
    """Extract text from a DOCX using python-docx."""
    try:
        from docx import Document
        doc = Document(file_path)
        return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
    except ImportError:
        raise RuntimeError("python-docx is not installed. Run: pip install python-docx")
    except Exception as e:
        raise RuntimeError(f"DOCX extraction failed: {e}")


def extract_text(file_path: str) -> str:
    """Route to correct extractor based on file extension."""
    ext = Path(file_path).suffix.lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".docx":
        return extract_text_from_docx(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ── NLP Parsing ───────────────────────────────────────────

def _load_spacy():
    """Lazy-load spaCy to avoid import overhead when not needed."""
    try:
        import spacy
        return spacy.load("en_core_web_sm")
    except Exception:
        return None


def _extract_name(text: str, nlp) -> str:
    """Use spaCy PERSON entity, fallback to first short text line."""
    if nlp:
        doc = nlp(text[:2000])  # only scan beginning
        persons = [ent.text for ent in doc.ents if ent.label_ == "PERSON"]
        if persons:
            return persons[0]
    # Fallback: first line ≤40 chars that looks like a name
    for line in text.split("\n")[:10]:
        line = line.strip()
        if 2 <= len(line) <= 40 and re.match(r"^[A-Za-z ,.'\-]+$", line):
            return line
    return ""


def _extract_education(text: str) -> str:
    """Find the first line containing an education keyword."""
    lower = text.lower()
    for line in text.split("\n"):
        ll = line.lower()
        if any(kw in ll for kw in EDUCATION_KEYWORDS):
            return line.strip()[:255]
    return ""


def _extract_experience_years(text: str) -> int:
    """Search for patterns like '5 years', '3+ years', etc."""
    patterns = [
        r"(\d+)\s*\+?\s*years?\s+(?:of\s+)?experience",
        r"experience\s+of\s+(\d+)\s*\+?\s*years?",
        r"(\d+)\s*\+?\s*yrs?",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return min(int(m.group(1)), 30)
    return 0


def _extract_skills(text: str) -> List[str]:
    """Match text against the TECH_SKILLS keyword list."""
    lower = text.lower()
    found = [skill for skill in TECH_SKILLS if skill in lower]
    return sorted(set(found))


def parse_resume(text: str) -> Dict[str, Any]:
    """
    Run full NLP parsing on extracted resume text.

    Returns:
        {
            name, education, experience_years, skills: List[str]
        }
    """
    nlp = _load_spacy()
    return {
        "name":             _extract_name(text, nlp),
        "education":        _extract_education(text),
        "experience_years": _extract_experience_years(text),
        "skills":           _extract_skills(text),
    }
