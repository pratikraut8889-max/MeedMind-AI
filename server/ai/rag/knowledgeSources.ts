export interface CitationSource {
  title: string;
  organization: string;
  url: string;
  accessDate: string;
}

export interface KnowledgeDocument {
  id: string;
  topic: string;
  keywords: string[];
  title: string;
  organization: string;
  url: string;
  accessDate: string;
  content: string;
}

/**
 * Curated, authoritative medical knowledge base from trusted institutions.
 * CDC, WHO, MedlinePlus (National Library of Medicine / NIH), Mayo Clinic, and AHA.
 */
export const TRUSTED_MEDICAL_KB: KnowledgeDocument[] = [
  {
    id: 'kb_chest_pain',
    topic: 'chest pain and cardiovascular emergencies',
    keywords: ['chest pain', 'angina', 'heart attack', 'shortness of breath', 'pressure in chest', 'left arm pain', 'sweating'],
    title: 'Warning Signs of a Heart Attack',
    organization: 'American Heart Association (AHA)',
    url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack',
    accessDate: '2026-09-20',
    content: 'Chest discomfort, pressure, fullness, or squeezing pain in the center of the chest lasting more than a few minutes. Discomfort in other areas of the upper body including one or both arms, the back, neck, jaw or stomach. Shortness of breath with or without chest discomfort. Cold sweat, nausea or lightheadedness. Immediate emergency medical services (911/112) must be called.'
  },
  {
    id: 'kb_stroke_act_fast',
    topic: 'stroke warning signs and FAST protocol',
    keywords: ['stroke', 'facial drooping', 'arm weakness', 'speech difficulty', 'slurred speech', 'vision loss', 'numbness'],
    title: 'Stroke Signs and Symptoms (B.E. F.A.S.T.)',
    organization: 'Centers for Disease Control and Prevention (CDC)',
    url: 'https://www.cdc.gov/stroke/signs-symptoms/',
    accessDate: '2026-09-20',
    content: 'Balance loss, Eyes/vision disturbance, Face drooping on one side, Arm weakness or numbness, Speech difficulty or slurred speech, Time to call emergency services. Rapid thrombolytic or endovascular treatment window is critical.'
  },
  {
    id: 'kb_blood_pressure',
    topic: 'hypertension and blood pressure classification',
    keywords: ['blood pressure', 'hypertension', 'systolic', 'diastolic', 'high bp', 'prehypertension', 'hypertensive crisis'],
    title: 'Understanding Blood Pressure Readings',
    organization: 'American Heart Association (AHA) & ACC Guidelines',
    url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
    accessDate: '2026-09-20',
    content: 'Normal: Systolic < 120 and Diastolic < 80 mm Hg. Elevated: Systolic 120-129 and Diastolic < 80. Stage 1 Hypertension: Systolic 130-139 or Diastolic 80-89. Stage 2 Hypertension: Systolic 140 or higher, or Diastolic 90 or higher. Hypertensive Crisis: Systolic > 180 and/or Diastolic > 120 mm Hg requiring immediate emergency consultation if symptomatic.'
  },
  {
    id: 'kb_cbc_anemia',
    topic: 'complete blood count, hemoglobin, and anemia',
    keywords: ['hemoglobin', 'hgb', 'hematocrit', 'rbc', 'anemia', 'red blood cell', 'ferritin', 'iron', 'fatigue'],
    title: 'Complete Blood Count (CBC) and Hemoglobin',
    organization: 'MedlinePlus - National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/complete-blood-count/',
    accessDate: '2026-09-20',
    content: 'Normal adult male Hemoglobin: 13.8 to 17.2 g/dL. Normal adult female Hemoglobin: 12.1 to 15.1 g/dL. Low hemoglobin indicates anemia which can cause fatigue, paleness, or dizziness. High hemoglobin can occur with dehydration, smoking, or living at high altitudes.'
  },
  {
    id: 'kb_wbc_infection',
    topic: 'white blood cell count and immune response',
    keywords: ['wbc', 'white blood cells', 'leukocyte', 'neutrophil', 'lymphocyte', 'infection', 'fever', 'inflammation'],
    title: 'White Blood Cell (WBC) Count Reference Guide',
    organization: 'MedlinePlus - National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/white-blood-cell-count/',
    accessDate: '2026-09-20',
    content: 'Standard reference range for adult White Blood Cell count is 4,500 to 11,000 cells/mcL (or 4.5 to 11.0 x 10^9/L). Elevated WBC (leukocytosis) frequently indicates an active bacterial or viral infection, inflammation, or acute physical stress. Abnormally low WBC (leukopenia) may reflect viral infections, autoimmune conditions, or bone marrow suppression.'
  },
  {
    id: 'kb_blood_glucose',
    topic: 'fasting blood glucose and diabetes markers',
    keywords: ['glucose', 'blood sugar', 'fasting glucose', 'a1c', 'hba1c', 'diabetes', 'hypoglycemia', 'hyperglycemia'],
    title: 'Blood Glucose and HbA1c Lab Test Interpretation',
    organization: 'American Diabetes Association (ADA)',
    url: 'https://diabetes.org/about-diabetes/diagnosis',
    accessDate: '2026-09-20',
    content: 'Fasting blood glucose: Normal is under 100 mg/dL (5.6 mmol/L). Prediabetes: 100 to 125 mg/dL. Diabetes criteria: 126 mg/dL or higher on two separate tests. HbA1c: Normal < 5.7%, Prediabetes 5.7%-6.4%, Diabetes >= 6.5%. Severe hypoglycemia (< 54 mg/dL) requires immediate fast-acting carbohydrate ingestion.'
  },
  {
    id: 'kb_cholesterol_lipids',
    topic: 'lipid panel, ldl, hdl, and triglycerides',
    keywords: ['cholesterol', 'lipid panel', 'ldl', 'hdl', 'triglycerides', 'vldl', 'cardiac risk', 'statin'],
    title: 'Cholesterol Levels and Lipid Profile Guidelines',
    organization: 'National Heart, Lung, and Blood Institute (NHLBI / NIH)',
    url: 'https://www.nhlbi.nih.gov/health/blood-cholesterol',
    accessDate: '2026-09-20',
    content: 'Total cholesterol: Desirable < 200 mg/dL. LDL ("bad") cholesterol: Optimal < 100 mg/dL (or < 70 mg/dL in high-risk cardiovascular patients). HDL ("good") cholesterol: Protective >= 60 mg/dL, low if < 40 mg/dL in men or < 50 mg/dL in women. Triglycerides: Normal < 150 mg/dL.'
  },
  {
    id: 'kb_fever_infection',
    topic: 'fever management and red flag indicators',
    keywords: ['fever', 'temperature', 'chills', 'rigors', 'hyperthermia', 'pediatric fever', 'stiff neck'],
    title: 'Fever in Adults and Children: Care and When to Seek Help',
    organization: 'Mayo Clinic',
    url: 'https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352759',
    accessDate: '2026-09-20',
    content: 'Normal body temperature is around 98.6°F (37°C). A fever is generally defined as 100.4°F (38°C) or higher. Red flags warranting urgent medical evaluation include fever accompanied by a stiff neck, confusion, shortness of breath, unexplained rash, or temperature exceeding 103°F (39.4°C) in adults that does not respond to medication.'
  },
  {
    id: 'kb_kidney_function',
    topic: 'creatinine, egfr, bun, and renal health',
    keywords: ['creatinine', 'egfr', 'bun', 'kidney', 'renal', 'gfr', 'glomerular', 'proteinuria'],
    title: 'Kidney Function Tests: Creatinine and eGFR',
    organization: 'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK / NIH)',
    url: 'https://www.niddk.nih.gov/health-information/kidney-disease/diagnostic-tests',
    accessDate: '2026-09-20',
    content: 'Serum creatinine: Typically 0.7 to 1.3 mg/dL for men, 0.6 to 1.1 mg/dL for women. eGFR (estimated Glomerular Filtration Rate): >= 90 mL/min/1.73m² is normal or high; 60-89 mildly decreased; < 60 indicates reduced kidney function for over 3 months.'
  },
  {
    id: 'kb_liver_function',
    topic: 'alt, ast, bilirubin, alkaline phosphatase',
    keywords: ['alt', 'ast', 'bilirubin', 'alkaline phosphatase', 'liver enzymes', 'hepatic', 'jaundice'],
    title: 'Liver Function Tests Overview',
    organization: 'MedlinePlus - National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/liver-function-tests/',
    accessDate: '2026-09-20',
    content: 'Key hepatic markers: ALT (alanine aminotransferase, 7-56 units/L) and AST (aspartate aminotransferase, 10-40 units/L). Elevation suggests liver cell injury or stress. Total bilirubin: 0.1 to 1.2 mg/dL; elevated bilirubin can cause visible jaundice.'
  }
];

