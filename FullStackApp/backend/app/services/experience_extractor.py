"""
Experience extraction service utilizing dateparser.
"""
import dateparser
import re
from datetime import datetime
from typing import Dict, Any, List

class ExperienceExtractor:
    DATE_PATTERNS = [
        r'(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}',
        r'\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current|Now)',
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}',
        r'\d{1,2}[/\-]\d{4}\s*[-–—]\s*(?:\d{1,2}[/\-]\d{4}|Present|Current|Now)'
    ]
    
    def extract(self, resume_text: str) -> Dict[str, Any]:
        date_ranges = self._find_date_ranges(resume_text)
        
        work_history = []
        for start_dt, end_dt, raw_line in date_ranges:
            is_current = end_dt.date() == datetime.now().date()
            
            # Simple title heuristic from the text surrounding the date line
            title, company = self._extract_title_company(resume_text, raw_line)
            
            work_history.append({
                "title": title,
                "company": company,
                "start_date": start_dt.date().isoformat(),
                "end_date": end_dt.date().isoformat(),
                "is_current": is_current,
                "_s": start_dt,
                "_e": end_dt
            })
            
        # Deduplicate identical ranges
        seen = set()
        unique_history = []
        for item in work_history:
            key = (item["start_date"], item["end_date"])
            if key not in seen:
                seen.add(key)
                unique_history.append(item)
                
        # Sort by start_date descending
        unique_history.sort(key=lambda x: x["_s"], reverse=True)
        
        # Calculate total experience and gaps
        total_years = self._calculate_total_experience(unique_history)
        career_gaps = self._find_career_gaps(unique_history)
        
        # Clean up internal keys
        for item in unique_history:
            item.pop("_s", None)
            item.pop("_e", None)
            
        return {
            "work_history": unique_history,
            "total_experience_years": total_years,
            "career_gaps": career_gaps
        }

    def _find_date_ranges(self, text: str) -> List[tuple]:
        """Finds pairs of dates indicating a range."""
        ranges = []
        lines = text.split("\n")
        
        for line in lines:
            line_str = line.strip()
            if not line_str:
                continue
                
            # Try splitting by typical range separators
            parts = re.split(r'\s+[-–—to]+\s+', line_str, maxsplit=1, flags=re.IGNORECASE)
            
            if len(parts) == 2:
                start_part, end_part = parts[0], parts[1]
                
                # Try to parse
                start_dt = self._parse_date(start_part)
                end_dt = self._parse_date(end_part)
                
                if start_dt:
                    if not end_dt:
                        if re.search(r'\b(present|current|now)\b', end_part, re.IGNORECASE):
                            end_dt = datetime.now()
                            
                    if end_dt:
                        if start_dt > end_dt:
                            start_dt, end_dt = end_dt, start_dt
                        ranges.append((start_dt, end_dt, line_str))
                        continue
                        
        return ranges

    def _parse_date(self, date_str: str) -> datetime:
        # Very short strings usually fail or give weird results, ensure it's at least a year
        if len(date_str) < 4:
            return None
            
        parsed = dateparser.parse(date_str, settings={'REQUIRE_PARTS': ['year']})
        return parsed

    def _extract_title_company(self, full_text: str, date_line: str) -> tuple:
        """Simple extraction of job title/company around the matched date."""
        lines = full_text.split('\n')
        try:
            idx = lines.index(date_line)
        except ValueError:
            return "", ""
            
        title = ""
        company = ""
        keywords = ["engineer", "developer", "manager", "analyst", "designer", "lead", "architect", "consultant"]
        
        # Look a few lines above for title
        for i in range(max(0, idx - 3), idx):
            candidate = lines[i].strip()
            if candidate and len(candidate) < 60:
                lower_cand = candidate.lower()
                if any(k in lower_cand for k in keywords) and not title:
                    title = candidate
                elif not company:
                    company = candidate
                    
        return title, company

    def _calculate_total_experience(self, history: List[dict]) -> float:
        """Calculates total experience, merging overlapping periods."""
        if not history:
            return 0.0
            
        # Needs to be sorted ascending for overlap logic
        intervals = sorted(history, key=lambda x: x["_s"])
        
        merged = []
        current_start = intervals[0]["_s"]
        current_end = intervals[0]["_e"]
        
        for item in intervals[1:]:
            if item["_s"] <= current_end:
                current_end = max(current_end, item["_e"])
            else:
                merged.append((current_start, current_end))
                current_start = item["_s"]
                current_end = item["_e"]
                
        merged.append((current_start, current_end))
        
        total_days = sum((end - start).days for start, end in merged)
        return round(total_days / 365.25, 1)

    def _find_career_gaps(self, history: List[dict]) -> List[dict]:
        """Finds gaps > 90 days between jobs."""
        if len(history) < 2:
            return []
            
        # history is passed in descending order, but gap analysis is easier ascending
        asc_history = sorted(history, key=lambda x: x["_s"])
        gaps = []
        
        for i in range(1, len(asc_history)):
            prev_end = asc_history[i-1]["_e"]
            curr_start = asc_history[i]["_s"]
            
            gap_days = (curr_start - prev_end).days
            if gap_days > 90:
                gaps.append({
                    "gap_start": prev_end.date().isoformat(),
                    "gap_end": curr_start.date().isoformat(),
                    "gap_days": gap_days
                })
                
        return gaps

experience_extractor_service = ExperienceExtractor()
