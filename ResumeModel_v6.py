import os
import re
import time
import json
import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import spacy
import shap

from lingua import Language, LanguageDetectorBuilder
from langdetect import detect as langdetect_detect
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from fairlearn.metrics import demographic_parity_difference, equalized_odds_difference

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.multiclass import OneVsRestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


PROJECT_ROOT = Path(__file__).resolve(
).parent if "__file__" in globals() else Path.cwd()


def resolve_project_path(path_value) -> Path:
    path = Path(path_value)
    return path if path.is_absolute() else (PROJECT_ROOT / path).resolve()

# LanguageDetector class


class LanguageDetector:
    SUPPORTED = ['en', 'hi']   # English, Hindi

    def __init__(self):
        self.lingua_detector = LanguageDetectorBuilder.from_languages(
            Language.ENGLISH, Language.HINDI
        ).build()

    def detect(self, text: str) -> str:
        """Returns 'en' or 'hi'. Defaults to 'en' on failure."""
        try:
            result = self.lingua_detector.detect_language_of(text)
            if result == Language.HINDI:
                return 'hi'
        except Exception:
            pass
        try:
            lang = langdetect_detect(text)
            return lang if lang in self.SUPPORTED else 'en'
        except Exception:
            return 'en'

# MultilingualPreprocessor class


class MultilingualPreprocessor:
    def __init__(self):
        self.lang_detector = LanguageDetector()
        # Load spaCy models - gracefully degrade if not installed
        try:
            self.nlp_en = spacy.load('en_core_web_sm')
        except OSError:
            self.nlp_en = None
            print(
                "WARNING: en_core_web_sm not found. Run: python -m spacy download en_core_web_sm")
        try:
            self.nlp_xx = spacy.load('xx_ent_wiki_sm')
        except OSError:
            self.nlp_xx = None
            print(
                "WARNING: xx_ent_wiki_sm not found. Run: python -m spacy download xx_ent_wiki_sm")

    def clean_text(self, text: str, lang: str = 'en') -> str:
        """
        IMPORTANT: v5 used re.sub(r'[^a-zA-Z\s]', ' ', text) which destroys Hindi/Devanagari.
        v6 preserves Unicode letters for all scripts.
        """
        if not isinstance(text, str):
            return ''
        import re
        text = re.sub(r'http\S+|www\S+|https\S+', ' ', text)   # Remove URLs
        # Remove HTML tags
        text = re.sub(r'<.*?>', ' ', text)
        # Remove @mentions, #hashtags
        text = re.sub(r'[@#]\S+', ' ', text)

        if lang == 'hi':
            # Preserve Devanagari (U+0900–U+097F) + Latin + spaces + digits
            text = re.sub(
                r'[^\u0900-\u097F\u0041-\u007A\u0061-\u007A\s\d]', ' ', text)
        else:
            # English: keep Latin letters, digits, spaces
            text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)

        return re.sub(r'\s+', ' ', text).strip().lower()

    def preprocess(self, text: str) -> dict:
        """Returns {'lang': str, 'cleaned': str, 'tokens': list, 'entities': list}"""
        lang = self.lang_detector.detect(text)
        cleaned = self.clean_text(text, lang)

        # Tokenize & lemmatize
        nlp = self.nlp_en if (lang == 'en' and self.nlp_en) else self.nlp_xx
        tokens = []
        entities = []

        if nlp:
            doc = nlp(cleaned[:100000])  # spaCy limit safety
            tokens = [
                token.lemma_ for token in doc if not token.is_stop and len(token.text) > 2]
            entities = [(ent.text, ent.label_) for ent in doc.ents]
        else:
            tokens = cleaned.split()

        return {
            'lang': lang,
            'cleaned': cleaned,
            'processed': ' '.join(tokens),
            'entities': entities
        }

# BiasDetector class


