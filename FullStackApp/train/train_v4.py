"""
Train V4 resume models and produce deployable artifacts.

Usage:
  python train_v4.py --data-dir ../../Dataset --out-dir ../v4 --use-transformer

This script supports TF-IDF + linear classifier and optional sentence-transformers
embeddings for better matching and classification.
"""
import argparse
import json
import os
import time
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.linear_model import SGDClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.multiclass import OneVsRestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


def load_datasets(data_dir: Path) -> pd.DataFrame:
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

    # remove very small classes
    counts = df['Category'].value_counts()
    valid = counts[counts >= 5].index.tolist()
    df = df[df['Category'].isin(valid)].reset_index(drop=True)
    return df


def build_skill_list(df: pd.DataFrame) -> list:
    # derive candidate skills: frequent tokens and a small public seed list
    seeds = [
        'python', 'java', 'sql', 'javascript', 'react', 'docker', 'aws', 'c++', 'c#', 'linux',
        'tensorflow', 'pytorch', 'excel', 'tableau', 'spark', 'hadoop', 'git'
    ]
    # simple frequency-based extraction from processed resumes if present
    if 'Processed_Resume' in df.columns:
        text = ' '.join(df['Processed_Resume'].astype(str).tolist())
        toks = pd.Series(text.split())
        top = toks.value_counts().head(200).index.tolist()
    else:
        top = []
    skills = list(dict.fromkeys(seeds + [t for t in top if len(t) > 2]))
    return skills


def main(args):
    data_dir = Path(args.data_dir)
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    print('Loading datasets from', data_dir)
    df = load_datasets(data_dir)
    print('Loaded', len(df), 'rows and',
          df['Category'].nunique(), 'categories')

    # Load preprocessing helpers from repo
    try:
        from FullStackApp.backend.app.preprocess import clean_text, spacy_preprocess
    except Exception:
        # fallback: define minimal cleaners here
        import re

        def clean_text(t):
            return re.sub(r'[^a-zA-Z\s]', ' ', str(t)).strip()

        def spacy_preprocess(t):
            return clean_text(t).lower()

    print('Cleaning text...')
    df['Cleaned_Resume'] = df['Resume'].apply(clean_text)
    print('Running token-level preprocessing...')
    df['Processed_Resume'] = df['Cleaned_Resume'].apply(spacy_preprocess)

    # Label encoding
    le = LabelEncoder()
    y = le.fit_transform(df['Category'])

    # TF-IDF extractor
    tfidf = TfidfVectorizer(
        max_features=10000, sublinear_tf=True, ngram_range=(1, 3))
    X_tfidf = tfidf.fit_transform(df['Processed_Resume'])
    print('TF-IDF shape', X_tfidf.shape)

    use_transformer = args.use_transformer
    embedder_name = args.embedder if args.embedder else 'all-MiniLM-L6-v2'
    embeddings = None
    if use_transformer:
        try:
            from sentence_transformers import SentenceTransformer
        except Exception:
            raise RuntimeError(
                'sentence-transformers not installed. Install with pip install sentence-transformers')
        print('Computing transformer embeddings with', embedder_name)
        model = SentenceTransformer(embedder_name)
        embeddings = model.encode(
            df['Processed_Resume'].tolist(), show_progress_bar=True)
        print('Embeddings shape', np.array(embeddings).shape)

    # Choose features for classification: embeddings if available else TF-IDF
    if embeddings is not None:
        X = np.array(embeddings)
    else:
        X = X_tfidf

    # Train/Test split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y)

    # Classifier (linear SVM via SGD) with calibration
    base = SGDClassifier(loss='hinge', class_weight='balanced',
                         max_iter=1000, tol=1e-3, random_state=42)
    calib = CalibratedClassifierCV(base, cv=3, method='sigmoid')
    clf = OneVsRestClassifier(calib)

    print('Training classifier...')
    t0 = time.time()
    clf.fit(X_train, y_train)
    print('Training done in', int(time.time() - t0), 's')

    # Evaluate
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print('Test accuracy:', acc)
    print(classification_report(y_test, y_pred, target_names=le.classes_))

    # Save artifacts
    print('Saving artifacts to', out_dir)
    joblib.dump(clf, out_dir / 'model.pkl')
    joblib.dump(tfidf, out_dir / 'tfidf.pkl')
    joblib.dump(le, out_dir / 'encoder.pkl')
    if embeddings is not None:
        np.save(out_dir / 'resume_embeddings.npy', np.array(embeddings))
        # record embedder name
        with open(out_dir / 'embedder.txt', 'w') as f:
            f.write(embedder_name)

    skills = build_skill_list(df)
    with open(out_dir / 'skills.txt', 'w', encoding='utf8') as f:
        for s in skills:
            f.write(s + '\n')

    manifest = {
        'model': str(out_dir / 'model.pkl'),
        'tfidf': str(out_dir / 'tfidf.pkl'),
        'encoder': str(out_dir / 'encoder.pkl'),
        'embedder': embedder_name if embeddings is not None else None,
        'resume_embeddings': str(out_dir / 'resume_embeddings.npy') if embeddings is not None else None,
        'skills': str(out_dir / 'skills.txt'),
        'num_samples': int(len(df)),
        'num_classes': int(len(le.classes_)),
        'trained_at': time.ctime(),
        'accuracy': float(acc)
    }
    with open(out_dir / 'manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)

    print('Done — artifacts and manifest written')


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('--data-dir', default='../../Dataset')
    p.add_argument('--out-dir', default='../v4')
    p.add_argument('--use-transformer', action='store_true')
    p.add_argument('--embedder', default='all-MiniLM-L6-v2')
    args = p.parse_args()
    main(args)