export interface RAGRetrievalResult {
  documents: KnowledgeDocument[];
  citations: CitationSource[];
  contextString: string;
}

/**
 * Medical Knowledge Retriever (RAG module).
 * Matches user query / medical text against verified knowledge documents.
 */
export function retrieveMedicalKnowledge(queryText: string, maxResults = 3): RAGRetrievalResult {
  const normalizedQuery = queryText.toLowerCase();

  const scoredDocs = TRUSTED_MEDICAL_KB.map((doc) => {
    let score = 0;
    // Check keyword matches
    for (const keyword of doc.keywords) {
      if (normalizedQuery.includes(keyword.toLowerCase())) {
        score += 3;
      }
    }
    // Check topic words
    const topicWords = doc.topic.toLowerCase().split(/\s+/);
    for (const word of topicWords) {
      if (word.length > 3 && normalizedQuery.includes(word)) {
        score += 1;
      }
    }
    return { doc, score };
  })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.doc);

  const citations: CitationSource[] = scoredDocs.map((d) => ({
    title: d.title,
    organization: d.organization,
    url: d.url,
    accessDate: d.accessDate
  }));

  const contextString = scoredDocs.length > 0
    ? scoredDocs.map((d) => `[Source: ${d.organization} - "${d.title}"]\n${d.content}\nURL: ${d.url}`).join('\n\n')
    : 'No specific reference matches in local authoritative database. Use standard validated medical evidence.';

  return {
    documents: scoredDocs,
    citations,
    contextString
  };
}