class BiasDetector:
    # Word lists for protected attribute inference from resume text
    # These are heuristic — flagging for review, not filtering
    GENDER_INDICATORS = {
        'male': ['he ', 'his ', 'him ', ' mr.', ' mr '],
        'female': ['she ', 'her ', 'hers ', ' ms.', ' ms ', ' mrs.', ' mrs ']
    }
    AGE_PATTERNS = [
        r'\b(19[5-9]\d|200[0-9])\b',   # Birth year in 1950–2009
        r'\b(\d{1,2})\s*years?\s*old\b',
        r'\bclass\s*of\s*(19[5-9]\d|200[0-9])\b',
        r'\bgraduated\s*(in\s*)?(19[5-9]\d|200[0-9])\b'
    ]
    # Common name-origin heuristics (simplified — for flagging only)
    NAME_PATTERNS_SOUTH_ASIAN = [
        'kumar', 'singh', 'sharma', 'patel', 'rajak', 'verma', 'gupta', 'rao', 'reddy']

    def detect_protected_attributes(self, resume_text: str) -> dict:
        """
        Detect potential protected attributes in resume text.
        Returns flags — does NOT filter or score penalize.
        """
        text_lower = resume_text.lower()
        flags = {
            'gender_indicators_found': [],
            'age_indicators_found': [],
            'name_origin_detected': None,
            'bias_risk_flags': []
        }

        # Gender indicators
        for gender, patterns in self.GENDER_INDICATORS.items():
            if any(p in text_lower for p in patterns):
                flags['gender_indicators_found'].append(gender)

        # Age indicators
        for pattern in self.AGE_PATTERNS:
            match = re.search(pattern, text_lower)
            if match:
                flags['age_indicators_found'].append(match.group())

        # Name origin (first word of text, simplified)
        first_line = text_lower.split('\n')[0]
        for name_part in self.NAME_PATTERNS_SOUTH_ASIAN:
            if name_part in first_line:
                flags['name_origin_detected'] = 'south_asian_heuristic'
                break

        # Aggregate risk flags
        if flags['gender_indicators_found']:
            flags['bias_risk_flags'].append('GENDER_LANGUAGE_PRESENT')
        if flags['age_indicators_found']:
            flags['bias_risk_flags'].append('AGE_INDICATOR_PRESENT')

        return flags

    def audit_model_predictions(self,
                                y_true: list,
                                y_pred: list,
                                sensitive_features: list,
                                feature_name: str = 'sensitive_attr') -> dict:
        """
        Run fairness audit on model predictions.
        Requires labeled sensitive features (e.g. detected language as proxy).
        Returns fairness metrics.
        """
        try:
            dpd = demographic_parity_difference(
                y_true, y_pred, sensitive_features=sensitive_features)
            eod = equalized_odds_difference(
                y_true, y_pred, sensitive_features=sensitive_features)
            return {
                'feature_audited': feature_name,
                'demographic_parity_difference': round(float(dpd), 4),
                'equalized_odds_difference': round(float(eod), 4),
                'bias_assessment': 'LOW' if abs(dpd) < 0.1 else ('MEDIUM' if abs(dpd) < 0.2 else 'HIGH'),
                'recommendation': (
                    'Model appears fair on this feature.' if abs(dpd) < 0.1
                    else 'Consider reweighting training samples or post-processing predictions.'
                )
            }
        except Exception as e:
            return {'error': str(e), 'bias_assessment': 'UNKNOWN'}

    def generate_bias_report(self, df, predictions, language_col='lang') -> dict:
        """Generate bias report by language (English vs Hindi)."""
        report = {}
        if language_col in df.columns:
            langs = df[language_col].tolist()
            report['language_bias'] = self.audit_model_predictions(
                predictions, predictions, langs, 'language'
            )
        return report

# SemanticMatcher class


