# Resume vs Job Description Matching — Implementation Guide

## Current State of Your Project

Your `ResumeModel_v2.ipynb` currently implements **resume classification** — it predicts which job category (out of 48) a resume belongs to using:

```
Resume Text → Clean Text → spaCy Preprocessing → TF-IDF (5000 features) → OneVsRestClassifier + KNN → Predicted Category
```

This is **NOT** the same as Resume vs Job Description matching. Classification tells you *what category a resume fits*, while **matching** tells you *how well a specific resume fits a specific job description*.

---

## What is Resume vs Job Description Matching?

**Goal:** Given a resume and a job description, compute a **similarity/match score** (0–100%) that indicates how well the resume fits that specific job.

---

## Ways to Implement Resume vs Job Description Matching

There are **6 main approaches**, ranging from simple to advanced:

---

### 1. 🔑 Keyword-Based Matching (Simplest — Already Partially Exists)

> [!NOTE]  
> You already have a basic version of this in [keywords.js](file:///c:/VsCodeFolder/Project/ML-Based%20Resume/FullStackApp/frontend/src/utils/keywords.js) on the frontend.

**How it works:**
1. Extract key skills/keywords from the job description
2. Check which keywords appear in the resume
3. Score = `(found keywords / total keywords) × 100`

**Pros:** Simple, fast, easy to explain  
**Cons:** Very shallow — misses synonyms, context, and semantic meaning

**Implementation in the notebook:**
```python
def keyword_match(resume_text, job_description, keywords_list=None):
    """Simple keyword overlap matching"""
    # Clean both texts
    resume_clean = clean_text(resume_text).lower()
    jd_clean = clean_text(job_description).lower()
    
    # Extract words from JD as keywords (or use a provided list)
    if keywords_list is None:
        jd_words = set(jd_clean.split())
    else:
        jd_words = set(kw.lower() for kw in keywords_list)
    
    resume_words = set(resume_clean.split())
    
    matched = jd_words.intersection(resume_words)
    score = len(matched) / len(jd_words) * 100 if jd_words else 0
    
    return {
        'score': round(score, 2),
        'matched_keywords': list(matched),
        'missing_keywords': list(jd_words - matched)
    }
```

---

### 2. 📐 TF-IDF + Cosine Similarity (Recommended Starting Point)

> [!TIP]  
> This is the **best approach to start with** because you already have a trained TF-IDF vectorizer (`tfidf.pkl`).

**How it works:**
1. Use your existing TF-IDF vectorizer to transform both the resume and job description into vectors
2. Calculate the **cosine similarity** between the two vectors
3. Score = cosine similarity × 100

**Pros:** Leverages your existing model artifacts, considers word importance (TF-IDF weights), no retraining needed  
**Cons:** Still bag-of-words — misses word order and deep semantic meaning

**Implementation in the notebook:**
```python
from sklearn.metrics.pairwise import cosine_similarity

def tfidf_match(resume_text, job_description, tfidf_vectorizer, nlp_model):
    """Match resume to job description using TF-IDF cosine similarity"""
    # Preprocess both texts using the same pipeline
    resume_processed = preprocess_text(resume_text, nlp_model)
    jd_processed = preprocess_text(job_description, nlp_model)
    
    # Transform using the SAME fitted TF-IDF vectorizer
    resume_vector = tfidf_vectorizer.transform([resume_processed])
    jd_vector = tfidf_vectorizer.transform([jd_processed])
    
    # Compute cosine similarity
    similarity = cosine_similarity(resume_vector, jd_vector)[0][0]
    
    return {
        'score': round(similarity * 100, 2),
        'resume_top_terms': get_top_terms(resume_vector, tfidf_vectorizer, n=10),
        'jd_top_terms': get_top_terms(jd_vector, tfidf_vectorizer, n=10)
    }

def get_top_terms(tfidf_vector, vectorizer, n=10):
    """Get top N TF-IDF terms from a vector"""
    feature_names = vectorizer.get_feature_names_out()
    sorted_indices = tfidf_vector.toarray().flatten().argsort()[::-1][:n]
    return [feature_names[i] for i in sorted_indices]
```

**Integration with your backend (`main.py`):**
```python
@app.post("/match")
def match_resume_to_job(input_data: MatchInput):
    """Match a resume against a job description"""
    resume_processed = preprocess_text(input_data.resume_text)
    jd_processed = preprocess_text(input_data.job_description)
    
    resume_vec = tfidf.transform([resume_processed])
    jd_vec = tfidf.transform([jd_processed])
    
    score = cosine_similarity(resume_vec, jd_vec)[0][0]
    
    return {"match_score": round(score * 100, 2)}
```

---

### 3. 🧠 Sentence Transformers / SBERT (Best Semantic Understanding)

> [!IMPORTANT]  
> This is the **most powerful approach** for understanding meaning, but requires downloading a pre-trained transformer model (~400MB).

**How it works:**
1. Use a pre-trained sentence transformer (e.g., `all-MiniLM-L6-v2`) to encode both texts into dense embeddings
2. Compute cosine similarity between the embeddings
3. These models understand **synonyms, context, and paraphrasing**

**Pros:** Best semantic understanding — "Python programming" and "coding in Python" score high  
**Cons:** Requires a large model download, slower inference

**Implementation:**
```python
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

model = SentenceTransformer('all-MiniLM-L6-v2')

def semantic_match(resume_text, job_description):
    """Deep semantic matching using sentence transformers"""
    # Encode both texts
    resume_embedding = model.encode([resume_text])
    jd_embedding = model.encode([job_description])
    
    # Cosine similarity
    score = cosine_similarity(resume_embedding, jd_embedding)[0][0]
    
    return {'score': round(score * 100, 2)}
```

**Required install:**
```bash
pip install sentence-transformers
```

---

### 4. 🔀 Hybrid Approach (TF-IDF + Keyword + Classification)

> [!TIP]  
> This combines multiple signals for a more robust score.

**How it works:**
1. **TF-IDF similarity** — Compute cosine similarity between resume and JD vectors (0–100)
2. **Keyword overlap** — Count matched vs missing keywords (0–100)
3. **Category alignment** — Use your classifier to predict the resume's category and check if it matches the JD's category (0 or 100)
4. **Weighted final score** — Combine all three:

```python
def hybrid_match(resume_text, job_description, target_category,
                 tfidf_vectorizer, model, label_encoder, nlp_model):
    """Hybrid matching combining multiple signals"""
    
    # 1. TF-IDF Cosine Similarity (40% weight)
    resume_proc = preprocess_text(resume_text, nlp_model)
    jd_proc = preprocess_text(job_description, nlp_model)
    resume_vec = tfidf_vectorizer.transform([resume_proc])
    jd_vec = tfidf_vectorizer.transform([jd_proc])
    tfidf_score = cosine_similarity(resume_vec, jd_vec)[0][0] * 100
    
    # 2. Keyword Overlap (30% weight)
    keyword_result = keyword_match(resume_text, job_description)
    keyword_score = keyword_result['score']
    
    # 3. Category Alignment (30% weight)
    prediction = model.predict(resume_vec)
    predicted_cat = label_encoder.inverse_transform(prediction)[0]
    category_score = 100 if predicted_cat == target_category else 0
    
    # Weighted combination
    final_score = (tfidf_score * 0.4) + (keyword_score * 0.3) + (category_score * 0.3)
    
    return {
        'final_score': round(final_score, 2),
        'tfidf_score': round(tfidf_score, 2),
        'keyword_score': round(keyword_score, 2),
        'category_match': predicted_cat == target_category,
        'predicted_category': predicted_cat,
        'matched_keywords': keyword_result['matched_keywords'],
        'missing_keywords': keyword_result['missing_keywords']
    }
```

---

### 5. 📊 Jaccard Similarity (Simple Set-Based)

**How it works:**
1. Convert both texts into sets of words (after preprocessing)
2. Jaccard Index = `|A ∩ B| / |A ∪ B|`

```python
def jaccard_match(resume_text, job_description, nlp_model):
    """Jaccard similarity between resume and JD word sets"""
    resume_words = set(preprocess_text(resume_text, nlp_model).split())
    jd_words = set(preprocess_text(job_description, nlp_model).split())
    
    intersection = resume_words & jd_words
    union = resume_words | jd_words
    
    score = len(intersection) / len(union) * 100 if union else 0
    return {'score': round(score, 2)}
```

**Pros:** Dead simple  
**Cons:** No weighting — rare skills and common words count equally

---

### 6. 🤖 Fine-Tuned BERT for Matching (Most Advanced)

**How it works:**
1. Fine-tune a BERT model on resume–JD pairs labeled with match scores
2. Input: `[CLS] resume_text [SEP] job_description [SEP]`
3. Output: match score (regression) or match/no-match (classification)

**Pros:** State-of-the-art accuracy, understands complex context  
**Cons:** Requires labeled training data (resume–JD pairs with scores), GPU for training, most complex to implement

> [!CAUTION]  
> This approach requires **labeled training data** (pairs of resumes + job descriptions with known match scores). You don't currently have this dataset.

---

## Summary Comparison

| # | Method | Difficulty | Accuracy | Speed | Needs Retraining? |
|---|--------|-----------|----------|-------|-------------------|
| 1 | Keyword Matching | ⭐ Easy | ⭐⭐ Low | ⚡ Fast | ❌ No |
| 2 | **TF-IDF + Cosine** | ⭐⭐ Easy | ⭐⭐⭐ Medium | ⚡ Fast | ❌ No (reuse `tfidf.pkl`) |
| 3 | Sentence Transformers | ⭐⭐⭐ Medium | ⭐⭐⭐⭐⭐ High | 🐢 Slow | ❌ No (pre-trained) |
| 4 | **Hybrid (2+1+Classification)** | ⭐⭐⭐ Medium | ⭐⭐⭐⭐ High | ⚡ Fast | ❌ No |
| 5 | Jaccard Similarity | ⭐ Easy | ⭐⭐ Low | ⚡ Fast | ❌ No |
| 6 | Fine-Tuned BERT | ⭐⭐⭐⭐⭐ Hard | ⭐⭐⭐⭐⭐ Highest | 🐢 Slow | ✅ Yes |

---

## 🎯 Recommended Implementation Path

> [!IMPORTANT]
> **For your current project, I recommend starting with Approach #2 (TF-IDF + Cosine Similarity)** because:
> - You already have `tfidf.pkl` trained — no retraining needed
> - It integrates directly into your existing FastAPI backend
> - It gives meaningful results quickly
> 
> Then **upgrade to Approach #4 (Hybrid)** by combining TF-IDF similarity + keyword matching + your existing classifier for a more robust score.
