# 📊 Detailed Analysis & Improvement Report: Resume Classifier v2

यह रिपोर्ट `ResumeModel_v2.ipynb` की मौजूदा स्थिति, उसमें अपनाई गई मेथोडोलॉजी, प्राप्त परिणामों और मॉडल की Accuracy को वापस 90%+ ले जाने के लिए संभावित सुधारों का विस्तृत विश्लेषण (Detailed Analysis) है।

## 1. क्या किया गया है? (What has been done?)

**मुख्य उद्देश्य (Objective):**  
एक मजबूत Multi-Class Resume Classification Model तैयार करना जो केवल IT ही नहीं, बल्कि Non-IT (General domains) और नए Tech Roles को भी समझ सके।

**डेटासेट एकीकरण (Dataset Integration):**

* **3 अलग-अलग Datasets** को मिलाया गया:
    1. `UpdatedResumeDataSet.csv`: 962 Resumes (25 Categories - Original Tech Focus)
    2. `resume_dataset.csv`: 400 Resumes (8 New Modern Tech Roles)
    3. `Resume.csv`: 2484 Resumes (24 General Domains जैसे Accountant, Advocate)
* तीनों को मिलाकर एक Master Dataset बनाया गया जिसमें लगभग **2835 अनोखे (Unique) Resumes** और **51 Categories** शामिल थीं।

## 2. यह कैसे किया गया? (How was it implemented?)

इस प्रक्रिया को मुख्य रूप से 5 स्टेप्स में पूरा किया गया:

1. **Data Normalization:**
   अलग-अलग डेटासेट में Categories का नाम अलग था (जैसे 'ACCOUNTANT' और 'Accountant')। `category_map` डिक्शनरी का उपयोग करके सभी UPPERCASE नामों को Proper Title Case में बदला गया।
2. **Text Cleaning:**
   Regular Expressions (`re` module) का उपयोग करके URL (http/https), Hashtags, Mentions (@), HTML Tags और Special Characters को रेज़्यूमे टेक्स्ट से हटा दिया गया।
3. **NLP Preprocessing:**
   `spaCy` (en_core_web_sm) का उपयोग करके Stopwords, Punctuations और Spaces हटाए गए, और शब्दों को उनके मूल रूप (Lemmatization) में बदला गया।
4. **Feature Extraction (TF-IDF):**
   Text को Machine Learning समझने योग्य Numbers में बदलने के लिए `TfidfVectorizer` का इस्तेमाल किया गया (Limit: 5000 `max_features` और N-grams: (1,2))।
5. **Model Training:**
   डेटासेट से कम से कम 5 सैंपल वाली Categories को रखा गया (Total 48 Categories)। इसके बाद Data को 80% Train और 20% Test में `stratify` के साथ बांटा गया। ट्रेनिंग के लिए `OneVsRestClassifier` के साथ `KNeighborsClassifier (KNN)` का इस्तेमाल किया गया।

## 3. इससे क्या मिला? (What were the results?)

> [!WARNING]
> **Performance Drop:** Model v2 (48 Categories) की **Accuracy 57.88%** हो गई है, जो कि Model v1 (25 Categories - 98.96%) के मुकाबले बहुत बड़ी गिरावट है।

**Classification Report से मिले गहरे इनसाइट्स:**

* **Imbalance Issue:** मॉडल उन कैटेगरीज में बहुत अच्छा कर रहा है जहां डेटा ज्यादा है (जैसे *Chef* की Accuracy 90%, *Full Stack Developer* की 92% है)।
* **Poor Generalization:** जिन कैटेगरीज में डेटा 5-10 रेज़्यूमे तक सीमित है (जैसे *Automobile*, *Blockchain*, *DevOps Engineer*), वहां Accuracy **0.00%** है। मॉडल उन्हें पूरी तरह इग्नोर कर रहा है।
* **Curse of Dimensionality:** KNN (K-Nearest Neighbors) एल्गोरिथ्म 5000 Dimensional TF-IDF मैट्रिक्स पर 'Distance' कैलकुलेट करने में फेल हो रहा है, क्योंकि इतने बड़े टेक्स्ट डायमेंशन में Data Points के बीच की दूरी का कोई खास मतलब नहीं रह जाता।

## 4. आगे क्या-क्या सुधार किया जा सकता है? (What else can be done with Examples)

मॉडल को बेहतर बनाने के लिए आप अपनी Jupyter Notebook में निम्नलिखित बदलाव कर सकते हैं:

### 💡 A. Change the Core Algorithm (सबसे प्रभावशाली सुधार)

TF-IDF जैसे हाई-डायमेंशनल डेटा पर KNN बहुत धीमा और खराब होता है। इसके बजाय **LinearSVC** (Support Vector Machines) या **Multinomial Naive Bayes** का इस्तेमाल करें।

**Example Code:**

```python
# पुरानी KNN अप्रोच
# knn = KNeighborsClassifier(n_neighbors=5, metric='euclidean')
# model = OneVsRestClassifier(knn)

# नई और बेहतर अप्रोच (LinearSVC)
from sklearn.svm import LinearSVC
import warnings
warnings.filterwarnings('ignore')

print('Training LinearSVC Model ...')
model = LinearSVC(class_weight='balanced', random_state=42)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
```

### 💡 B. Handle Class Imbalance with SMOTE

चूँकि कुछ Categories में 120 रेज़्यूमे हैं और कुछ में सिर्फ 5, इसलिए Minority classes का डेटा बढ़ाने के लिए SMOTE (Synthetic Minority Over-sampling Technique) का इस्तेमाल करें।

**Example Code:**

```python
from imblearn.over_sampling import SMOTE

print("Original Training Shape:", X_train.shape)

# k_neighbors=3 रखा गया है क्योंकि कुछ कैटेगरीज में सिर्फ 4-5 सैम्पल्स हैं
smote = SMOTE(random_state=42, k_neighbors=3)
X_train_smote, y_train_smote = smote.fit_resample(X_train, y_train)

print("SMOTE Training Shape:", X_train_smote.shape)

# अब नए बैलेंस डेटा (X_train_smote, y_train_smote) पर मॉडल ट्रेन करें
model.fit(X_train_smote, y_train_smote)
```

### 💡 C. Grouping Similar Categories (कैटेगरीज को मिलाना)

48 Categories से मॉडल कन्फ्यूज़ हो रहा है। जो Categories एक जैसी स्किल्स मांगती हैं, उन्हें 1 बड़ी केटेगरी में मिला दें। इससे सैम्पल्स बढ़ेंगे और मॉडल सटीकता से प्रिडिक्ट करेगा।

> [!TIP]
> **Minimum Threshold:** जिन Categories में 15 से कम सैम्पल्स हैं, उन्हें या तो ड्रॉप कर दें या "Other" नाम की केटेगरी में डाल दें। `MIN_SAMPLES = 15` सेट करें।

**Example Code:**

```python
# Step 2 में डेटासेट कंबाइन करते वक़्त एक नई मैपिंग बनाएं:
job_family_map = {
    'Frontend Developer': 'Web Developer',
    'Backend Developer': 'Web Developer',
    'Web Designing': 'Web Developer',
    'Full Stack Developer': 'Web Developer',
    
    'Machine Learning Engineer': 'Data Science & ML',
    'Data Scientist': 'Data Science & ML',
    'Data Science': 'Data Science & ML'
}

# Mapping Apply करें
df['Category'] = df['Category'].replace(job_family_map)
```

### 💡 D. Cross-Validation & Hyperparameter Tuning

Default parameters इस्तेमाल करने के बजाय GridSearchCV लगाकर बेस्ट पैरामीटर्स ढूँढें।

**Example Code:**

```python
from sklearn.model_selection import GridSearchCV
from sklearn.naive_bayes import MultinomialNB

# Naive Bayes के लिए Tuning
param_grid = {'alpha': [0.1, 0.5, 1.0, 2.0]}
nb_model = MultinomialNB()

grid = GridSearchCV(nb_model, param_grid, cv=5, scoring='accuracy', n_jobs=-1)
grid.fit(X_train, y_train)

print("Best Parameters:", grid.best_params_)
print("Best Cross-Validation Score:", grid.best_score_)
```

### 💡 E. Advanced: Use Word Embeddings (Deep Learning अप्रोच)

अगर आप TF-IDF (जो सिर्फ Words का Count देखता है) से आगे बढ़ना चाहते हैं, तो Pre-trained Word Embeddings का यूज़ करें जो Words के 'Context और Meaning' को समझते हैं।

**Example Approach:**

1. `spaCy` का बढ़ा मॉडल: `python -m spacy download en_core_web_md`
2. हर रेज़्यूमे को `doc.vector` में कन्वर्ट करें।
3. इसके बाद **XGBoost** या **Random Forest** का यूज़ करें।