class SemanticMatcher:
    # Use multilingual model for v6 (supports Hindi + English)
    # Downgrade to 'all-MiniLM-L6-v2' if memory-constrained (English only)
    DEFAULT_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'

    def __init__(self, model_name: str = None):
        model_name = model_name or self.DEFAULT_MODEL
        print(f"  Loading semantic model: {model_name}")
        self.model = SentenceTransformer(model_name)
        self.model_name = model_name

    def embed(self, texts: list[str]) -> np.ndarray:
        return self.model.encode(texts, show_progress_bar=False, normalize_embeddings=True)

    def match_resume_to_jd(self, resume_text: str, jd_text: str) -> dict:
        """
        Core matching function. Returns structured score dict.
        Called at inference time (not during training).
        """
        embeddings = self.embed([resume_text, jd_text])
        resume_emb, jd_emb = embeddings[0:1], embeddings[1:2]

        similarity = float(cosine_similarity(resume_emb, jd_emb)[0][0])
        # Convert cosine similarity (-1 to 1) to 0–100 score
        score = round((similarity + 1) / 2 * 100, 2)

        # Keyword overlap (complementary to semantic score)
        resume_words = set(resume_text.lower().split())
        jd_words = set(jd_text.lower().split())
        overlap = resume_words & jd_words
        keyword_score = round(len(overlap) / max(len(jd_words), 1) * 100, 2)

        # Identify missing important JD keywords
        # Filter stop words before surfacing gaps
        STOP = {'the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'is',
                'are', 'with', 'on', 'at', 'by', 'be', 'this', 'that', 'as', 'from'}
        missing_keywords = [w for w in jd_words -
                            resume_words if len(w) > 3 and w not in STOP]

        return {
            'semantic_score': score,
            'keyword_overlap_score': keyword_score,
            # weighted
            'combined_score': round(score * 0.7 + keyword_score * 0.3, 2),
            'cosine_similarity': round(similarity, 4),
            'matched_keywords': sorted(list(overlap))[:20],
            'missing_keywords': sorted(missing_keywords, key=lambda w: jd_text.lower().count(w), reverse=True)[:15],
            'model_used': self.model_name
        }

    def batch_rank_resumes(self, jd_text: str, resume_texts: list[str]) -> list[dict]:
        """Rank multiple resumes against one JD. Returns sorted list."""
        jd_emb = self.embed([jd_text])
        resume_embs = self.embed(resume_texts)
        scores = cosine_similarity(resume_embs, jd_emb).flatten()
        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [{'rank': i+1, 'index': idx, 'similarity': round(float(s), 4)} for i, (idx, s) in enumerate(ranked)]

# XAIExplainer class


class XAIExplainer:
    def __init__(self, model, tfidf_vectorizer, label_encoder, feature_names_extra: list = None):
        """
        model: trained sklearn model (must be CalibratedClassifierCV or similar)
        tfidf_vectorizer: fitted TfidfVectorizer
        label_encoder: fitted LabelEncoder
        feature_names_extra: list of extra feature names beyond TF-IDF (e.g. ['years_exp', 'has_degree'])
        """
        self.model = model
        self.tfidf = tfidf_vectorizer
        self.le = label_encoder
        self.extra_features = feature_names_extra or []
        self.explainer = None  # lazy init

    def _build_explainer(self, X_background):
        """Build SHAP explainer with a background dataset sample."""
        # Use 100 background samples for speed
        bg_size = min(100, X_background.shape[0])
        background = shap.sample(X_background, bg_size)
        self.explainer = shap.LinearExplainer(
            self.model, background, feature_perturbation='interventional')

    def explain_resume(self, resume_text: str, preprocessed_text: str,
                       extra_features: np.ndarray, X_background,
                       top_n: int = 10) -> dict:
        """
        Explain a single resume's classification.
        Returns top contributing TF-IDF features + values.

        Args:
            resume_text: raw resume text (for display)
            preprocessed_text: cleaned/lemmatized text
            extra_features: array of shape (1, n_extra_features)
            X_background: training feature matrix for SHAP background
            top_n: number of top features to return
        """
        if self.explainer is None:
            self._build_explainer(X_background)

        # Build feature vector (same pipeline as training)
        tfidf_vec = self.tfidf.transform([preprocessed_text]).toarray()
        # shape (1, n_features)
        feature_vec = np.hstack([tfidf_vec, extra_features])

        # Get SHAP values — shape: (n_classes, n_features) for multiclass
        shap_values = self.explainer.shap_values(feature_vec)

        # Get predicted class
        pred_class_idx = self.model.predict(feature_vec)[0]
        pred_class_name = self.le.inverse_transform([pred_class_idx])[0]
        pred_proba = self.model.predict_proba(feature_vec)[0]
        confidence = float(pred_proba[pred_class_idx])

        # SHAP values for the predicted class
        class_shap = shap_values[pred_class_idx][0] if isinstance(
            shap_values, list) else shap_values[0]

        # Feature names: TF-IDF vocab + extra feature names
        tfidf_names = self.tfidf.get_feature_names_out().tolist()
        all_feature_names = tfidf_names + self.extra_features

        # Top positive contributors (pushed score UP)
        top_pos_idx = np.argsort(class_shap)[::-1][:top_n]
        # Top negative contributors (pushed score DOWN)
        top_neg_idx = np.argsort(class_shap)[:top_n]

        def make_explanation(indices):
            return [
                {
                    'feature': all_feature_names[i] if i < len(all_feature_names) else f'feat_{i}',
                    'shap_value': round(float(class_shap[i]), 4),
                    'feature_value': round(float(feature_vec[0][i]), 4)
                }
                for i in indices
                if abs(class_shap[i]) > 1e-6  # filter near-zero
            ]

        return {
            'predicted_category': pred_class_name,
            'confidence': round(confidence, 4),
            'confidence_pct': round(confidence * 100, 1),
            'top_positive_features': make_explanation(top_pos_idx),
            'top_negative_features': make_explanation(top_neg_idx),
            'explanation_summary': self._generate_summary(pred_class_name, confidence, make_explanation(top_pos_idx)[:5]),
            'model_version': 'v6'
        }

    def _generate_summary(self, category: str, confidence: float, top_features: list) -> str:
        """Human-readable explanation string for the frontend."""
        feature_list = ', '.join([f['feature'] for f in top_features[:3]])
        conf_label = 'highly confident' if confidence > 0.8 else (
            'moderately confident' if confidence > 0.6 else 'low confidence')
        return (
            f"The model is {conf_label} ({confidence*100:.0f}%) that this resume belongs to the "
            f"'{category}' category. Key factors: {feature_list}."
        )

