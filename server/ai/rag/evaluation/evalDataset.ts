/**
 * MediMind AI - RAG Retrieval Evaluation Dataset
 * Benchmark queries designed to test semantic retrieval precision, recall,
 * and negative-query rejection (threshold specificity).
 */

export interface EvalTestCase {
  id: string;
  query: string;
  expectedDocumentIds: string[];
  expectedOrganizations: string[];
  clinicalDomain: string;
  isNegativeQuery: boolean;
  notes: string;
}

export const RAG_EVALUATION_DATASET: EvalTestCase[] = [
  // 1. Cardiovascular Emergency
  {
    id: 'eval_cv_01',
    query: 'What are the classic warning signs of a heart attack and chest pain radiating to left arm?',
    expectedDocumentIds: ['AHA-GDL-2026-CV01'],
    expectedOrganizations: ['American Heart Association (AHA)'],
    clinicalDomain: 'Cardiology',
    isNegativeQuery: false,
    notes: 'Should retrieve AHA acute coronary syndrome guidelines with high confidence.'
  },

  // 2. Stroke & FAST
  {
    id: 'eval_stroke_02',
    query: 'My father has sudden facial drooping on one side and slurred speech. What does FAST mean?',
    expectedDocumentIds: ['CDC-STR-2026-01'],
    expectedOrganizations: ['Centers for Disease Control and Prevention (CDC)'],
    clinicalDomain: 'Neurology',
    isNegativeQuery: false,
    notes: 'Should retrieve CDC Stroke B.E. F.A.S.T. protocol.'
  },

  // 3. Hypertension Crisis
  {
    id: 'eval_bp_03',
    query: 'What blood pressure numbers indicate a hypertensive crisis or Stage 2 hypertension?',
    expectedDocumentIds: ['AHA-ACC-2026-BP'],
    expectedOrganizations: ['American Heart Association (AHA) & ACC'],
    clinicalDomain: 'Cardiovascular',
    isNegativeQuery: false,
    notes: 'Should retrieve AHA/ACC blood pressure stages (> 180 / > 120 mm Hg).'
  },

  // 4. Complete Blood Count & Anemia
  {
    id: 'eval_cbc_04',
    query: 'My lab report says hemoglobin is 10.2 g/dL and hematocrit is low. Do I have anemia?',
    expectedDocumentIds: ['NIH-NLM-2026-CBC'],
    expectedOrganizations: ['MedlinePlus - National Library of Medicine (NIH)'],
    clinicalDomain: 'Hematology',
    isNegativeQuery: false,
    notes: 'Should retrieve NIH complete blood count reference intervals.'
  },

  // 5. WBC & Leukocytosis
  {
    id: 'eval_wbc_05',
    query: 'What does a high white blood cell count of 14,000 cells/mcL mean with fever?',
    expectedDocumentIds: ['NIH-NLM-2026-WBC'],
    expectedOrganizations: ['MedlinePlus - National Library of Medicine (NIH)'],
    clinicalDomain: 'Immunology',
    isNegativeQuery: false,
    notes: 'Should retrieve NIH leukocyte ranges and leukocytosis infection response.'
  },

  // 6. Diabetes & HbA1c
  {
    id: 'eval_dm_06',
    query: 'What fasting blood sugar and HbA1c levels qualify as prediabetes or diabetes?',
    expectedDocumentIds: ['ADA-DM-2026-01'],
    expectedOrganizations: ['American Diabetes Association (ADA)'],
    clinicalDomain: 'Endocrinology',
    isNegativeQuery: false,
    notes: 'Should retrieve ADA diagnostic criteria (fasting >= 126 mg/dL, HbA1c >= 6.5%).'
  },

  // 7. Cholesterol & Lipid Panel
  {
    id: 'eval_lipid_07',
    query: 'What is a normal LDL and triglyceride level on a lipid panel?',
    expectedDocumentIds: ['NHLBI-LPD-2026-01'],
    expectedOrganizations: ['National Heart, Lung, and Blood Institute (NHLBI / NIH)'],
    clinicalDomain: 'Cardiology',
    isNegativeQuery: false,
    notes: 'Should retrieve NHLBI lipid profile guidelines (< 100 mg/dL LDL, < 150 triglycerides).'
  },

  // 8. Renal Function & eGFR
  {
    id: 'eval_kidney_08',
    query: 'My serum creatinine is 1.8 mg/dL and eGFR is 48. Is that kidney disease?',
    expectedDocumentIds: ['NIDDK-CKD-2026-01'],
    expectedOrganizations: ['National Institute of Diabetes and Digestive and Kidney Diseases (NIDDK / NIH)'],
    clinicalDomain: 'Nephrology',
    isNegativeQuery: false,
    notes: 'Should retrieve NIDDK CKD marker thresholds (eGFR < 60 mL/min).'
  },

  // 9. Liver Function & ALT/AST
  {
    id: 'eval_liver_09',
    query: 'Why are my liver enzymes ALT and AST elevated and what does high bilirubin cause?',
    expectedDocumentIds: ['NLM-HEP-2026-01'],
    expectedOrganizations: ['MedlinePlus - National Library of Medicine (NIH)'],
    clinicalDomain: 'Hepatology',
    isNegativeQuery: false,
    notes: 'Should retrieve NIH liver function test guide.'
  },

  // 10. Fever & Meningitis Red Flags
  {
    id: 'eval_fever_10',
    query: 'When is a fever dangerous in adults and what does a stiff neck with high temperature indicate?',
    expectedDocumentIds: ['MAYO-FVR-2026-01'],
    expectedOrganizations: ['Mayo Clinic'],
    clinicalDomain: 'General Medicine',
    isNegativeQuery: false,
    notes: 'Should retrieve Mayo Clinic fever red flag criteria.'
  },

  // 11. Statin Medication Safety
  {
    id: 'eval_statin_11',
    query: 'I started taking atorvastatin and have severe muscle pain. Is this a medication side effect?',
    expectedDocumentIds: ['FDA-SAF-2026-01'],
    expectedOrganizations: ['Food and Drug Administration (FDA)'],
    clinicalDomain: 'Pharmacology',
    isNegativeQuery: false,
    notes: 'Should retrieve FDA statin myopathy and rhabdomyolysis warnings.'
  },

  // 12. Negative Query 1: Vehicle repair
  {
    id: 'eval_neg_12',
    query: 'How do I replace the brake pads and change oil on a 2018 Honda Civic?',
    expectedDocumentIds: [],
    expectedOrganizations: [],
    clinicalDomain: 'Non-Medical',
    isNegativeQuery: true,
    notes: 'Must be rejected by relevance threshold. Zero medical documents should be returned.'
  },

  // 13. Negative Query 2: Entertainment trivia
  {
    id: 'eval_neg_13',
    query: 'Who directed the movie Inception and who composed its soundtrack?',
    expectedDocumentIds: [],
    expectedOrganizations: [],
    clinicalDomain: 'Non-Medical',
    isNegativeQuery: true,
    notes: 'Must be rejected by relevance threshold. Zero medical documents should be returned.'
  },

  // 14. Negative Query 3: Astronomy
  {
    id: 'eval_neg_14',
    query: 'What is the diameter of Jupiter and how many moons does it have?',
    expectedDocumentIds: [],
    expectedOrganizations: [],
    clinicalDomain: 'Non-Medical',
    isNegativeQuery: true,
    notes: 'Must be rejected by relevance threshold. Zero medical documents should be returned.'
  }
];
