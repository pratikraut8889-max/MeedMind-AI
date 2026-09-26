/**
 * MediMind AI - Knowledge Source Registry & Abstraction Layer
 * Manages authoritative medical sources and their chunked representations.
 * Allows medical knowledge sources to be registered, retrieved, or removed dynamically
 * at runtime without rewriting any application or workflow logic.
 */

import { KnowledgeSource, KnowledgeChunk } from './types';
import { generateDenseSemanticVector } from './embeddings';

// Helper to construct pre-embedded chunks
function createChunk(
  sourceId: string,
  docId: string,
  sourceTitle: string,
  organization: string,
  url: string,
  pubDate: string,
  sectionTitle: string,
  content: string,
  keywords: string[],
  domain: string,
  chunkIndex: number
): KnowledgeChunk {
  const chunkTextForEmbedding = `${sourceTitle} ${sectionTitle} ${keywords.join(' ')} ${content}`;
  return {
    id: `${sourceId}_chk_${chunkIndex}`,
    sourceId,
    documentIdentifier: docId,
    sourceTitle,
    organization,
    url,
    publicationDate: pubDate,
    sectionTitle,
    content: content.trim(),
    tokenCount: Math.ceil(content.length / 4),
    keywords,
    clinicalDomain: domain,
    embedding: generateDenseSemanticVector(chunkTextForEmbedding),
    metadata: {
      indexedAt: '2026-09-21',
      version: '2026.3',
      evidenceLevel: 'Grade A Consensus'
    }
  };
}

/**
 * Built-in Authoritative Medical Knowledge Base (CDC, WHO, NIH, MedlinePlus, AHA, ADA, Mayo Clinic, etc.)
 */