# load_datasets & merge_small_classes (From v5)


def load_datasets(data_dir: Path) -> pd.DataFrame:
    """Load and combine all 3 datasets."""
    d1 = pd.read_csv(data_dir / 'UpdatedResumeDataSet.csv')
    d2 = pd.read_csv(data_dir / 'resume_dataset.csv')
    d3_raw = pd.read_csv(data_dir / 'Resume.csv')

    category_map = {
        'ACCOUNTANT': 'Accountant', 'ADVOCATE': 'Advocate', 'AGRICULTURE': 'Agriculture',
        'APPAREL': 'Apparel', 'ARTS': 'Arts', 'AUTOMOBILE': 'Automobile', 'AVIATION': 'Aviation',
        'BANKING': 'Banking', 'BPO': 'BPO', 'BUSINESS-DEVELOPMENT': 'Business Development',
        'CHEF': 'Chef', 'CONSTRUCTION': 'Construction', 'CONSULTANT': 'Consultant',
        'DESIGNER': 'Designer', 'DIGITAL-MEDIA': 'Digital Media', 'ENGINEERING': 'Engineering',
        'FINANCE': 'Finance', 'FITNESS': 'Health and fitness', 'HEALTHCARE': 'Healthcare',
        'HR': 'HR', 'INFORMATION-TECHNOLOGY': 'Information Technology',
        'PUBLIC-RELATIONS': 'Public Relations', 'SALES': 'Sales', 'TEACHER': 'Teacher'
    }
    d3 = pd.DataFrame({
        'Category': d3_raw['Category'].map(category_map),
        'Resume': d3_raw['Resume_str']
    })
    d3 = d3.dropna(subset=['Category', 'Resume'])

    df = pd.concat([d1, d2, d3], ignore_index=True)
    df = df.drop_duplicates(subset=['Resume'])
    df = df.dropna(subset=['Category', 'Resume'])
    df = df[df['Resume'].str.strip() != '']

    # Filter categories with < 5 samples
    counts = df['Category'].value_counts()
    valid = counts[counts >= 5].index.tolist()
    df = df[df['Category'].isin(valid)].reset_index(drop=True)
    return df


def merge_small_classes(df: pd.DataFrame) -> pd.DataFrame:
    """Merge categories with < 10 samples into parent categories."""
    print('Merging small classes (< 10 samples)...')

    merge_rules = {
        'BPO': 'Consultant',
        'Automobile': 'Engineering',
        'Data Science': 'Information Technology',
        'Civil Engineer': 'Engineering',
        'Network Security Engineer': 'Information Technology',
    }

    original_count = df['Category'].nunique()

    for small_cat, parent_cat in merge_rules.items():
        if small_cat in df['Category'].values:
            sample_count = (df['Category'] == small_cat).sum()
            if sample_count < 10:
                print(
                    f'  Merging {small_cat} ({sample_count} samples) -> {parent_cat}')
                df.loc[df['Category'] == small_cat, 'Category'] = parent_cat

    new_count = df['Category'].nunique()
    print(f'Classes reduced: {original_count} -> {new_count}')
    return df

