Edited Future_implementaion.md
Viewed Future_implementaion.md:5-28

This report breaks down the mathematical engine driving **ResumeModel_v2**. The model relies on two core pillars: **TF-IDF** for turning text into numbers and **K-Nearest Neighbors (KNN)** for making predictions based on distance.

### 1. TF-IDF (The Feature Engineering)

TF-IDF measures how important a word is to a resume within a larger collection (dataset).

#### Part A: Term Frequency (TF)

In v2, we use **Sublinear TF scaling** ($1 + \log(\text{TF})$). This prevents a word that appears 100 times from being 100 times more important than a word that appears once.

* **Example:** Resume A has 100 words. "Python" appears 4 times.
  * $TF = 4/100 = 0.04$

#### Part B: Inverse Document Frequency (IDF)

This penalizes common words (like "using" or "experience") and rewards rare, descriptive words (like "Kubernetes").
$$IDF(t) = \log\left(\frac{\text{Total Resumes}}{\text{Resumes containing word } t}\right)$$

* **Example:** In a dataset of 2,824 resumes:
  * "Experience" appears in 2,800 resumes $\to$ $IDF \approx \log(1.008) \approx \mathbf{0.003}$ (Very low)
  * "TensorFlow" appears in 50 resumes $\to$ $IDF \approx \log(56.48) \approx \mathbf{1.75}$ (High)

#### Final Calculation

$$\text{Weight} = TF \times IDF$$
The model creates a **5,000-dimensional vector** for every resume, where each dimension is one of these weights.

---

### 2. K-Nearest Neighbors (The Classifier)

Once every resume is a point in a 5,000-dimensional space, KNN finds the "closest" neighbors.

#### Euclidean Distance

The model uses the straight-line distance between two resume vectors ($p$ and $q$):
$$d(p,q) = \sqrt{\sum_{i=1}^{n} (q_i - p_i)^2}$$

#### The Voting Logic (K=5)

1. A new resume is uploaded and converted to a vector.
2. The model calculates the distance between this vector and all 2,259 training resumes.
3. It picks the **5 closest resumes**.
4. **Prediction:** If 4 neighbors are "Data Scientist" and 1 is "HR," the model predicts **Data Scientist** (80% confidence).

---

### 3. One-Vs-Rest (OvR) Strategy

Since we have 48 categories, the model uses **OvR**.

Mathematically, it treats the problem as 48 separate binary tests:

* Test 1: Is it "Accountant" or "Not Accountant"?
* Test 2: Is it "Advocate" or "Not Advocate"?
* ... and so on.

The category that achieves the highest internal probability score across these 48 tests is the final output.

### Summary Example

Imagine a simplified 2D space (Skills: Java vs. Python):

| Resume | Java Weight | Python Weight | Category |
| :--- | :--- | :--- | :--- |
| Train 1 | 0.9 | 0.1 | Java Dev |
| Train 2 | 0.1 | 0.8 | Data Science |
| **New Upload** | **0.2** | **0.7** | **?** |

The **New Upload** is geometrically much closer to **Train 2**. Therefore, the KNN algorithm "pulls" it into the **Data Science** category.