export const AUTHORITATIVE_SOURCES: KnowledgeSource[] = [
  // 1. AHA Heart Attack
  {
    id: 'src_aha_heart_attack',
    title: 'Warning Signs of a Heart Attack and Acute Coronary Syndrome',
    organization: 'American Heart Association (AHA)',
    url: 'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack',
    documentIdentifier: 'AHA-GDL-2026-CV01',
    publicationDate: '2026-01-15',
    category: 'Cardiology & Emergency Medicine',
    evidenceLevel: 'Class I (Strong) - Level A',
    summary: 'Clinical indicators for acute myocardial infarction, emergency presentation, and immediate medical actions.',
    metadata: { peerReviewed: true, guidelinesBody: 'AHA/ACC' },
    chunks: [
      createChunk(
        'src_aha_heart_attack',
        'AHA-GDL-2026-CV01',
        'Warning Signs of a Heart Attack and Acute Coronary Syndrome',
        'American Heart Association (AHA)',
        'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack',
        '2026-01-15',
        'Classic and Atypical Presentation',
        'Chest discomfort or pain in the center of the chest lasting more than a few minutes, or that goes away and comes back. It can feel like uncomfortable pressure, squeezing, fullness, or pain. Discomfort may radiate to one or both arms, the back, neck, jaw, or stomach. Women and elderly patients often experience shortness of breath, unexplained nausea/vomiting, and severe fatigue without classic crushing substernal chest pain.',
        ['chest pain', 'angina', 'heart attack', 'myocardial infarction', 'shortness of breath', 'jaw pain', 'left arm pain', 'sweating', 'nausea'],
        'Cardiology',
        1
      ),
      createChunk(
        'src_aha_heart_attack',
        'AHA-GDL-2026-CV01',
        'Warning Signs of a Heart Attack and Acute Coronary Syndrome',
        'American Heart Association (AHA)',
        'https://www.heart.org/en/health-topics/heart-attack/warning-signs-of-a-heart-attack',
        '2026-01-15',
        'Emergency Action Protocol',
        'Immediate emergency medical services activation (911 or 112) is mandatory. Do not attempt to drive to the hospital. Emergency medical personnel can begin life-saving treatment on arrival. Early reperfusion via percutaneous coronary intervention (PCI) or thrombolytic therapy within the golden 90-minute window significantly reduces myocardial necrosis and mortality.',
        ['emergency', '911', 'cardiac arrest', 'pci', 'reperfusion', 'cardiovascular emergency'],
        'Emergency Medicine',
        2
      )
    ]
  },

  // 2. CDC Stroke Signs
  {
    id: 'src_cdc_stroke_fast',
    title: 'Stroke Warning Signs and the B.E. F.A.S.T. Assessment Protocol',
    organization: 'Centers for Disease Control and Prevention (CDC)',
    url: 'https://www.cdc.gov/stroke/signs-symptoms/',
    documentIdentifier: 'CDC-STR-2026-01',
    publicationDate: '2026-02-10',
    category: 'Neurology & Emergency Medicine',
    evidenceLevel: 'CDC Clinical Guidance',
    summary: 'Rapid recognition of acute ischemic and hemorrhagic strokes using the validated B.E. F.A.S.T. protocol.',
    metadata: { peerReviewed: true, guidelinesBody: 'CDC / NINDS' },
    chunks: [
      createChunk(
        'src_cdc_stroke_fast',
        'CDC-STR-2026-01',
        'Stroke Warning Signs and the B.E. F.A.S.T. Assessment Protocol',
        'Centers for Disease Control and Prevention (CDC)',
        'https://www.cdc.gov/stroke/signs-symptoms/',
        '2026-02-10',
        'B.E. F.A.S.T. Clinical Protocol',
        'B - Balance: Sudden loss of balance or coordination. E - Eyes: Sudden vision loss or diplopia (double vision) in one or both eyes. F - Face: Facial drooping or asymmetric smile. A - Arms: Arm weakness or drift when raised. S - Speech: Slurred speech or difficulty repeating simple sentences. T - Time: Time to immediately call 911. Thrombolytic tissue plasminogen activator (tPA) or mechanical thrombectomy is time-sensitive (ideal window <= 3 to 4.5 hours from symptom onset).',
        ['stroke', 'cerebrovascular accident', 'fast', 'facial drooping', 'slurred speech', 'arm weakness', 'vision loss', 'thrombectomy', 'tpa'],
        'Neurology',
        1
      )
    ]
  },

  // 3. AHA/ACC Blood Pressure Guidelines
  {
    id: 'src_aha_blood_pressure',
    title: 'Hypertension Clinical Practice Guidelines and Blood Pressure Categories',
    organization: 'American Heart Association (AHA) & ACC',
    url: 'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
    documentIdentifier: 'AHA-ACC-2026-BP',
    publicationDate: '2026-01-20',
    category: 'Cardiovascular / Hypertension',
    evidenceLevel: 'Class I Guidelines',
    summary: 'Standard clinical categorization of blood pressure ranges, hypertensive urgency, and hypertensive emergency.',
    metadata: { peerReviewed: true, guidelinesBody: 'AHA/ACC' },
    chunks: [
      createChunk(
        'src_aha_blood_pressure',
        'AHA-ACC-2026-BP',
        'Hypertension Clinical Practice Guidelines and Blood Pressure Categories',
        'American Heart Association (AHA) & ACC',
        'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings',
        '2026-01-20',
        'Blood Pressure Classification Stages',
        'Normal: Systolic < 120 mm Hg AND Diastolic < 80 mm Hg. Elevated Blood Pressure: Systolic 120-129 AND Diastolic < 80. Stage 1 Hypertension: Systolic 130-139 OR Diastolic 80-89 mm Hg. Stage 2 Hypertension: Systolic >= 140 OR Diastolic >= 90 mm Hg. Hypertensive Crisis: Systolic > 180 and/or Diastolic > 120 mm Hg. If accompanied by chest pain, shortness of breath, back pain, numbness, weakness, or vision changes, it represents target organ damage requiring immediate emergency medical care.',
        ['blood pressure', 'hypertension', 'systolic', 'diastolic', 'hypertensive crisis', 'stage 1 hypertension', 'stage 2 hypertension', 'elevated bp'],
        'Cardiovascular',
        1
      )
    ]
  },

  // 4. NIH/MedlinePlus Complete Blood Count & Anemia
  {
    id: 'src_nih_cbc_anemia',
    title: 'Complete Blood Count (CBC), Hemoglobin, and Anemia Diagnostics',
    organization: 'MedlinePlus - National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/complete-blood-count/',
    documentIdentifier: 'NIH-NLM-2026-CBC',
    publicationDate: '2026-03-01',
    category: 'Hematology & Laboratory Medicine',
    evidenceLevel: 'NIH Clinical Laboratory Reference',
    summary: 'Reference intervals for Hemoglobin, Hematocrit, Red Blood Cells, and diagnostic markers for microcytic and normocytic anemia.',
    metadata: { peerReviewed: true, guidelinesBody: 'NIH / NLM' },
    chunks: [
      createChunk(
        'src_nih_cbc_anemia',
        'NIH-NLM-2026-CBC',
        'Complete Blood Count (CBC), Hemoglobin, and Anemia Diagnostics',
        'MedlinePlus - National Library of Medicine (NIH)',
        'https://medlineplus.gov/lab-tests/complete-blood-count/',
        '2026-03-01',
        'Hemoglobin Reference Ranges and Clinical Anemia',
        'Adult Male Hemoglobin reference range: 13.8 to 17.2 g/dL (138 to 172 g/L). Adult Female Hemoglobin reference range: 12.1 to 15.1 g/dL (121 to 151 g/L). Hemoglobin below normal indicates anemia. Common etiologies include iron deficiency, chronic blood loss, vitamin B12/folate deficiency, or renal disease. Symptoms of significant anemia include pallor, chronic fatigue, tachycardia, cold extremities, and orthostatic dizziness.',
        ['hemoglobin', 'hgb', 'hematocrit', 'anemia', 'complete blood count', 'cbc', 'red blood cells', 'rbc', 'ferritin', 'iron deficiency'],
        'Hematology',
        1
      )
    ]
  },

  // 5. NIH/MedlinePlus White Blood Cell & Infection
  {
    id: 'src_nih_wbc_infection',
    title: 'White Blood Cell (WBC) Differential and Infectious Response',
    organization: 'MedlinePlus - National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/white-blood-cell-count/',
    documentIdentifier: 'NIH-NLM-2026-WBC',
    publicationDate: '2026-02-18',
    category: 'Hematology & Immunology',
    evidenceLevel: 'NIH Clinical Reference',
    summary: 'Normal leukocyte ranges, leukocytosis in bacterial and viral infections, and leukopenia considerations.',
    metadata: { peerReviewed: true, guidelinesBody: 'NIH / NLM' },
    chunks: [
      createChunk(
        'src_nih_wbc_infection',
        'NIH-NLM-2026-WBC',
        'White Blood Cell (WBC) Differential and Infectious Response',
        'MedlinePlus - National Library of Medicine (NIH)',
        'https://medlineplus.gov/lab-tests/white-blood-cell-count/',
        '2026-02-18',
        'WBC Reference Limits and Leukocytosis',
        'Standard adult White Blood Cell count reference interval is 4,500 to 11,000 cells/mcL (4.5 to 11.0 x 10^9/L). Elevated WBC (leukocytosis, > 11,000/mcL) usually signifies active systemic bacterial or severe viral infection, acute tissue necrosis, or physical trauma. Neutrophil predominance suggests acute bacterial infection. Abnormally suppressed WBC (leukopenia, < 4,000/mcL) indicates bone marrow compromise, autoimmune diseases, or severe viral infections requiring clinical investigation.',
        ['wbc', 'white blood cells', 'leukocyte', 'leukocytosis', 'infection', 'fever', 'neutrophil', 'leukopenia'],
        'Immunology',
        1
      )
    ]
  },

  // 6. ADA Diabetes Guidelines
  {
    id: 'src_ada_diabetes',
    title: 'Standards of Care in Diabetes: Blood Glucose and HbA1c Thresholds',
    organization: 'American Diabetes Association (ADA)',
    url: 'https://diabetes.org/about-diabetes/diagnosis',
    documentIdentifier: 'ADA-DM-2026-01',
    publicationDate: '2026-01-08',
    category: 'Endocrinology & Metabolism',
    evidenceLevel: 'ADA Annual Standards of Care',
    summary: 'Criteria for diagnosis of prediabetes and diabetes mellitus based on fasting plasma glucose, oral glucose tolerance test, and HbA1c.',
    metadata: { peerReviewed: true, guidelinesBody: 'ADA' },
    chunks: [
      createChunk(
        'src_ada_diabetes',
        'ADA-DM-2026-01',
        'Standards of Care in Diabetes: Blood Glucose and HbA1c Thresholds',
        'American Diabetes Association (ADA)',
        'https://diabetes.org/about-diabetes/diagnosis',
        '2026-01-08',
        'Glycemic Diagnostic Criteria',
        'Fasting Blood Glucose: Normal is < 100 mg/dL (5.6 mmol/L). Impaired Fasting Glucose (Prediabetes): 100 to 125 mg/dL (5.6 to 6.9 mmol/L). Diabetes: Fasting glucose >= 126 mg/dL (7.0 mmol/L) confirmed on repeat testing. Hemoglobin A1c: Normal < 5.7%. Prediabetes: 5.7% to 6.4%. Diabetes diagnosis: HbA1c >= 6.5%. Acute Hypoglycemia (< 70 mg/dL; clinically significant < 54 mg/dL) requires immediate fast-acting oral glucose (15g rule) to prevent neurological compromise.',
        ['glucose', 'blood sugar', 'fasting glucose', 'a1c', 'hba1c', 'diabetes', 'prediabetes', 'hypoglycemia', 'hyperglycemia', 'insulin'],
        'Endocrinology',
        1
      )
    ]
  },

  // 7. NHLBI Cholesterol & Lipid Panel
  {
    id: 'src_nhlbi_lipids',
    title: 'Blood Cholesterol and Lipid Profile Clinical Thresholds',
    organization: 'National Heart, Lung, and Blood Institute (NHLBI / NIH)',
    url: 'https://www.nhlbi.nih.gov/health/blood-cholesterol',
    documentIdentifier: 'NHLBI-LPD-2026-01',
    publicationDate: '2026-02-05',
    category: 'Cardiovascular & Preventive Medicine',
    evidenceLevel: 'National Guidelines (ATP IV / ACC / AHA)',
    summary: 'Evaluation of Total Cholesterol, LDL-C, HDL-C, and Triglycerides in relation to cardiovascular atherosclerotic risk.',
    metadata: { peerReviewed: true, guidelinesBody: 'NHLBI / NIH' },
    chunks: [
      createChunk(
        'src_nhlbi_lipids',
        'NHLBI-LPD-2026-01',
        'Blood Cholesterol and Lipid Profile Clinical Thresholds',
        'National Heart, Lung, and Blood Institute (NHLBI / NIH)',
        'https://www.nhlbi.nih.gov/health/blood-cholesterol',
        '2026-02-05',
        'Lipid Profile Target Concentrations',
        'Total Cholesterol: Desirable < 200 mg/dL (5.18 mmol/L); Borderline high: 200-239 mg/dL; High: >= 240 mg/dL. Low-Density Lipoprotein (LDL, "bad" cholesterol): Optimal < 100 mg/dL (< 70 mg/dL in documented cardiovascular disease or high risk); Borderline high: 130-159 mg/dL; High: 160-189 mg/dL. High-Density Lipoprotein (HDL, "protective"): >= 60 mg/dL is optimal; < 40 mg/dL for men and < 50 mg/dL for women represents elevated cardiovascular risk. Fasting Triglycerides: Normal < 150 mg/dL.',
        ['cholesterol', 'ldl', 'hdl', 'triglycerides', 'lipid panel', 'atherosclerosis', 'statin', 'cardiac risk'],
        'Cardiology',
        1
      )
    ]
  },

  // 8. NIDDK Kidney Function & Creatinine
  {
    id: 'src_niddk_kidney',
    title: 'Kidney Function Testing: Serum Creatinine and eGFR Interpretation',
    organization: 'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK / NIH)',
    url: 'https://www.niddk.nih.gov/health-information/kidney-disease/diagnostic-tests',
    documentIdentifier: 'NIDDK-CKD-2026-01',
    publicationDate: '2026-01-25',
    category: 'Nephrology & Renal Health',
    evidenceLevel: 'KDIGO Clinical Practice Consensus',
    summary: 'Evaluating glomerular filtration rate (eGFR), serum creatinine, blood urea nitrogen (BUN), and urine albumin.',
    metadata: { peerReviewed: true, guidelinesBody: 'NIDDK / KDIGO' },
    chunks: [
      createChunk(
        'src_niddk_kidney',
        'NIDDK-CKD-2026-01',
        'Kidney Function Testing: Serum Creatinine and eGFR Interpretation',
        'National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK / NIH)',
        'https://www.niddk.nih.gov/health-information/kidney-disease/diagnostic-tests',
        '2026-01-25',
        'Creatinine, BUN, and eGFR Evaluation',
        'Serum Creatinine standard reference: 0.7 to 1.3 mg/dL (61.9 to 114.9 mcmol/L) for men, and 0.6 to 1.1 mg/dL (53 to 97.2 mcmol/L) for women. Estimated Glomerular Filtration Rate (eGFR): >= 90 mL/min/1.73m² indicates normal or high kidney function; 60 to 89 mL/min indicates mildly decreased function; eGFR < 60 mL/min persisting for 3 months or longer indicates chronic kidney disease (CKD). Blood Urea Nitrogen (BUN): Normal range is 7 to 20 mg/dL.',
        ['creatinine', 'egfr', 'bun', 'kidney', 'renal', 'chronic kidney disease', 'glomerular filtration', 'nephrology'],
        'Nephrology',
        1
      )
    ]
  },

  // 9. MedlinePlus Liver Function Tests
  {
    id: 'src_nlm_liver_tests',
    title: 'Liver Function Tests (LFTs): Hepatic Enzymes and Bilirubin',
    organization: 'MedlinePlus - National Library of Medicine (NIH)',
    url: 'https://medlineplus.gov/lab-tests/liver-function-tests/',
    documentIdentifier: 'NLM-HEP-2026-01',
    publicationDate: '2026-02-14',
    category: 'Gastroenterology & Hepatology',
    evidenceLevel: 'NIH Patient Care Standard',
    summary: 'Clinical significance of ALT, AST, Alkaline Phosphatase, and Total Bilirubin in acute and chronic liver conditions.',
    metadata: { peerReviewed: true, guidelinesBody: 'NIH / ACG' },
    chunks: [
      createChunk(
        'src_nlm_liver_tests',
        'NLM-HEP-2026-01',
        'Liver Function Tests (LFTs): Hepatic Enzymes and Bilirubin',
        'MedlinePlus - National Library of Medicine (NIH)',
        'https://medlineplus.gov/lab-tests/liver-function-tests/',
        '2026-02-14',
        'ALT, AST, and Bilirubin Evaluation',
        'Alanine Aminotransferase (ALT): Standard adult range is 7 to 56 units per liter (U/L). Aspartate Aminotransferase (AST): Standard adult range is 10 to 40 U/L. Significant elevation of ALT and AST indicates acute or chronic hepatocellular injury (e.g. viral hepatitis, medication-induced hepatotoxicity, alcohol-related liver injury, or NAFLD). Total Bilirubin normal range is 0.1 to 1.2 mg/dL. Elevated bilirubin causes jaundice (yellowing of sclera and skin) and dark urine.',
        ['alt', 'ast', 'bilirubin', 'liver', 'hepatic', 'liver enzymes', 'jaundice', 'hepatotoxicity', 'hepatitis'],
        'Hepatology',
        1
      )
    ]
  },

  // 10. Mayo Clinic Fever Management
  {
    id: 'src_mayo_fever',
    title: 'Fever in Adults and Pediatric Patients: Evaluation and Red Flags',
    organization: 'Mayo Clinic',
    url: 'https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352759',
    documentIdentifier: 'MAYO-FVR-2026-01',
    publicationDate: '2026-01-30',
    category: 'General Medicine & Infectious Disease',
    evidenceLevel: 'Clinical Expert Consensus',
    summary: 'Definition of clinical pyrexia, red flag symptoms, when to seek urgent emergency care, and safe home management.',
    metadata: { peerReviewed: true, guidelinesBody: 'Mayo Clinic Health Information' },
    chunks: [
      createChunk(
        'src_mayo_fever',
        'MAYO-FVR-2026-01',
        'Fever in Adults and Pediatric Patients: Evaluation and Red Flags',
        'Mayo Clinic',
        'https://www.mayoclinic.org/diseases-conditions/fever/symptoms-causes/syc-20352759',
        '2026-01-30',
        'Fever Thresholds and Emergency Warning Signs',
        'Normal baseline body temperature averages 98.6°F (37°C). A clinical fever is diagnosed at 100.4°F (38°C) or higher. Urgent medical evaluation is necessary if a fever is accompanied by: a stiff neck and photophobia (concerning for meningitis), altered mental status or confusion, severe shortness of breath, unexplained purpuric rash, or persistent temperature >= 103°F (39.4°C) in adults that fails to respond to antipyretics.',
        ['fever', 'pyrexia', 'temperature', 'chills', 'stiff neck', 'meningitis', 'infection', 'sepsis'],
        'General Medicine',
        1
      )
    ]
  },

  // 11. WHO Cardiovascular Health
  {
    id: 'src_who_cardio',
    title: 'Global Cardiovascular Disease Prevention and Risk Stratification',
    organization: 'World Health Organization (WHO)',
    url: 'https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)',
    documentIdentifier: 'WHO-CVD-2026-01',
    publicationDate: '2026-02-28',
    category: 'Preventive Cardiology & Public Health',
    evidenceLevel: 'WHO Global Health Guideline',
    summary: 'Primary and secondary prevention of atherosclerotic cardiovascular disease, hypertension, and behavioral risk reduction.',
    metadata: { peerReviewed: true, guidelinesBody: 'WHO' },
    chunks: [
      createChunk(
        'src_who_cardio',
        'WHO-CVD-2026-01',
        'Global Cardiovascular Disease Prevention and Risk Stratification',
        'World Health Organization (WHO)',
        'https://www.who.int/news-room/fact-sheets/detail/cardiovascular-diseases-(cvds)',
        '2026-02-28',
        'Cardiovascular Risk Modification',
        'Cardiovascular diseases are the leading cause of global mortality. Key modifiable risk factors include tobacco exposure, physical inactivity, unhealthy diet high in sodium and saturated fats, and harmful use of alcohol. Regular aerobic exercise (at least 150 minutes of moderate intensity per week), blood pressure control (< 130/80 mm Hg), and smoking cessation substantially lower myocardial infarction and stroke risks.',
        ['cardiovascular', 'prevention', 'heart health', 'lifestyle', 'who', 'risk factors', 'exercise', 'diet'],
        'Preventive Health',
        1
      )
    ]
  },

  // 12. FDA Statin Safety & Medication Guidance
  {
    id: 'src_fda_med_safety',
    title: 'Statin Therapy Safety Information and Drug-Drug Interactions',
    organization: 'Food and Drug Administration (FDA)',
    url: 'https://www.fda.gov/drugs/drug-safety-and-availability',
    documentIdentifier: 'FDA-SAF-2026-01',
    publicationDate: '2026-01-10',
    category: 'Pharmacology & Drug Safety',
    evidenceLevel: 'FDA Drug Safety Communication',
    summary: 'Clinical monitoring for HMG-CoA reductase inhibitors (statins), myopathy warning signs, rhabdomyolysis, and CYP3A4 interactions.',
    metadata: { peerReviewed: true, guidelinesBody: 'FDA Center for Drug Evaluation' },
    chunks: [
      createChunk(
        'src_fda_med_safety',
        'FDA-SAF-2026-01',
        'Statin Therapy Safety Information and Drug-Drug Interactions',
        'Food and Drug Administration (FDA)',
        'https://www.fda.gov/drugs/drug-safety-and-availability',
        '2026-01-10',
        'Statin Safety and Muscle Pain Warnings',
        'Statins (e.g. atorvastatin, rosuvastatin, simvastatin) are highly effective in reducing cardiovascular events. Patients should immediately report unexplained muscle pain, tenderness, or weakness, especially if accompanied by malaise or dark (tea-colored) urine, which may indicate rare but serious rhabdomyolysis and acute renal failure. Co-administration with strong CYP3A4 inhibitors (e.g., clarithromycin, ketoconazole, grapefruit juice) increases systemic statin concentration and toxicity risk.',
        ['statin', 'atorvastatin', 'rosuvastatin', 'muscle pain', 'myopathy', 'rhabdomyolysis', 'drug interaction', 'cholesterol medication'],
        'Pharmacology',
        1
      )
    ]
  }
];