# extract_features_v6


def extract_features_v6(text: str, lang: str = 'en') -> dict:
    """
    Expanded feature extraction — 15 features (vs v5's 6).
    New: Hindi detection, certification count, skill density, seniority score.
    """
    import re
    text_lower = text.lower() if isinstance(text, str) else ''

    features = {
        # --- Existing v5 features ---
        'years_exp': 0.0,
        'has_degree': 0.0,
        'has_masters': 0.0,
        'is_technical': 0.0,
        'is_management': 0.0,
        'is_sales': 0.0,

        # --- NEW v6 features ---
        'is_hindi': 1.0 if lang == 'hi' else 0.0,
        'has_phd': 0.0,
        'certification_count': 0.0,
        'skill_density': 0.0,        # skills per 100 words
        'seniority_score': 0.0,      # 0=junior, 0.5=mid, 1=senior
        'has_github_linkedin': 0.0,
        'resume_length_normalized': 0.0,  # word count / 1000
        'action_verb_count': 0.0,    # "developed", "led", "built" etc.
        'quantified_achievements': 0.0,  # "increased by 30%", "managed 10 people"
    }

    # Years experience
    yexp = re.search(
        r'(\d+)\+?\s*years?\s*(of\s*)?(experience|exp)', text_lower)
    if yexp:
        features['years_exp'] = min(float(yexp.group(1)) / 30.0, 1.0)

    # Education
    if any(k in text_lower for k in ['bachelor', 'b.s', 'b.sc', 'b.a', 'b.e', 'b.tech']):
        features['has_degree'] = 1.0
    if any(k in text_lower for k in ['master', 'm.s', 'm.a', 'mba', 'm.tech', 'm.e']):
        features['has_masters'] = 1.0
    if any(k in text_lower for k in ['phd', 'ph.d', 'doctorate', 'doctor of']):
        features['has_phd'] = 1.0

    # Technical
    tech_kw = ['python', 'java', 'sql', 'aws', 'docker', 'kubernetes', 'api',
               'database', 'software', 'developer', 'engineer', 'machine learning',
               'react', 'node', 'tensorflow', 'pytorch', 'fastapi', 'django']
    features['is_technical'] = min(
        sum(1 for k in tech_kw if k in text_lower) / 5.0, 1.0)

    # Management
    if any(k in text_lower for k in ['manager', 'lead', 'director', 'head of', 'chief', 'vp ', 'president']):
        features['is_management'] = 1.0

    # Sales
    if any(k in text_lower for k in ['sales', 'business development', 'account executive', 'quota', 'revenue']):
        features['is_sales'] = 1.0

    # Certifications
    cert_matches = re.findall(
        r'\b(certified|certification|certificate|aws|gcp|azure|pmp|cfa|cissp|comptia)\b', text_lower)
    features['certification_count'] = min(len(cert_matches) / 5.0, 1.0)

    # Skill density
    words = text_lower.split()
    skill_count = sum(1 for k in tech_kw if k in text_lower)
    features['skill_density'] = min(
        skill_count / max(len(words), 1) * 100, 1.0)

    # Seniority
    senior_kw = ['senior', 'lead', 'principal',
                 'director', 'vp', 'chief', 'head']
    junior_kw = ['intern', 'fresher', 'entry level', 'junior', 'trainee']
    if any(k in text_lower for k in senior_kw):
        features['seniority_score'] = 1.0
    elif any(k in text_lower for k in junior_kw):
        features['seniority_score'] = 0.0
    else:
        features['seniority_score'] = 0.5

    # GitHub / LinkedIn presence
    if 'github' in text_lower or 'linkedin' in text_lower:
        features['has_github_linkedin'] = 1.0

    # Resume length
    features['resume_length_normalized'] = min(len(words) / 1000.0, 1.0)

    # Action verbs
    action_verbs = ['developed', 'built', 'led', 'managed', 'designed', 'implemented',
                    'created', 'improved', 'launched', 'delivered', 'increased', 'reduced']
    features['action_verb_count'] = min(
        sum(1 for v in action_verbs if v in text_lower) / 6.0, 1.0)

    # Quantified achievements
    quant_matches = re.findall(
        r'\d+\s*(%|percent|people|team|million|thousand|k\b)', text_lower)
    features['quantified_achievements'] = min(len(quant_matches) / 5.0, 1.0)

    return features

