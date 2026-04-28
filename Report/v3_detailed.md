Optimizing tool selection...I’m going to inspect ResumeModel_v3.py first, then I’ll give you a full, structured walkthrough of what each part does, including data flow, model logic, and any issues or improvement points.

Read [](file:///c%3A/VsCodeFolder/Project/ResumeScanner/ResumeModel_v3.py)

Here is a complete breakdown of ResumeModel_v3.py, step by step.

**What This Script Is**
1. It is a full training script for single-label, multi-class resume classification.
2. It reads three resume datasets, normalizes them into one schema, cleans and preprocesses text, trains a classifier, evaluates performance, and saves deployable artifacts.
3. Final outputs are three files:
- model.pkl
- tfidf.pkl
- encoder.pkl  
saved under FullStackApp/v3.

**High-Level Pipeline**
1. Load libraries and spaCy model.
2. Load and merge datasets.
3. Clean raw text with regex.
4. Lemmatize and remove stopwords with spaCy.
5. Convert text to TF-IDF features.
6. Train One-vs-Rest calibrated linear SVM model.
7. Evaluate on held-out test split.
8. Save model artifacts.

---

**Detailed Explanation By Section**

1. Imports and startup
- Uses pandas/numpy for data handling.
- Uses re for regex cleaning.
- Uses spacy for NLP preprocessing.
- Uses sklearn for encoding, vectorization, splitting, modeling, calibration, and metrics.
- Uses joblib for saving trained objects.
- It suppresses warnings globally with warnings.filterwarnings('ignore'), which keeps output clean but can hide useful warnings.

2. spaCy model load
- nlp = spacy.load('en_core_web_sm')
- This loads English tokenization + lemmatization pipeline.
- If this model is missing in your environment, script will fail at startup.

3. Data loading and harmonization
- Reads:
  - UpdatedResumeDataSet.csv as df1
  - resume_dataset.csv as df2
  - Resume.csv as df3_raw
- For Resume.csv, categories are uppercase folder-style names. category_map converts them to human-readable labels like:
  - INFORMATION-TECHNOLOGY -> Information Technology
  - BUSINESS-DEVELOPMENT -> Business Development
  - FITNESS -> Health and fitness
- For df3:
  - pulls Category from mapped values
  - pulls Resume text from Resume_str
  - drops rows with missing/empty category or resume

4. Combining and filtering
- Concatenates all three datasets into one dataframe.
- Drops duplicate resumes by exact text match.
- Drops null/blank rows again after merge.
- Removes categories with fewer than 5 samples.
- This improves training stability and avoids classes too small for stratified splitting and calibration folds.

5. Text cleaning function clean_text
- Removes URLs.
- Removes standalone RT and cc.
- Removes hashtags, mentions, and HTML tags.
- Removes all non-letter characters with regex [^a-zA-Z\s].
- Collapses multiple spaces.
- Important effect: numbers and symbols are removed, so signals like years, versions, C++, C#, 10+ years can be lost or distorted.

6. NLP preprocessing function spacy_preprocess
- Runs spaCy on cleaned text.
- Keeps token lemmas in lowercase.
- Removes stopwords, punctuation, spaces, and single-character tokens.
- Output is a normalized text string used for vectorization.
- This step is usually the slowest part (script itself mentions 5–15 minutes depending on dataset and hardware).

7. Label encoding
- LabelEncoder maps category strings to numeric class ids.
- y holds integer labels.
- encoder.pkl is needed at inference time to convert prediction id back to category name.

8. TF-IDF feature extraction
- TfidfVectorizer settings:
  - max_features=10000
  - sublinear_tf=True
  - ngram_range=(1, 3)
- Compared to v2 comments:
  - larger vocabulary
  - includes uni/bi/tri-grams
- This is appropriate for resume text where phrases like machine learning engineer carry strong meaning.

9. Train/test split
- Uses 80/20 split.
- random_state=42 for reproducibility.
- stratify=y to preserve class distribution in train/test sets.
- Good practice for imbalanced multi-class data.

10. Model architecture
- Base classifier: SGDClassifier with:
  - loss='hinge' (linear SVM behavior)
  - class_weight='balanced'
  - max_iter=1000, tol=1e-3
- Then wraps base model in CalibratedClassifierCV(cv=3, method='sigmoid').
- Then wraps calibrated model with OneVsRestClassifier for multi-class handling.
- Why this design:
  - linear SVM is strong for sparse high-dimensional text.
  - calibration gives better probability estimates.
  - one-vs-rest handles multiple classes cleanly.

11. Training
- model.fit(X_train, y_train)
- With OVR + calibration, training cost is higher than plain linear models because calibration performs internal CV.

12. Evaluation
- Predicts on test split.
- Reports:
  - accuracy score
  - full per-class classification report (precision, recall, f1, support)
- Prints historical baseline numbers (v1/v2) and current v3 result.

13. Artifact saving
- Creates FullStackApp/v3 if missing.
- Saves:
  - model.pkl (the full OVR calibrated classifier)
  - tfidf.pkl (fitted vectorizer vocabulary/idf)
  - encoder.pkl (label mapping)
- These are exactly what inference API needs to mirror training-time transformations.

---

**Data Flow Summary**
1. Raw CSV rows -> unified schema (Category, Resume)
2. Resume -> Cleaned_Resume (regex)
3. Cleaned_Resume -> Processed_Resume (spaCy lemma tokens)
4. Processed_Resume -> sparse TF-IDF matrix X
5. Category -> encoded labels y
6. X/y split -> model training
7. model + tfidf + encoder serialized for deployment

---

**Strengths of This Version**
1. Better model family for text than KNN.
2. Handles class imbalance via class_weight='balanced'.
3. Uses richer n-gram features.
4. Uses stratified split.
5. Saves full deployable artifacts.

**Important Limitations / Risks**
1. No sklearn Pipeline object.
- Preprocessing logic lives in script functions, so serving code must reproduce cleaning and spaCy steps exactly.

2. Global warning suppression.
- Can hide convergence or deprecation warnings that matter.

3. Regex removes all non-letters.
- Useful numeric/technical tokens may be lost.

4. Exact dedup only.
- Near-duplicates can still leak across train/test and inflate metrics.

5. Calibration + OVR can be heavy.
- Training time and memory can be high for larger data.

6. Rare class filtering.
- Classes with fewer than 5 examples are excluded, reducing label coverage in production.

7. No persisted experiment metadata.
- Hyperparameters, dataset hash, and metrics are not saved alongside model files.

---

**How Inference Must Match Training**
At prediction time, you must do exactly:
1. clean_text
2. spacy_preprocess
3. tfidf.transform
4. model.predict and optionally model.predict_proba
5. encoder inverse mapping

If API skips or changes any preprocessing step, accuracy can drop sharply.

---

If you want, I can next produce:
1. A line-by-line annotated version of ResumeModel_v3.py in plain comments style.
2. A production-readiness checklist for this model in your FastAPI backend.
3. A v4 improvement plan with concrete code changes and expected impact.