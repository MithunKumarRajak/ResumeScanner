import re
import spacy

# Load spaCy model once at import time. Ensure en_core_web_sm is installed in the environment.
try:
    nlp = spacy.load('en_core_web_sm')
except Exception as e:
    raise RuntimeError(
        'spaCy model en_core_web_sm not installed. Run: python -m spacy download en_core_web_sm')


def clean_text(text: str) -> str:
    if not isinstance(text, str):
        return ''
    text = re.sub(r'http\S+|www\S+|https\S+', ' ', text)
    text = re.sub(r'\bRT\b|\bcc\b', ' ', text)
    text = re.sub(r'#\S+', ' ', text)
    text = re.sub(r'@\S+', ' ', text)
    text = re.sub(r'<.*?>', ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def spacy_preprocess(text: str) -> str:
    doc = nlp(text)
    tokens = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop and not token.is_punct and not token.is_space and len(token.text) > 1
    ]
    return ' '.join(tokens)
