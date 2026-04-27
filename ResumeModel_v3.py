"""
Multi-Class Resume Classification Model — v3 (Enhanced)

Improvements over v2:
  1. Replaced KNeighborsClassifier with SGDClassifier (linear SVM via hinge loss)
     → Better suited for high-dimensional sparse TF-IDF features
  2. Increased TF-IDF max_features from 5,000 → 10,000
     → Captures more discriminative n-grams
  3. Widened ngram_range from (1,2) → (1,3)
     → Captures richer multi-word patterns like "machine learning engineer"
  4. Added class_weight='balanced' to SGDClassifier
     → Automatically handles class imbalance (addresses BPO/Automobile 0% issue)
  5. Wrapped classifier in CalibratedClassifierCV
     → Produces well-calibrated probability estimates (unlike raw SVM)
  6. Uses OneVsRestClassifier for multi-class support

Pipeline Overview:
  1. Data Loading & Combining — Load all 3 CSVs, normalize & merge
  2. Text Cleaning — Remove noise using Regular Expressions
  3. NLP Preprocessing — Lemmatization & Stopword Removal using spaCy
  4. Feature Extraction — TF-IDF Vectorization (enhanced)
  5. Model Building — OneVsRestClassifier + CalibratedClassifierCV(SGDClassifier)
  6. Evaluation — Classification Report, Accuracy Score
  7. Save Models — For FastAPI deployment (separate v3 artifacts)
"""

import numpy as np
import pandas as pd
import re
import warnings
import spacy
import time
import joblib
import os

from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.multiclass import OneVsRestClassifier
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import accuracy_score, classification_report

warnings.filterwarnings('ignore')

# ── Load spaCy ───────────────────────────────────────────────────────────────
nlp = spacy.load('en_core_web_sm')
print('All libraries loaded successfully.')

# ── Step 1: Data Loading & Combining ─────────────────────────────────────────

# Dataset 1: UpdatedResumeDataSet.csv
df1 = pd.read_csv('Dataset/UpdatedResumeDataSet.csv')
print(f'Dataset 1 — UpdatedResumeDataSet.csv')
print(f'  Shape     : {df1.shape}')
print(f'  Categories: {df1["Category"].nunique()}')

# Dataset 2: resume_dataset.csv
df2 = pd.read_csv('Dataset/resume_dataset.csv')
print(f'Dataset 2 — resume_dataset.csv')
print(f'  Shape     : {df2.shape}')
print(f'  Categories: {df2["Category"].nunique()}')

# Dataset 3: Resume.csv
df3_raw = pd.read_csv('Dataset/Resume.csv')
category_map = {
    'ACCOUNTANT': 'Accountant',
    'ADVOCATE': 'Advocate',
    'AGRICULTURE': 'Agriculture',
    'APPAREL': 'Apparel',
    'ARTS': 'Arts',
    'AUTOMOBILE': 'Automobile',
    'AVIATION': 'Aviation',
    'BANKING': 'Banking',
    'BPO': 'BPO',
    'BUSINESS-DEVELOPMENT': 'Business Development',
    'CHEF': 'Chef',
    'CONSTRUCTION': 'Construction',
    'CONSULTANT': 'Consultant',
    'DESIGNER': 'Designer',
    'DIGITAL-MEDIA': 'Digital Media',
    'ENGINEERING': 'Engineering',
    'FINANCE': 'Finance',
    'FITNESS': 'Health and fitness',
    'HEALTHCARE': 'Healthcare',
    'HR': 'HR',
    'INFORMATION-TECHNOLOGY': 'Information Technology',
    'PUBLIC-RELATIONS': 'Public Relations',
    'SALES': 'Sales',
    'TEACHER': 'Teacher',
}
df3 = pd.DataFrame({
    'Category': df3_raw['Category'].map(category_map),
    'Resume': df3_raw['Resume_str']
})
df3 = df3.dropna(subset=['Category', 'Resume'])
df3 = df3[df3['Resume'].str.strip() != '']
print(f'Dataset 3 — Resume.csv (cleaned)')
print(f'  Shape     : {df3.shape}')
print(f'  Categories: {df3["Category"].nunique()}')

# Combine
df = pd.concat([df1, df2, df3], ignore_index=True)
df = df.drop_duplicates(subset=['Resume'])
df = df.dropna(subset=['Category', 'Resume'])
df = df[df['Resume'].str.strip() != '']

# Filter categories with < 5 samples
cat_counts = df['Category'].value_counts()
valid_cats = cat_counts[cat_counts >= 5].index.tolist()
df = df[df['Category'].isin(valid_cats)].reset_index(drop=True)

print(f'\n FINAL COMBINED DATASET')
print(f'Total Rows       : {len(df)}')
print(f'Total Categories : {df["Category"].nunique()}')

# ── Step 2: Text Cleaning ────────────────────────────────────────────────────