# fine_tune_on_custom_data


def fine_tune_on_custom_data(
    base_model_dir: str,
    custom_data_path: str,
    output_dir: str,
    epochs: int = 3
) -> dict:
    """
    Fine-tune the v6 base model on company-specific data.
    Includes Embedder Fine-Tuning using SentenceTransformers contrastive loss.
    """
    from sklearn.linear_model import SGDClassifier
    from sklearn.metrics import accuracy_score
    from pathlib import Path
    import time
    from sentence_transformers import SentenceTransformer, InputExample, losses
    from torch.utils.data import DataLoader

    base_dir = Path(base_model_dir)
    out_dir = Path(output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    # Load base artifacts
    model = joblib.load(base_dir / 'model.pkl')
    tfidf = joblib.load(base_dir / 'tfidf.pkl')
    le = joblib.load(base_dir / 'encoder.pkl')

    with open(base_dir / 'embedder.txt', 'r') as f:
        embedder_name = f.read().strip()

    # Load custom data
    custom_df = pd.read_csv(custom_data_path)
    assert 'Resume' in custom_df.columns and 'Category' in custom_df.columns, \
        "CSV must have 'Resume' and 'Category' columns"

    preprocessor = MultilingualPreprocessor()
    preprocessed_res = custom_df['Resume'].apply(
        lambda t: preprocessor.preprocess(t))
    custom_df['Processed'] = preprocessed_res.apply(lambda r: r['processed'])
    custom_df['lang'] = preprocessed_res.apply(lambda r: r['lang'])

    # Add new categories to encoder if needed
    new_categories = set(custom_df['Category'].unique()) - set(le.classes_)
    if new_categories:
        print(f"  New categories detected: {new_categories}")
        all_classes = np.append(le.classes_, list(new_categories))
        le.classes_ = all_classes

    y_custom = le.transform(custom_df['Category'])

    # 1. Embedder Fine-Tuning (Contrastive Learning)
    print(
        f"\n  [1/3] Fine-tuning Embedder ({embedder_name}) using SetFit approach...")
    embedder = SentenceTransformer(embedder_name)

    train_examples = []
    for i in range(len(custom_df)):
        text1 = custom_df.iloc[i]['Processed']
        cat1 = custom_df.iloc[i]['Category']
        for j in range(i + 1, min(i + 10, len(custom_df))):
            text2 = custom_df.iloc[j]['Processed']
            cat2 = custom_df.iloc[j]['Category']
            label = 1.0 if cat1 == cat2 else 0.0
            train_examples.append(InputExample(
                texts=[text1, text2], label=label))

    train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=8)
    train_loss = losses.CosineSimilarityLoss(embedder)
    embedder.fit(train_objectives=[
                 (train_dataloader, train_loss)], epochs=1, warmup_steps=10)

    custom_embedder_path = str(out_dir / 'fine_tuned_embedder')
    embedder.save(custom_embedder_path)
    print(f"  Embedder fine-tuned and saved to {custom_embedder_path}")

    # 2. Extract full features (Transformer + TFIDF + Custom)
    print("\n  [2/3] Extracting features with fine-tuned embedder...")
    X_transformer = embedder.encode(
        custom_df['Processed'].tolist(),
        show_progress_bar=True,
        normalize_embeddings=True,
    )
    X_tfidf = tfidf.transform(custom_df['Processed']).toarray()

    features_list = [
        extract_features_v6(row['Resume'], row['lang'])
        for _, row in custom_df.iterrows()
    ]
    X_features = pd.DataFrame(features_list).values

    X_combined = np.hstack([X_transformer, X_tfidf, X_features])

    # 3. Classifier Fine-Tuning
    print(
        f"\n  [3/3] Fine-tuning Classifier for {epochs} epochs on {len(custom_df)} samples...")
    base_sgd = model.estimator if hasattr(model, 'estimator') else model
    for epoch in range(epochs):
        base_sgd.partial_fit(X_combined, y_custom,
                             classes=np.arange(len(le.classes_)))
        y_pred = base_sgd.predict(X_combined)
        acc = accuracy_score(y_custom, y_pred)
        print(f"  Epoch {epoch + 1}/{epochs} - train accuracy: {acc:.3f}")

    joblib.dump(model, out_dir / 'model.pkl')
    joblib.dump(le, out_dir / 'encoder.pkl')
    joblib.dump(tfidf, out_dir / 'tfidf.pkl')
    with open(out_dir / 'embedder.txt', 'w', encoding='utf-8') as f:
        f.write(custom_embedder_path)

    manifest = {
        'version': 'v6-finetuned',
        'base_model': base_model_dir,
        'fine_tune_samples': int(len(custom_df)),
        'fine_tune_epochs': epochs,
        'trained_at': time.ctime(),
        'new_categories': list(new_categories),
        'embedder_fine_tuned': True,
    }
    with open(out_dir / 'manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)

    print(f"\n  Fine-tuned artifacts saved to {out_dir}")
    return manifest

# train_v6


def train_v6(args):
    data_dir = resolve_project_path(args.data_dir)
    out_dir = resolve_project_path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print("=" * 80)
    print("ResumeModel V6 - Full Advanced Training")
    print("Features: Semantic Match - Bias Detection - XAI - Multilingual - Custom Training")
    print("=" * 80)

    # [1] Load + merge datasets
    print("\n[1/9] Loading datasets...")
    df = load_datasets(data_dir)
    df = merge_small_classes(df)

    # [2] Multilingual preprocessing
    print("\n[2/9] Multilingual preprocessing...")
    preprocessor = MultilingualPreprocessor()
    results = df['Resume'].apply(preprocessor.preprocess)
    df['lang'] = results.apply(lambda r: r['lang'])
    df['Cleaned_Resume'] = results.apply(lambda r: r['cleaned'])
    df['Processed_Resume'] = results.apply(lambda r: r['processed'])
    print(f"  Language distribution: {df['lang'].value_counts().to_dict()}")

    # [3] Feature engineering
    print("\n[3/9] Feature engineering...")
    features_list = [extract_features_v6(
        row['Resume'], row['lang']) for _, row in df.iterrows()]
    features_df = pd.DataFrame(features_list)
    EXTRA_FEATURE_NAMES = features_df.columns.tolist()
    print(f"  Features per resume: {len(EXTRA_FEATURE_NAMES)}")

    # [4] Bias pre-audit (before training)
    print("\n[4/9] Pre-training bias audit...")
    bias_detector = BiasDetector()
    pre_bias = bias_detector.generate_bias_report(
        df, df['Category'].tolist(), 'lang')
    print(f"  Pre-training bias report: {pre_bias}")

    # [5] Label encoding
    print("\n[5/9] Encoding labels...")
    le = LabelEncoder()
    y = le.fit_transform(df['Category'])

    # [6] Semantic matcher initialization + save embeddings
    print("\n[6/9] Computing semantic embeddings...")
    matcher = SemanticMatcher(args.embedder)
    all_texts = df['Processed_Resume'].tolist()
    embeddings = matcher.model.encode(
        all_texts, show_progress_bar=True, normalize_embeddings=True)
    X_transformer = np.array(embeddings)

    # [7] Build combined feature matrix
    print("\n[7/9] Building feature matrix...")
    tfidf = TfidfVectorizer(
        max_features=15000, sublinear_tf=True, ngram_range=(1, 3))
    X_tfidf = tfidf.fit_transform(df['Processed_Resume']).toarray()
    X_features = features_df.values
    X_combined = np.hstack([X_transformer, X_tfidf, X_features])
    print(f"  Feature matrix shape: {X_combined.shape}")

    # [8] Train model
    print("\n[8/9] Training...")
    X_train, X_test, y_train, y_test = train_test_split(
        X_combined, y, test_size=0.2, random_state=42, stratify=y
    )
    base_clf = SGDClassifier(loss='hinge', class_weight='balanced',
                             max_iter=2000, tol=1e-4, random_state=42, n_jobs=-1)
    cv_folds = max(2, min(5, np.bincount(y_train).min()))
    clf = CalibratedClassifierCV(base_clf, cv=cv_folds, method='sigmoid')

    t0 = time.time()
    clf.fit(X_train, y_train)
    train_time = time.time() - t0

    y_pred = clf.predict(X_test)
    y_pred_proba = clf.predict_proba(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"  Accuracy: {acc:.2%}  |  Training time: {train_time:.1f}s")
    print(classification_report(y_test, y_pred,
          target_names=le.classes_, digits=3))

    # Post-training bias audit
    print("\n  Post-training bias audit...")
    post_bias_report = {}
    try:
        from fairlearn.metrics import demographic_parity_difference
        test_lang_list = df['lang'].tolist()[:len(y_test)]
        dpd = demographic_parity_difference(
            y_test, y_pred, sensitive_features=test_lang_list)
        post_bias_report = {
            'demographic_parity_difference': round(float(dpd), 4)}
    except Exception as e:
        post_bias_report = {'error': str(e)}
    print(f"  Bias report: {post_bias_report}")

    # [9] Save artifacts
    print("\n[9/9] Saving artifacts...")
    joblib.dump(clf, out_dir / 'model.pkl')
    joblib.dump(tfidf, out_dir / 'tfidf.pkl')
    joblib.dump(le, out_dir / 'encoder.pkl')
    joblib.dump(features_df.describe(), out_dir / 'feature_stats.pkl')
    np.save(out_dir / 'resume_embeddings.npy', X_transformer)

    # Save extra feature names for SHAP
    with open(out_dir / 'feature_names.json', 'w') as f:
        json.dump(EXTRA_FEATURE_NAMES, f)

    # Save bias report
    with open(out_dir / 'bias_report.json', 'w') as f:
        json.dump({'pre_training': pre_bias,
                  'post_training': post_bias_report}, f, indent=2)

    # Save semantic matcher model name
    with open(out_dir / 'embedder.txt', 'w') as f:
        f.write(matcher.model_name)

    manifest = {
        'version': 'v6',
        'trained_at': time.ctime(),
        'accuracy': float(acc),
        'num_samples': len(df),
        'num_classes': len(le.classes_),
        'languages_detected': df['lang'].value_counts().to_dict(),
        'training_time_seconds': float(train_time),
        'features': {
            'tfidf_dims': 15000,
            'transformer_dims': X_transformer.shape[1],
            'numerical_features': X_features.shape[1],
            'total_dims': X_combined.shape[1]
        },
        'semantic_model': matcher.model_name,
        'advanced_features': ['semantic_matching', 'bias_detection', 'xai_shap', 'multilingual', 'custom_training'],
        'bias_audit': post_bias_report
    }
    with open(out_dir / 'manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\n All artifacts saved to {out_dir}/")
    print(f"  model.pkl · tfidf.pkl · encoder.pkl · feature_stats.pkl")
    print(f"  resume_embeddings.npy · feature_names.json · bias_report.json · embedder.txt · manifest.json")
    print(f"\nV6 Training Complete! Accuracy: {acc:.2%}")


# argparse Entry Point
if __name__ == '__main__':
    p = argparse.ArgumentParser(
        description='Train ResumeModel V6 — Advanced Full')
    p.add_argument('--data-dir', default='Dataset', help='Dataset directory')
    p.add_argument('--out-dir', default='FullStackApp/v6',
                   help='Output directory for artifacts')
    p.add_argument('--embedder', default='paraphrase-multilingual-MiniLM-L12-v2',
                   help='sentence-transformers model name')
    p.add_argument('--fine-tune', action='store_true',
                   help='Fine-tune existing model instead of training from scratch')
    p.add_argument('--fine-tune-data', default=None,
                   help='Path to company CSV for fine-tuning')
    p.add_argument('--fine-tune-base', default='FullStackApp/v6',
                   help='Base model dir for fine-tuning')
    p.add_argument('--fine-tune-out', default='FullStackApp/v6-custom',
                   help='Output dir for fine-tuned model')
    args = p.parse_args()

    if args.fine_tune:
        assert args.fine_tune_data, "--fine-tune-data required with --fine-tune"
        fine_tune_on_custom_data(
            str(resolve_project_path(args.fine_tune_base)),
            args.fine_tune_data,
            str(resolve_project_path(args.fine_tune_out)))
    else:
        train_v6(args)
