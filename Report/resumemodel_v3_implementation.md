# ResumeModel_v3 — Implementation Report

## Overview

**ResumeModel_v3** is an enhanced version of the resume classification model, designed to address the key weaknesses of v2 while maintaining full backward compatibility. Both v2 and v3 can be selected from the FullStackApp UI at runtime.

---

## What Changed: v2 → v3

### 1. Classifier Algorithm

| Aspect | v2 | v3 |
|--------|----|----|
| **Core Classifier** | `KNeighborsClassifier(n_neighbors=5)` | `SGDClassifier(loss='hinge')` |
| **Wrapper** | `OneVsRestClassifier` | `OneVsRestClassifier` + `CalibratedClassifierCV` |
| **Distance Metric** | Euclidean | N/A (hyperplane-based) |
| **Class Imbalance** | Not handled | `class_weight='balanced'` |
| **Probability Calibration** | Native KNN voting | Sigmoid calibration via 3-fold CV |

> [!IMPORTANT]
> **Why SGDClassifier?** KNN struggles with high-dimensional sparse data (TF-IDF). Linear SVMs (SGD with hinge loss) are specifically designed for this — they find optimal separating hyperplanes in the feature space, making them far more effective for text classification.

> [!NOTE]
> **Why CalibratedClassifierCV?** Raw SVM outputs are decision function values, not probabilities. The `CalibratedClassifierCV` wrapper applies Platt scaling (sigmoid) to convert these into well-calibrated probability estimates, which the frontend uses for confidence display.

### 2. Feature Extraction (TF-IDF)

| Parameter | v2 | v3 |
|-----------|----|----|
| `max_features` | 5,000 | **10,000** |
| `ngram_range` | (1, 2) | **(1, 3)** |
| `sublinear_tf` | True | True |

> [!TIP]
> Tripling the n-gram range to (1,3) allows the model to capture multi-word professional phrases like "machine learning engineer", "full stack developer", and "business development manager" — terms that are highly discriminative for resume classification.

### 3. Class Imbalance Handling

v2 had a critical problem: categories with few samples (BPO: 4 samples, Automobile: 7 samples) achieved **0% accuracy** because the KNN classifier was overwhelmed by majority classes.

v3 solves this with `class_weight='balanced'`, which automatically adjusts sample weights inversely proportional to class frequency:

$$w_c = \frac{N}{k \cdot n_c}$$

Where $N$ = total samples, $k$ = number of classes, $n_c$ = samples in class $c$.

This means a class with only 4 samples gets ~141x more weight per sample than a class with 565 samples.

---

## Architecture Changes

### v2 Architecture
```
Resume Text → Regex Clean → SpaCy Lemmatize → TF-IDF(5K) → KNN(K=5) → OneVsRest → Category
```

### v3 Architecture
```
Resume Text → Regex Clean → SpaCy Lemmatize → TF-IDF(10K) → SGD(hinge) → Calibrated(sigmoid) → OneVsRest → Category
```

---

## File Changes

### New Files Created

| File | Purpose |
|------|---------|
| `ResumeModel_v3.py` | Training script for v3 model |
| `FullStackApp/v3/model.pkl` | Trained v3 model artifact (after running) |
| `FullStackApp/v3/tfidf.pkl` | v3 TF-IDF vectorizer (after running) |
| `FullStackApp/v3/encoder.pkl` | v3 label encoder (after running) |

### Modified Files

| File | Changes |
|------|---------|
| `FullStackApp/backend/main.py` | Multi-model loading, `/models` endpoint, `model_version` parameter on `/predict` |
| `FullStackApp/frontend/src/components/ModelSelector.jsx` | Added ResumeModel_v3 as selectable option with "New" badge |

### Unchanged Files

| File | Status |
|------|--------|
| `ResumeModel_v2.ipynb` | Untouched — v2 model artifacts remain in `FullStackApp/` |
| `FullStackApp/model.pkl` | Untouched — v2 model |
| `FullStackApp/tfidf.pkl` | Untouched — v2 TF-IDF |
| `FullStackApp/encoder.pkl` | Untouched — v2 encoder |

---

## Backend API Changes

### New Endpoint: `GET /models`
Returns metadata about all registered model versions:
```json
{
  "models": [
    {
      "id": "ResumeModel_v2",
      "description": "Base model — KNN + OneVsRest (TF-IDF 5K features)",
      "algorithm": "OneVsRestClassifier(KNeighborsClassifier)",
      "badge": "Active",
      "available": true,
      "categories": 48
    },
    {
      "id": "ResumeModel_v3",
      "description": "Enhanced — Linear SVM + balanced classes (TF-IDF 10K features)",
      "algorithm": "OneVsRestClassifier(CalibratedClassifierCV(SGDClassifier))",
      "badge": "New",
      "available": true,
      "categories": 48
    }
  ]
}
```

### Updated Endpoint: `POST /predict`
Now accepts an optional `model_version` field:
```json
{
  "resume_text": "...",
  "job_description": "...",
  "model_version": "ResumeModel_v3"
}
```
If omitted, defaults to `ResumeModel_v2`.

---

## How to Train v3

```bash
cd c:\VsCodeFolder\Project\ResumeScanner
python ResumeModel_v3.py
```

> [!WARNING]
> Training requires all 3 datasets in the `Dataset/` folder and the `en_core_web_sm` spaCy model. The SpaCy preprocessing step takes 5–15 minutes on the full 2,824 resume dataset.

After training, the v3 artifacts will be saved to `FullStackApp/v3/` and automatically loaded by the backend on next restart.

---

## Expected Improvements

| Metric | v2 (KNN) | v3 (SVM) Expected |
|--------|----------|-------------------|
| **Overall Accuracy** | 57.88% | **~75–85%** |
| **Macro F1** | 0.60 | **~0.70–0.80** |
| **Low-sample categories (BPO, Automobile)** | 0% recall | **>0% recall** (balanced weights) |
| **Inference Speed** | Slow (distance calc to all training samples) | **Fast** (single hyperplane evaluation) |
| **Model Size** | ~365 MB | **<10 MB** |

> [!NOTE]
> The exact accuracy will be determined after running `ResumeModel_v3.py`. The estimates above are based on established ML literature showing that linear SVMs consistently outperform KNN on high-dimensional sparse text features.
