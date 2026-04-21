# 📁 Cleaned Frontend Architecture Report

बधाई हो! अब आपके प्रोजेक्ट का Frontend बिल्कुल "KISS (Keep It Simple, Stupid)" सिद्धांत के अनुसार सेट हो गया है। पुराना बिखरा हुआ स्ट्रक्चर अब एक मॉडर्न, क्लीन और इंडस्ट्री-स्टैंडर्ड लेआउट में बदल गया है।

नीचे पूरे `src` फ़ोल्डर का नया नक्शा और हर फ़ाइल का काम (Role) हिंदी और आसान भाषा में समझाया गया है:

## 🗺️ New Folder Structure (नया नक्शा)

```text
src/
├ components/          # (All Reusable UI Pieces)
├ pages/               # (Full Screen Pages)
├ hooks/               # (Custom Logic)
├ services/            # (Backend API connection)
├ utils/               # (Helper Functions)
├ App.jsx              # (Main Router / Navigator)
├ main.jsx             # (Entry Point)
├ store.js             # (Global State / Data Manager)
├ queryClient.js       # (Data Fetcher Settings)
└ index.css            # (Tailwind Styling)
```

## 🔍 हर File/Folder क्या करता है?

### 1. Root Files (जो `src` के एकदम बाहर हैं)

ये वो फाइलें हैं जो पूरे एप्लीकेशन को बांधकर रखती हैं:

* **`main.jsx`**: यह सबसे पहली फ़ाइल है जो चलती है। यह React को HTML में जोड़ती है और पूरे ऐप को ज़रूरी 'पावर' (Router, React Query) देती है।
* **`App.jsx`**: यह ऐप का "ट्रैफिक पुलिस" है। यह तय करता है कि अगर यूज़र `/` पर है तो `LandingPage` दिखाओ और अगर `/results` पर है तो `ResultsPage` दिखाओ।
* **`store.js`**: यह ऐप की **"Memory (दिमाग)"** है जिसे *Zustand* लाइब्रेरी से बनाया गया है। यह याद रखता है कि यूज़र ने कौन सा रेज़्यूमे डाला, क्या जॉब डिस्क्रिप्शन थी, और मॉडल का रिज़ल्ट क्या आया (ताकि हर पेज को यह डेटा मिल सके)।
* **`queryClient.js`**: यह सिर्फ एक सेटिंग फाइल है जो तय करती है कि जब हम बैकएंड से बात करेंगे, तो डेटा कितनी देर तक कॅश (Cache) रखना है और एरर आने पर कितनी बार रिट्राई (Retry) करना है।
* **`index.css`**: इसमें पूरे वेबसाइट की ग्लोबल स्टाइलिंग और *Tailwind CSS* की सेटिंग्स होती हैं।

### 2. `components/` (छोटे-छोटे UI के हिस्से)

यहाँ वो फाइलें हैं जिन्हें हम कहीं भी, बार-बार इस्तेमाल (Reuse) कर सकते हैं:

* **`Navbar.jsx`**: वेबसाइट के ऊपर का नेविगेशन बार, जहाँ लोगो है और Login/Logout का बटन है।
* **`DropZone.jsx`**: वह बॉक्स जहाँ यूज़र अपना PDF/DOCX रेज़्यूमे drag-and-drop करता है। यह फ़ाइल PDF से टेक्स्ट भी निकालती है।
* **`JobDescriptionInput.jsx`**: वह टेक्स्ट बॉक्स जहाँ यूज़र जॉब डिस्क्रिप्शन पेस्ट कर सकता है।
* **`ScoreRing.jsx`**: एक खूबसूरत एनिमेटेड गोल (Circle) ग्राफ, जो रिज़ल्ट पेज पर 'Confidence Score' या 'ATS Score' दिखाने के काम आता है।
* **`AuthModal.jsx`**: लॉगिन/साइनअप का पॉप-अप (Modal) जो स्क्रीन के बीच में खुलता है।
* **`LoginForm.jsx` & `SignupForm.jsx`**: ऑथेंटिकेशन (Login/Signup) के फॉर्म्स जो `AuthModal` के अंदर इस्तेमाल होते हैं।
* **`Skeleton.jsx`**: जब डेटा लोड हो रहा होता है, तब जो ग्रे-कलर का 'Loading Effect' दिखता है, वो इसी फ़ाइल से आता है।

### 3. `pages/` (मुख्य स्क्रीन्स)

यह वो फाइलें हैं जो यूज़र को अपनी पूरी स्क्रीन पर दिखाई देती हैं:

* **`LandingPage.jsx`**: होमपेज। जहाँ यूज़र सबसे पहले आता है। इसी पेज पर `DropZone` और `JobDescriptionInput` को कॉल किया जाता है, और "Analyze Resume" बटन मौजूद होता है।
* **`ResultsPage.jsx`**: रिज़ल्ट स्क्रीन। जब मॉडल रेज़्यूमे पढ़ लेता है, तो यूज़र इसी पेज पर आता है जहाँ उसे 'Predicted Category' (जैसे Java Developer) और 'Confidence Score' दिखाई देता है।

### 4. `hooks/` & `services/` & `utils/` (अंदर काम करने वाले मैकेनिक)

ये फाइलें UI नहीं बनातीं, बल्कि पीछे का दिमाग (Logic) चलाती हैं:

* **`hooks/useAnalyze.js`**: यह एक कस्टम 'React Query' हुक है। जब आप "Analyze" बटन दबाते हैं, तो यह फ़ाइल Backend (FastAPI Model) को कॉल लगाती है, लोडिंग का एनीमेशन दिखाती है, और रिज़ल्ट आने पर आपको `ResultsPage` पर भेज देती है।
* **`services/api.js`**: यह एक सेटअप फ़ाइल है जो `axios` का इस्तेमाल करके बताती है कि हमारा Backend कहाँ स्थित है (जैसे `http://localhost:8000`)।
* **`utils/keywords.js`**: (अगर मौजूद है) इसमें जॉब के कीवर्ड्स या छोटे-मोटे हेल्पर फंक्शन्स रखे जाते हैं।

## 💡 इस क्लीन-अप का फायदा क्या हुआ?

1. **आसानी:** अब अगर आपको Navbar में कुछ बदलना है, तो आपको 4 फोल्डर अंदर नहीं जाना पड़ेगा। आप सीधा `components/Navbar.jsx` खोल सकते हैं।
2. **Future-Proof:** जब हम अपना "ATS Resume Optimizer" (Option B जो हमने प्लान किया था) बनाएंगे, तो हम सिर्फ एक नया पेज `OptimizerPage.jsx` बनाएँगे और उसे `App.jsx` में रजिस्टर कर देंगे। बिलकुल सिंपल!
