"""
ATS compatibility checking service.
"""
import re
from typing import Dict, Any, List

class ATSChecker:
    ATS_ISSUES = [
        { "id": "tables", "check": "contains_tables", "severity": "high",
          "message": "Resume contains table formatting — most ATS cannot parse tables",
          "suggestion": "Replace tables with plain bullet points" },
        { "id": "columns", "check": "has_multiple_columns", "severity": "high",
          "message": "Multi-column layout detected — ATS reads left-to-right, mixing columns",
          "suggestion": "Use single-column layout throughout" },
        { "id": "contact_position", "check": "contact_not_at_top", "severity": "medium",
          "message": "Contact information not found in top section",
          "suggestion": "Place name, email, phone in first 5 lines" },
        { "id": "section_headers", "check": "missing_standard_headers", "severity": "medium",
          "message": "Standard section headers missing",
          "suggestion": "Use: Experience, Education, Skills, Summary" },
        { "id": "length", "check": "bad_length", "severity": "low",
          "message": "Resume length outside optimal range (400-800 words)",
          "suggestion": "Aim for 1 page (entry level) or 2 pages (senior)" },
    ]

    def check(self, resume_text: str) -> Dict[str, Any]:
        issues = []
        
        # 1. contains_tables
        if self._contains_tables(resume_text):
            issues.append(self._get_issue_by_id("tables"))
            
        # 2. has_multiple_columns
        if self._has_multiple_columns(resume_text):
            issues.append(self._get_issue_by_id("columns"))
            
        # 3. contact_not_at_top
        if self._contact_not_at_top(resume_text):
            issues.append(self._get_issue_by_id("contact_position"))
            
        # 4. missing_standard_headers
        if self._missing_standard_headers(resume_text):
            issues.append(self._get_issue_by_id("section_headers"))
            
        # 5. bad_length
        if self._bad_length(resume_text):
            issues.append(self._get_issue_by_id("length"))

        score = max(0.0, 100.0 - sum(
            15 if i['severity'] == 'high' else 8 if i['severity'] == 'medium' else 3
            for i in issues
        ))
        
        return {
            "ats_score": score,
            "issues": issues,
            "passed": score >= 70.0
        }

    def _get_issue_by_id(self, issue_id: str) -> dict:
        for issue in self.ATS_ISSUES:
            if issue["id"] == issue_id:
                return {
                    "issue": issue["message"],
                    "severity": issue["severity"],
                    "suggestion": issue["suggestion"]
                }
        return {}

    def _contains_tables(self, text: str) -> bool:
        # Check for multiple pipe chars per line or |---| table separators
        lines = text.split('\n')
        for line in lines:
            if '|---|' in line or line.count('|') >= 3:
                return True
        return False

    def _has_multiple_columns(self, text: str) -> bool:
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        if not lines:
            return False
        
        # Check if average words per line < 5 (suggests columns)
        total_words = sum(len(line.split()) for line in lines)
        avg_words_per_line = total_words / len(lines)
        
        # Also check for large gaps of spaces which usually indicates columns
        gap_pattern = re.compile(r"\S\s{5,}\S")
        gap_lines = sum(1 for ln in lines if gap_pattern.search(ln))
        
        return avg_words_per_line < 5 or gap_lines >= 5

    def _contact_not_at_top(self, text: str) -> bool:
        top_slice = text[:200]
        has_email = bool(re.search(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}", top_slice))
        return not has_email

    def _missing_standard_headers(self, text: str) -> bool:
        headers = ["experience", "education", "skills", "summary"]
        lower = text.lower()
        found_headers = sum(1 for h in headers if re.search(rf"(?:^|\n)\s*{h}", lower))
        # If fewer than 2 standard headers found, flag it
        return found_headers < 2

    def _bad_length(self, text: str) -> bool:
        word_count = len(text.split())
        return word_count < 400 or word_count > 800

ats_checker_service = ATSChecker()
