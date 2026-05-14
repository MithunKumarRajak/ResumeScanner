import spacy
import logging

logger = logging.getLogger(__name__)

# Predefined taxonomy of IT skills
SKILL_TAXONOMY = [
    "python", "java", "c++", "c#", "javascript", "typescript", "ruby", "php", "go", "rust", "swift", "kotlin",
    "html", "css", "react", "angular", "vue", "node.js", "express", "django", "flask", "spring", "asp.net",
    "sql", "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "oracle",
    "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ansible", "jenkins", "git", "ci/cd",
    "machine learning", "deep learning", "nlp", "computer vision", "tensorflow", "pytorch", "scikit-learn",
    "data science", "data engineering", "pandas", "numpy", "spark", "hadoop", "kafka",
    "agile", "scrum", "kanban", "jira", "confluence",
    "linux", "unix", "bash", "powershell",
    "api", "graphql", "grpc", "microservices",
    "tableau", "power bi", "looker",
    "fastapi", "spacy", "nltk", "opencv", "keras", "xgboost", "lightgbm"
]

_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
            # Create a simple ruler
            if "entity_ruler" not in _nlp.pipe_names:
                ruler = _nlp.add_pipe("entity_ruler", before="ner")
                patterns = [{"label": "SKILL", "pattern": [{"LOWER": skill}]} for skill in SKILL_TAXONOMY]
                ruler.add_patterns(patterns)
            logger.info("Loaded skill extraction NLP pipeline.")
        except Exception as e:
            logger.error(f"Failed to load NLP pipeline: {e}")
            _nlp = spacy.blank("en")
    return _nlp

def extract_skills(text: str) -> list:
    if not text:
        return []
    nlp = get_nlp()
    doc = nlp(text.lower())
    
    skills = set()
    for ent in doc.ents:
        if ent.label_ == "SKILL":
            skills.add(ent.text)
            
    # Contextual keywords fallback
    for token in doc:
        if token.text in SKILL_TAXONOMY:
            skills.add(token.text)
            
    return sorted(list(skills))

def compute_skill_gaps(resume_skills: list, jd_skills: list) -> dict:
    res_set = set(resume_skills)
    jd_set = set(jd_skills)
    
    if not jd_set:
        return {"matched": [], "missing": [], "match_pct": 0.0}
        
    matched = list(res_set.intersection(jd_set))
    missing = list(jd_set.difference(res_set))
    
    match_pct = round((len(matched) / len(jd_set)) * 100, 2)
    
    return {
        "matched": sorted(matched),
        "missing": sorted(missing),
        "match_pct": match_pct
    }