/**
 * Knowledge Source Registry (Singleton Abstraction).
 * Allows medical sources to be added, indexed, or removed dynamically without rewriting application logic.
 */
class KnowledgeSourceRegistry {
  private sourcesMap: Map<string, KnowledgeSource> = new Map();
  private chunksMap: Map<string, KnowledgeChunk> = new Map();

  constructor(initialSources: KnowledgeSource[] = AUTHORITATIVE_SOURCES) {
    initialSources.forEach((src) => this.registerSource(src));
  }

  /**
   * Registers a new or updated KnowledgeSource into the registry and indexes its chunks.
   */
  public registerSource(source: KnowledgeSource): void {
    if (!source || !source.id) {
      throw new Error('[KnowledgeSourceRegistry] Invalid source: id is required.');
    }
    // Remove existing chunks if re-registering
    if (this.sourcesMap.has(source.id)) {
      this.unregisterSource(source.id);
    }

    this.sourcesMap.set(source.id, source);
    if (Array.isArray(source.chunks)) {
      source.chunks.forEach((chunk) => {
        this.chunksMap.set(chunk.id, chunk);
      });
    }
  }

  /**
   * Unregisters a KnowledgeSource and evicts all associated chunks.
   */
  public unregisterSource(sourceId: string): boolean {
    const source = this.sourcesMap.get(sourceId);
    if (!source) return false;

    if (Array.isArray(source.chunks)) {
      source.chunks.forEach((chk) => {
        this.chunksMap.delete(chk.id);
      });
    }
    this.sourcesMap.delete(sourceId);
    return true;
  }

  public getSource(sourceId: string): KnowledgeSource | undefined {
    return this.sourcesMap.get(sourceId);
  }

  public getAllSources(): KnowledgeSource[] {
    return Array.from(this.sourcesMap.values());
  }

  public getAllChunks(): KnowledgeChunk[] {
    return Array.from(this.chunksMap.values());
  }

  public getChunk(chunkId: string): KnowledgeChunk | undefined {
    return this.chunksMap.get(chunkId);
  }

  public getStats(): {
    totalSources: number;
    totalChunks: number;
    organizations: string[];
    categories: string[];
  } {
    const sources = this.getAllSources();
    const orgs = Array.from(new Set(sources.map((s) => s.organization)));
    const categories = Array.from(new Set(sources.map((s) => s.category)));

    return {
      totalSources: sources.length,
      totalChunks: this.chunksMap.size,
      organizations: orgs,
      categories
    };
  }
}

// Export singleton instance
export const knowledgeRegistry = new KnowledgeSourceRegistry();