def clean_text(text: str) -> str:
    """Clean resume text using regex."""
    text = re.sub(r'http\S+|www\S+|https\S+', ' ', text, flags=re.MULTILINE)
    text = re.sub(r'\bRT\b|\bcc\b', ' ', text)
    text = re.sub(r'#\S+', ' ', text)
    text = re.sub(r'@\S+', ' ', text)
    text = re.sub(r'<.*?>', ' ', text)
    text = re.sub(r'[^a-zA-Z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

print('Cleaning text...')
df['Cleaned_Resume'] = df['Resume'].apply(clean_text)
print(f'Text cleaning complete. {len(df)} resumes processed.')

# ── Step 3: NLP Preprocessing ────────────────────────────────────────────────

def spacy_preprocess(text: str) -> str:
    """Use spaCy to tokenize, remove stopwords, and lemmatize."""
    doc = nlp(text)
    tokens = [
        token.lemma_.lower()
        for token in doc
        if not token.is_stop
        and not token.is_punct
        and not token.is_space
        and len(token.text) > 1
    ]
    return ' '.join(tokens)

print(f'Running spaCy on {len(df)} resumes — this may take 5-15 minutes...')
t0 = time.time()
df['Processed_Resume'] = df['Cleaned_Resume'].apply(spacy_preprocess)
elapsed = time.time() - t0
print(f'Done in {elapsed:.0f}s. {len(df)} resumes preprocessed.')

# ── Step 4: Feature Extraction (Enhanced TF-IDF) ─────────────────────────────

# Encode target labels
le = LabelEncoder()
y = le.fit_transform(df['Category'])
print(f'\nTotal classes: {len(le.classes_)}')

# === V3 ENHANCEMENT: Increased features & wider n-gram range ===
tfidf = TfidfVectorizer(
    max_features=10000,       # v2 used 5000
    sublinear_tf=True,
    ngram_range=(1, 3)        # v2 used (1, 2)
)

X = tfidf.fit_transform(df['Processed_Resume'])
print(f'TF-IDF matrix shape : {X.shape}')
print(f'Vocabulary size     : {len(tfidf.vocabulary_)}')

# ── Step 5: Model Building ───────────────────────────────────────────────────

# Train-Test Split (80/20) with stratification
X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

print(f'\nTraining samples : {X_train.shape[0]}')
print(f'Testing  samples : {X_test.shape[0]}')
print(f'Feature dims     : {X_train.shape[1]}')

# === V3 ENHANCEMENT: SGDClassifier with class_weight='balanced' ===
# SGDClassifier with hinge loss = Linear SVM, much better for sparse text
# CalibratedClassifierCV wraps it to produce proper probabilities
base_clf = SGDClassifier(
    loss='hinge',
    class_weight='balanced',    # Handles class imbalance automatically
    max_iter=1000,
    random_state=42,
    tol=1e-3
)
calibrated_clf = CalibratedClassifierCV(base_clf, cv=3, method='sigmoid')
model = OneVsRestClassifier(calibrated_clf)

print('Training OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier)) ...')
model.fit(X_train, y_train)
print('Training complete.')

# ── Step 6: Evaluation ───────────────────────────────────────────────────────

y_pred = model.predict(X_test)

acc = accuracy_score(y_test, y_pred)
print(f'\nAccuracy Score: {acc:.4f}  ({acc:.2%})')
print()
print(f'v1 baseline: 98.96% on 25 categories (962 resumes)')
print(f'v2 result  : 57.88% on 48 categories (2824 resumes)')
print(f'v3 result  : {acc:.2%} on {df["Category"].nunique()} categories ({len(df)} resumes)')

print('\nClassification Report')
print('-' * 80)
print(classification_report(
    y_test, y_pred,
    target_names=le.classes_
))

# ── Step 7: Save Model Artifacts ─────────────────────────────────────────────

project_root = 'FullStackApp'
v3_dir = os.path.join(project_root, 'v3')
os.makedirs(v3_dir, exist_ok=True)

# Save v3 artifacts to FullStackApp/v3/
joblib.dump(model, os.path.join(v3_dir, 'model.pkl'))
joblib.dump(tfidf, os.path.join(v3_dir, 'tfidf.pkl'))
joblib.dump(le,    os.path.join(v3_dir, 'encoder.pkl'))

print(f'\n[OK] model.pkl   -> {v3_dir}/model.pkl')
print(f'[OK] tfidf.pkl   -> {v3_dir}/tfidf.pkl')
print(f'[OK] encoder.pkl -> {v3_dir}/encoder.pkl')
print()
print(f'  Dataset : {len(df)} resumes across {df["Category"].nunique()} categories')
print(f'  Accuracy: {acc:.4f} ({acc:.2%})')
print()
print('[OK] All v3 models saved. Ready for FastAPI deployment!')
