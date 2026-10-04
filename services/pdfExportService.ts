import jsPDF from 'jspdf';
import { AnalysisResult, StoredReport, HealthHistory, Medication, SymptomEntry } from '../types';

export interface PDFExportOptions {
  patientName?: string;
  reportDate?: string | number;
  fileName?: string;
  location?: string;
  doctorName?: string;
}

export interface HealthHistoryPDFOptions extends PDFExportOptions {
  patientEmail?: string;
  medications?: Medication[];
  symptoms?: SymptomEntry[];
  includeSymptoms?: boolean;
  includeMedications?: boolean;
  includeMetrics?: boolean;
}

export interface SymptomJournalPDFOptions extends PDFExportOptions {
  startDate?: string;
  endDate?: string;
  doctorNotes?: string;
}

export interface MedicationSchedulePDFOptions extends PDFExportOptions {
  pharmacyName?: string;
  emergencyContact?: string;
  notes?: string;
  includeChecklist?: boolean;
}

export const PDFExportService = {
  /**
   * Export single Medical Report Analysis into formatted, downloadable clinical PDF
   */
  exportAnalysisReport(result: AnalysisResult, options: PDFExportOptions = {}) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const checkPageBreak = (neededSpace: number = 20) => {
      if (y + neededSpace > pageHeight - 20) {
        doc.addPage();
        y = 18;
        return true;
      }
      return false;
    };

    // --- Header Banner ---
    doc.setFillColor(28, 78, 172); // Deep medical navy/blue #1c4eac
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

    // App Branding & Title inside banner
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MediMind AI', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Clinical Second Opinion & Report Analysis', margin + 6, y + 15);

    // Right-aligned Date & Reference
    const displayDate = options.reportDate 
      ? new Date(options.reportDate).toLocaleDateString() 
      : new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.text(`Generated: ${displayDate}`, margin + contentWidth - 6, y + 9, { align: 'right' });
    doc.text(`Language: ${result.language || 'English'}`, margin + contentWidth - 6, y + 15, { align: 'right' });

    y += 30;

    // --- Patient & Document Metadata Row ---
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Patient Name:', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(options.patientName || 'Confidential Patient', margin + 26, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Location:', margin + 95, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(options.location || 'Global / Not Specified', margin + 110, y + 6);

    if (result.urgency) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Urgency Triage:', margin + 4, y + 11);
      doc.setFont('helvetica', 'bold');
      if (result.urgency === 'emergency') {
        doc.setTextColor(220, 38, 38);
      } else if (result.urgency === 'urgent') {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(22, 101, 52);
      }
      doc.text(result.urgency.toUpperCase(), margin + 28, y + 11);
    }

    if (result.estimatedCost) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Est. Cost:', margin + 95, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 64, 175);
      doc.text(result.estimatedCost, margin + 112, y + 11);
    }

    y += 20;

    // --- Section 1: Executive Clinical Summary ---
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('1. Executive Clinical Summary', margin, y);
    y += 5;

    doc.setFillColor(239, 246, 255); // blue-50
    doc.setDrawColor(191, 219, 254); // blue-200
    const summaryLines = doc.splitTextToSize(result.summary || 'No summary available.', contentWidth - 8);
    const summaryBoxHeight = Math.max(16, summaryLines.length * 4.8 + 6);
    
    checkPageBreak(summaryBoxHeight + 5);
    doc.roundedRect(margin, y, contentWidth, summaryBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text(summaryLines, margin + 4, y + 6);

    y += summaryBoxHeight + 8;

    // --- Section 2: Plain-Language Patient Explanation ---
    if (result.simpleExplanation) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('2. Patient-Friendly Translation & Findings', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const explLines = doc.splitTextToSize(result.simpleExplanation, contentWidth);
      doc.text(explLines, margin, y);
      y += explLines.length * 4.2 + 8;
    }

    // --- Section 3: Red Flags & Urgent Observations ---
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('3. Red Flags & Urgent Observations', margin, y);
    y += 5;

    if (!result.redFlags || result.redFlags.length === 0) {
      doc.setFillColor(240, 253, 244); // green-50
      doc.setDrawColor(187, 247, 208); // green-200
      doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(22, 101, 52); // green-800
      doc.text('✓ No critical red flags or emergent conditions detected in this report.', margin + 4, y + 7.5);
      y += 18;
    } else {
      result.redFlags.forEach((flag) => {
        const flagText = `${flag.finding} - Action Required: ${flag.action}`;
        const lines = doc.splitTextToSize(flagText, contentWidth - 28);
        const cardHeight = Math.max(12, lines.length * 4.2 + 5);

        checkPageBreak(cardHeight + 4);

        const isHigh = flag.severity === 'HIGH';
        const isMed = flag.severity === 'MEDIUM';

        if (isHigh) {
          doc.setFillColor(254, 242, 242); // red-50
          doc.setDrawColor(254, 202, 202); // red-200
        } else if (isMed) {
          doc.setFillColor(255, 251, 235); // amber-50
          doc.setDrawColor(253, 230, 138); // amber-200
        } else {
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(226, 232, 240);
        }

        doc.roundedRect(margin, y, contentWidth, cardHeight, 2, 2, 'FD');

        // Badge pill
        if (isHigh) {
          doc.setFillColor(220, 38, 38);
        } else if (isMed) {
          doc.setFillColor(217, 119, 6);
        } else {
          doc.setFillColor(71, 85, 105);
        }
        doc.roundedRect(margin + 3, y + 3, 18, 5.5, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(flag.severity || 'ALERT', margin + 12, y + 6.8, { align: 'center' });

        // Finding text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(lines, margin + 24, y + 5.5);

        y += cardHeight + 3;
      });
      y += 5;
    }

    // --- Section 4: Quantitative Biomarkers / Lab Measurements Table ---
    if (result.labMeasurements && result.labMeasurements.length > 0) {
      checkPageBreak(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('4. Diagnostic Biomarkers & Quantitative Lab Values', margin, y);
      y += 5;

      // Table Header Row
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('TEST / BIOMARKER', margin + 4, y + 5);
      doc.text('RESULT', margin + 65, y + 5);
      doc.text('REFERENCE RANGE', margin + 105, y + 5);
      doc.text('STATUS', margin + 155, y + 5);
      y += 8;

      result.labMeasurements.forEach((lab, idx) => {
        checkPageBreak(8);
        const isCritical = lab.status === 'critical';
        const isAttention = lab.status === 'attention';

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(lab.test, margin + 4, y + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.text(`${lab.value} ${lab.unit}`, margin + 65, y + 3.5);

        const refText = lab.referenceRangeText || 
          (lab.referenceRangeMin !== undefined ? `${lab.referenceRangeMin} - ${lab.referenceRangeMax} ${lab.unit}` : 'Standard Clinical Range');
        doc.setTextColor(100, 116, 139);
        doc.text(refText, margin + 105, y + 3.5);

        // Status
        if (isCritical) {
          doc.setTextColor(220, 38, 38);
          doc.setFont('helvetica', 'bold');
          doc.text('CRITICAL', margin + 155, y + 3.5);
        } else if (isAttention) {
          doc.setTextColor(217, 119, 6);
          doc.setFont('helvetica', 'bold');
          doc.text('ATTENTION', margin + 155, y + 3.5);
        } else {
          doc.setTextColor(22, 101, 52);
          doc.setFont('helvetica', 'normal');
          doc.text('NORMAL', margin + 155, y + 3.5);
        }

        y += 6.5;
      });
      y += 6;
    }

    // --- Section 5: Recommended Next Steps ---
    if (result.nextSteps && result.nextSteps.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('5. Recommended Clinical Next Steps', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      result.nextSteps.forEach((step, idx) => {
        const stepLines = doc.splitTextToSize(`${idx + 1}. ${step}`, contentWidth - 6);
        checkPageBreak(stepLines.length * 4.2 + 3);
        doc.text(stepLines, margin + 2, y);
        y += stepLines.length * 4.2 + 2;
      });
      y += 6;
    }

    // --- Section 6: Questions for Attending Doctor ---
    if (result.questionsForDoctor && result.questionsForDoctor.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('6. Questions Prepared for Your Physician Consultation', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);

      result.questionsForDoctor.forEach((q, idx) => {
        const qLines = doc.splitTextToSize(`Q${idx + 1}: ${q}`, contentWidth - 6);
        checkPageBreak(qLines.length * 4.2 + 3);
        doc.text(qLines, margin + 2, y);
        y += qLines.length * 4.2 + 2;
      });
      y += 6;
    }

    // --- Section 7: Medication Interaction Notes (if present) ---
    if (result.medicationInteractions && result.medicationInteractions.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('7. Medication Interaction Alerts', margin, y);
      y += 6;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      result.medicationInteractions.forEach((item) => {
        const text = `• ${item.medication}: ${item.interaction}`;
        const lines = doc.splitTextToSize(text, contentWidth - 4);
        checkPageBreak(lines.length * 4.2 + 2);
        doc.setTextColor(180, 83, 9);
        doc.text(lines, margin + 2, y);
        y += lines.length * 4.2 + 2;
      });
      y += 6;
    }

    // --- Physician Sign-off Box ---
    checkPageBreak(28);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('ATTENDING PHYSICIAN REVIEW & CLINICAL NOTES:', margin + 4, y + 5);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y + 15, margin + 80, y + 15);
    doc.line(margin + 100, y + 15, margin + contentWidth - 4, y + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Physician Signature / License #', margin + 4, y + 18.5);
    doc.text('Date of Review', margin + 100, y + 18.5);

    y += 26;

    // --- Clinical Disclaimer Box at the End ---
    checkPageBreak(22);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CLINICAL SECOND OPINION & MEDICAL DISCLAIMER', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const disclaimer = 'This report was generated using MediMind AI for informational and educational second opinion purposes only. It does not replace professional medical advice, clinical diagnosis, emergency medical dispatch, or active treatment. Always consult a licensed medical provider regarding any diagnostic test, prescription, or symptom.';
    const discLines = doc.splitTextToSize(disclaimer, contentWidth - 8);
    doc.text(discLines, margin + 4, y + 9);

    // --- Footers on all pages ---
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('MediMind AI — Medical Analysis & Health Companion', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    // Output / Save
    const safeFileName = options.fileName
      ? `MediMind_Report_${options.fileName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
      : `MediMind_Medical_Report_${Date.now()}.pdf`;

    doc.save(safeFileName);
    return safeFileName;
  },

  /**
   * Export Comprehensive Health History & Patient Profile into formatted, downloadable PDF for sharing with medical professionals
   */
  exportHealthHistory(history: HealthHistory, options: HealthHistoryPDFOptions = {}) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const checkPageBreak = (neededSpace: number = 20) => {
      if (y + neededSpace > pageHeight - 20) {
        doc.addPage();
        y = 18;
        return true;
      }
      return false;
    };

    // --- Header Banner ---
    doc.setFillColor(15, 76, 129); // Classic Medical Blue
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MediMind AI — Clinical Health History', margin + 6, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text('Comprehensive Patient Medical History & Vitals Record for Clinical Consultations', margin + 6, y + 17);

    const displayDate = options.reportDate 
      ? new Date(options.reportDate).toLocaleDateString() 
      : new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.text(`Exported: ${displayDate}`, margin + contentWidth - 6, y + 10, { align: 'right' });
    doc.text(`CONFIDENTIAL MEDICAL RECORD`, margin + contentWidth - 6, y + 17, { align: 'right' });

    y += 32;

    // --- Patient Demographics & Profile Summary Box ---
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text('PATIENT IDENTIFICATION & PROFILE', margin + 4, y + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Full Name:', margin + 4, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(options.patientName || 'Confidential Patient', margin + 24, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Email / Contact:', margin + 95, y + 12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(options.patientEmail || 'Not Provided', margin + 122, y + 12);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Blood Type:', margin + 4, y + 17.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(history.bloodType ? history.bloodType.toUpperCase() : 'Not Specified', margin + 24, y + 17.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Organ Donor:', margin + 60, y + 17.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(history.organDonor ? 'Registered Donor' : 'Not Registered', margin + 82, y + 17.5);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Location:', margin + 125, y + 17.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(options.location || 'Global', margin + 141, y + 17.5);

    y += 28;

    // --- Critical Alert Box: Known Allergies & Drug Sensitivities ---
    checkPageBreak(25);
    const hasAllergies = history.allergies && history.allergies.length > 0;
    
    if (hasAllergies) {
      doc.setFillColor(254, 242, 242); // red-50
      doc.setDrawColor(239, 68, 68); // red-500
    } else {
      doc.setFillColor(240, 253, 244); // green-50
      doc.setDrawColor(34, 197, 94); // green-500
    }
    
    const allergyListText = hasAllergies 
      ? history.allergies.join(', ')
      : 'No Known Drug Allergies (NKDA) or documented environmental sensitivities.';
    
    const allergyLines = doc.splitTextToSize(allergyListText, contentWidth - 10);
    const allergyBoxHeight = Math.max(15, allergyLines.length * 4.5 + 8);
    
    doc.roundedRect(margin, y, contentWidth, allergyBoxHeight, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    if (hasAllergies) {
      doc.setTextColor(185, 28, 28);
      doc.text('⚠ CRITICAL ALERT: KNOWN ALLERGIES & SENSITIVITIES', margin + 4, y + 5.5);
    } else {
      doc.setTextColor(22, 101, 52);
      doc.text('✓ ALLERGY STATUS: NO KNOWN DRUG ALLERGIES (NKDA)', margin + 4, y + 5.5);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(allergyLines, margin + 4, y + 10.5);

    y += allergyBoxHeight + 8;

    // --- Emergency Contacts Section ---
    if (history.emergencyContacts && history.emergencyContacts.length > 0) {
      checkPageBreak(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text('Emergency & Attending Care Contacts', margin, y);
      y += 5;

      history.emergencyContacts.forEach((contact) => {
        checkPageBreak(12);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(`${contact.name} (${contact.relation})`, margin + 4, y + 6);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 64, 175);
        doc.text(`Phone: ${contact.phone}`, margin + 85, y + 6);

        if (contact.notes) {
          doc.setTextColor(100, 116, 139);
          doc.text(`Notes: ${contact.notes}`, margin + 135, y + 6);
        }

        y += 11;
      });
      y += 4;
    }

    // --- Chronic Conditions & Diagnoses ---
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text('Chronic Conditions & Clinical Diagnoses', margin, y);
    y += 5;

    if (!history.conditions || history.conditions.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('• No chronic medical conditions documented.', margin + 2, y);
      y += 7;
    } else {
      history.conditions.forEach((c) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${c}`, margin + 2, y);
        y += 5;
      });
      y += 4;
    }

    // --- Past Surgeries & Major Interventions ---
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text('Past Surgeries & Clinical Interventions', margin, y);
    y += 5;

    if (!history.surgeries || history.surgeries.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('• No past surgeries or major medical procedures recorded.', margin + 2, y);
      y += 7;
    } else {
      history.surgeries.forEach((s) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${s}`, margin + 2, y);
        y += 5;
      });
      y += 4;
    }

    // --- Family Medical History ---
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text('Family Medical History & Hereditary Risks', margin, y);
    y += 5;

    if (!history.familyHistory || history.familyHistory.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('• No hereditary or family medical conditions noted.', margin + 2, y);
      y += 7;
    } else {
      history.familyHistory.forEach((f) => {
        checkPageBreak(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`• ${f}`, margin + 2, y);
        y += 5;
      });
      y += 4;
    }

    // --- Active Medications (Cross-Referenced) ---
    if (options.medications && options.medications.length > 0) {
      checkPageBreak(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text('Active Prescription Medications & Dosage Regimens', margin, y);
      y += 5;

      // Table Header
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('MEDICATION', margin + 4, y + 5);
      doc.text('DOSAGE', margin + 60, y + 5);
      doc.text('FREQUENCY / TIME', margin + 100, y + 5);
      doc.text('INSTRUCTIONS', margin + 145, y + 5);
      y += 8;

      options.medications.forEach((med, idx) => {
        checkPageBreak(8);
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(med.name, margin + 4, y + 3.5);

        doc.setFont('helvetica', 'normal');
        doc.text(med.dosage, margin + 60, y + 3.5);
        doc.text(`${med.frequency} (${med.time || ''})`, margin + 100, y + 3.5);
        
        const instShort = med.instructions.length > 30 ? `${med.instructions.substring(0, 30)}...` : med.instructions;
        doc.setTextColor(100, 116, 139);
        doc.text(instShort || 'None', margin + 145, y + 3.5);

        y += 6.5;
      });
      y += 6;
    }

    // --- Tracked Longitudinal Vitals & Health Metrics ---
    if (history.metrics && history.metrics.length > 0) {
      checkPageBreak(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text('Recent Vitals & Tracked Physiological Markers', margin, y);
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('DATE', margin + 4, y + 5);
      doc.text('BLOOD PRESSURE', margin + 40, y + 5);
      doc.text('HEART RATE', margin + 85, y + 5);
      doc.text('GLUCOSE', margin + 120, y + 5);
      doc.text('WEIGHT', margin + 155, y + 5);
      y += 8;

      history.metrics.slice(0, 8).forEach((m, idx) => {
        checkPageBreak(8);
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(m.date, margin + 4, y + 3.5);

        const bp = (m.systolic && m.diastolic) ? `${m.systolic}/${m.diastolic} mmHg` : '--';
        doc.text(bp, margin + 40, y + 3.5);

        const hr = m.heartRate ? `${m.heartRate} bpm` : '--';
        doc.text(hr, margin + 85, y + 3.5);

        const bg = m.bloodGlucose ? `${m.bloodGlucose} mg/dL` : '--';
        doc.text(bg, margin + 120, y + 3.5);

        const wt = m.weight ? `${m.weight} kg` : '--';
        doc.text(wt, margin + 155, y + 3.5);

        y += 6.5;
      });
      y += 6;
    }

    // --- Recent Symptom Journal Entries (if attached) ---
    if (options.symptoms && options.symptoms.length > 0) {
      checkPageBreak(35);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 58, 138);
      doc.text('Recent Symptom Journal Log (Patient-Recorded Episodes)', margin, y);
      y += 5;

      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('DATE', margin + 4, y + 5);
      doc.text('SYMPTOM', margin + 30, y + 5);
      doc.text('SEVERITY (1-10)', margin + 90, y + 5);
      doc.text('DURATION', margin + 125, y + 5);
      doc.text('NOTES / TRIGGERS', margin + 155, y + 5);
      y += 8;

      options.symptoms.slice(0, 10).forEach((sym, idx) => {
        checkPageBreak(8);
        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 1, contentWidth, 6.5, 'F');
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(sym.date, margin + 4, y + 3.5);

        doc.setFont('helvetica', 'bold');
        const shortSym = sym.symptom.length > 25 ? `${sym.symptom.substring(0, 25)}...` : sym.symptom;
        doc.text(shortSym, margin + 30, y + 3.5);

        // Severity Color Tag
        doc.setFont('helvetica', 'bold');
        if (sym.severity >= 7) {
          doc.setTextColor(220, 38, 38);
          doc.text(`${sym.severity}/10 (Severe)`, margin + 90, y + 3.5);
        } else if (sym.severity >= 4) {
          doc.setTextColor(217, 119, 6);
          doc.text(`${sym.severity}/10 (Moderate)`, margin + 90, y + 3.5);
        } else {
          doc.setTextColor(22, 101, 52);
          doc.text(`${sym.severity}/10 (Mild)`, margin + 90, y + 3.5);
        }

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(sym.duration || '--', margin + 125, y + 3.5);

        const notesText = sym.notes || sym.triggers || 'None';
        const shortNotes = notesText.length > 22 ? `${notesText.substring(0, 22)}...` : notesText;
        doc.text(shortNotes, margin + 155, y + 3.5);

        y += 6.5;
      });
      y += 6;
    }

    // --- Physician Review & Sign-off Section ---
    checkPageBreak(30);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 22, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('CONSULTING PHYSICIAN NOTES & RECOMMENDATIONS:', margin + 4, y + 5);
    
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y + 16, margin + 80, y + 16);
    doc.line(margin + 100, y + 16, margin + contentWidth - 4, y + 16);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Physician Signature & License Number', margin + 4, y + 19.5);
    doc.text('Consultation Date', margin + 100, y + 19.5);

    y += 28;

    // --- Medical Disclaimer ---
    checkPageBreak(20);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CLINICAL DOCUMENTATION DISCLAIMER', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const disclaimer = 'This clinical profile was assembled by the patient using MediMind AI for personal documentation and to facilitate communication with licensed healthcare professionals. It does not constitute an independent medical prescription or diagnosis. Confirm all entries with clinical records.';
    const discLines = doc.splitTextToSize(disclaimer, contentWidth - 8);
    doc.text(discLines, margin + 4, y + 9);

    // --- Page Numbering Footers ---
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('MediMind AI — Clinical Health History Portfolio', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const safeFileName = `MediMind_Health_History_${Date.now()}.pdf`;
    doc.save(safeFileName);
    return safeFileName;
  },

  /**
   * Export Symptom Journal into formatted, downloadable PDF for sharing with medical professionals
   */
  exportSymptomJournal(symptoms: SymptomEntry[], options: SymptomJournalPDFOptions = {}) {
    if (!symptoms || symptoms.length === 0) return null;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const checkPageBreak = (neededSpace: number = 20) => {
      if (y + neededSpace > pageHeight - 20) {
        doc.addPage();
        y = 18;
        return true;
      }
      return false;
    };

    // Header Banner
    doc.setFillColor(15, 118, 110); // Teal / Medical Teal #0f766e
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MediMind AI — Patient Symptom Journal', margin + 6, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Longitudinal Daily Symptom Tracking & Severity Log (${symptoms.length} Episodes)`, margin + 6, y + 17);

    const displayDate = options.reportDate 
      ? new Date(options.reportDate).toLocaleDateString() 
      : new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.text(`Generated: ${displayDate}`, margin + contentWidth - 6, y + 10, { align: 'right' });
    doc.text(`Patient: ${options.patientName || 'Confidential Patient'}`, margin + contentWidth - 6, y + 17, { align: 'right' });

    y += 32;

    // Metrics Overview Box
    const avgSeverity = (symptoms.reduce((acc, s) => acc + s.severity, 0) / symptoms.length).toFixed(1);
    const severeCount = symptoms.filter((s) => s.severity >= 7).length;
    const moderateCount = symptoms.filter((s) => s.severity >= 4 && s.severity < 7).length;
    const mildCount = symptoms.filter((s) => s.severity < 4).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('SYMPTOM TRACKING SUMMARY METRICS', margin + 4, y + 5);

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Logged Episodes: ${symptoms.length}`, margin + 4, y + 11.5);
    doc.text(`Average Severity: ${avgSeverity} / 10`, margin + 50, y + 11.5);

    if (severeCount > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Severe Episodes (7-10): ${severeCount}`, margin + 105, y + 11.5);
    } else {
      doc.setTextColor(22, 101, 52);
      doc.text(`Severe Episodes: 0`, margin + 105, y + 11.5);
    }

    y += 24;

    // Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 58, 138);
    doc.text('Chronological Symptom Log & Episode Details', margin, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 7, 1, 1, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('DATE & TIME', margin + 4, y + 5);
    doc.text('SYMPTOM & BODY PART', margin + 36, y + 5);
    doc.text('SEVERITY', margin + 92, y + 5);
    doc.text('DURATION', margin + 125, y + 5);
    doc.text('NOTES / TRIGGERS', margin + 155, y + 5);
    y += 8;

    symptoms.forEach((sym, idx) => {
      checkPageBreak(12);

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 1, contentWidth, 9.5, 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const timeStr = sym.time ? ` ${sym.time}` : '';
      doc.text(`${sym.date}${timeStr}`, margin + 4, y + 4);

      doc.setFont('helvetica', 'bold');
      const shortSym = sym.symptom.length > 25 ? `${sym.symptom.substring(0, 25)}...` : sym.symptom;
      doc.text(shortSym, margin + 36, y + 4);
      
      if (sym.bodyPart) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139);
        doc.text(sym.bodyPart, margin + 36, y + 7.5);
      }

      // Severity Tag
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (sym.severity >= 7) {
        doc.setTextColor(220, 38, 38);
        doc.text(`${sym.severity}/10 [SEVERE]`, margin + 92, y + 4);
      } else if (sym.severity >= 4) {
        doc.setTextColor(217, 119, 6);
        doc.text(`${sym.severity}/10 [MODERATE]`, margin + 92, y + 4);
      } else {
        doc.setTextColor(22, 101, 52);
        doc.text(`${sym.severity}/10 [MILD]`, margin + 92, y + 4);
      }

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(sym.duration || '--', margin + 125, y + 4);

      const notesText = sym.notes || sym.triggers || 'None recorded';
      const shortNotes = notesText.length > 24 ? `${notesText.substring(0, 24)}...` : notesText;
      doc.text(shortNotes, margin + 155, y + 4);

      y += 9.5;
    });

    y += 6;

    // Physician Review Section
    checkPageBreak(25);
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('SPECIALIST / ATTENDING PHYSICIAN ASSESSMENT:', margin + 4, y + 5);

    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 4, y + 15, margin + 80, y + 15);
    doc.line(margin + 100, y + 15, margin + contentWidth - 4, y + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Doctor Signature / Specialty', margin + 4, y + 18.5);
    doc.text('Review Date', margin + 100, y + 18.5);

    y += 26;

    // Footers
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('MediMind AI — Longitudinal Symptom Journal', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const safeFileName = `MediMind_Symptom_Journal_${Date.now()}.pdf`;
    doc.save(safeFileName);
    return safeFileName;
  },

  /**
   * Export multiple reports in a batch portfolio
   */
  exportBatchReports(reports: StoredReport[], options: PDFExportOptions = {}) {
    if (!reports || reports.length === 0) return null;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const checkPageBreak = (neededSpace: number = 20) => {
      if (y + neededSpace > pageHeight - 20) {
        doc.addPage();
        y = 18;
        return true;
      }
      return false;
    };

    // 1. Portfolio Cover / Header Banner
    doc.setFillColor(28, 78, 172); // Deep medical navy #1c4eac
    doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MediMind AI — Consolidated Medical Portfolio', margin + 6, y + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Multi-Report Summary & Health History (${reports.length} Reports Aggregated)`, margin + 6, y + 17);

    const displayDate = options.reportDate 
      ? new Date(options.reportDate).toLocaleDateString() 
      : new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.text(`Generated: ${displayDate}`, margin + contentWidth - 6, y + 10, { align: 'right' });
    doc.text(`Patient: ${options.patientName || 'Confidential Patient'}`, margin + contentWidth - 6, y + 17, { align: 'right' });

    y += 32;

    // 2. Aggregate Metrics Box
    const totalRedFlags = reports.reduce((acc, r) => acc + (r.result?.redFlags?.length || 0), 0);
    const highSeverityFlags = reports.reduce((acc, r) => acc + (r.result?.redFlags?.filter(f => f.severity === 'HIGH').length || 0), 0);
    const clearReports = reports.filter(r => !r.result?.redFlags || r.result.redFlags.length === 0).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('PORTFOLIO EXECUTIVE METRICS', margin + 4, y + 5);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Reports: ${reports.length}`, margin + 4, y + 11);
    doc.text(`Clear Reports: ${clearReports}`, margin + 50, y + 11);

    if (highSeverityFlags > 0) {
      doc.setTextColor(220, 38, 38);
      doc.text(`Critical Red Flags: ${highSeverityFlags}`, margin + 95, y + 11);
    } else {
      doc.setTextColor(22, 101, 52);
      doc.text(`Critical Red Flags: 0`, margin + 95, y + 11);
    }

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Red Flags Detected Across All Reports: ${totalRedFlags}`, margin + 4, y + 16.5);

    y += 26;

    // 3. Reports Index Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 58, 138);
    doc.text('Index of Included Reports', margin, y);
    y += 5;

    reports.forEach((report, idx) => {
      checkPageBreak(12);
      const isRedFlag = report.result?.redFlags && report.result.redFlags.length > 0;
      const isHigh = report.result?.redFlags?.some(f => f.severity === 'HIGH');

      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 9, 1, 1, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(`${idx + 1}. ${report.fileName || 'Medical Analysis'}`, margin + 3, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(new Date(report.date).toLocaleDateString(), margin + 95, y + 6);

      if (isHigh) {
        doc.setTextColor(220, 38, 38);
        doc.setFont('helvetica', 'bold');
        doc.text('CRITICAL ALERT', margin + contentWidth - 4, y + 6, { align: 'right' });
      } else if (isRedFlag) {
        doc.setTextColor(217, 119, 6);
        doc.setFont('helvetica', 'bold');
        doc.text('ATTENTION', margin + contentWidth - 4, y + 6, { align: 'right' });
      } else {
        doc.setTextColor(22, 101, 52);
        doc.setFont('helvetica', 'bold');
        doc.text('ALL CLEAR', margin + contentWidth - 4, y + 6, { align: 'right' });
      }

      y += 11;
    });

    y += 6;

    // 4. Detailed Sections for each Report
    reports.forEach((report, idx) => {
      checkPageBreak(45);

      const hasHighFlag = report.result?.redFlags?.some(f => f.severity === 'HIGH');
      const hasMedFlag = report.result?.redFlags?.some(f => f.severity === 'MEDIUM');

      if (hasHighFlag) {
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(239, 68, 68);
      } else if (hasMedFlag) {
        doc.setFillColor(255, 251, 235);
        doc.setDrawColor(245, 158, 11);
      } else {
        doc.setFillColor(240, 253, 244);
        doc.setDrawColor(34, 197, 94);
      }

      doc.roundedRect(margin, y, contentWidth, 11, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`Report ${idx + 1}: ${report.fileName || 'Analysis'}`, margin + 4, y + 7);

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`${new Date(report.date).toLocaleDateString()} ${new Date(report.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, margin + contentWidth - 4, y + 7, { align: 'right' });

      y += 14;

      const quickSummaryText = report.quickSummary || report.result?.summary;
      if (quickSummaryText) {
        checkPageBreak(25);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text('Executive Scan Summary:', margin, y);
        y += 4;

        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        const qLines = doc.splitTextToSize(quickSummaryText, contentWidth - 6);
        const qHeight = Math.max(9, qLines.length * 3.8 + 4);
        checkPageBreak(qHeight + 2);
        doc.roundedRect(margin, y, contentWidth, qHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(30, 41, 59);
        doc.text(qLines, margin + 3, y + 4.5);
        y += qHeight + 5;
      }

      if (report.result?.redFlags && report.result.redFlags.length > 0) {
        checkPageBreak(18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(185, 28, 28);
        doc.text('Red Flags & Urgent Clinical Findings:', margin, y);
        y += 4;

        report.result.redFlags.forEach((rf) => {
          const rfText = `[${rf.severity}] ${rf.finding} — Action: ${rf.action}`;
          const lines = doc.splitTextToSize(rfText, contentWidth - 6);
          checkPageBreak(lines.length * 3.8 + 2);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(153, 27, 27);
          doc.text(lines, margin + 3, y);
          y += lines.length * 3.8 + 2;
        });
        y += 2;
      }

      if (report.result?.labMeasurements && report.result.labMeasurements.length > 0) {
        checkPageBreak(20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(30, 58, 138);
        doc.text('Key Biomarkers Extracted:', margin, y);
        y += 4;

        report.result.labMeasurements.slice(0, 5).forEach((lab) => {
          checkPageBreak(5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(15, 23, 42);
          const range = lab.referenceRangeText || (lab.referenceRangeMin !== undefined ? `${lab.referenceRangeMin}-${lab.referenceRangeMax}` : '');
          doc.text(`• ${lab.test}: ${lab.value} ${lab.unit} ${range ? `(Ref: ${range})` : ''} — [${lab.status.toUpperCase()}]`, margin + 3, y);
          y += 4.2;
        });
        y += 2;
      }

      checkPageBreak(8);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    });

    checkPageBreak(24);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('CLINICAL DISCLAIMER & REGULATORY COMPLIANCE', margin + 4, y + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    const disclaimer = 'This aggregated medical summary was generated by MediMind AI for personal documentation and clinical review. It does not replace professional medical diagnosis, emergency department care, or specialized clinical consultation.';
    const discLines = doc.splitTextToSize(disclaimer, contentWidth - 8);
    doc.text(discLines, margin + 4, y + 9);

    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('MediMind AI — Consolidated Clinical Portfolio', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const safeFileName = `MediMind_Consolidated_Medical_Summary_${Date.now()}.pdf`;
    doc.save(safeFileName);
    return safeFileName;
  },

  /**
   * Export printable PDF schedule of all active medications, including dosage times and specific instructions
   */
  exportMedicationSchedule(medications: Medication[], options: MedicationSchedulePDFOptions = {}) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 16;
    const contentWidth = pageWidth - margin * 2;
    let y = 16;

    const checkPageBreak = (neededSpace: number = 20) => {
      if (y + neededSpace > pageHeight - 20) {
        doc.addPage();
        y = 18;
        return true;
      }
      return false;
    };

    // Header Banner
    doc.setFillColor(15, 76, 129); // Deep medical navy
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('MEDIMIND CLINICAL MEDICATION SCHEDULE', margin + 6, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(224, 238, 255);
    doc.text('Printable Active Prescription Regimen, Dosage Timetable & Adherence Tracker', margin + 6, y + 16);

    // Date Badge
    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    doc.setFontSize(8);
    doc.text(`Printed: ${today}`, margin + contentWidth - 6, y + 9, { align: 'right' });
    doc.text(`Active Rx: ${medications.length}`, margin + contentWidth - 6, y + 16, { align: 'right' });

    y += 28;

    // Patient & Clinical Meta Box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('PATIENT REGIMEN PROFILE', margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Patient: ${options.patientName || 'Confidential Patient'}`, margin + 4, y + 12);
    doc.text(`Physician / Clinic: ${options.doctorName || 'Prescribing Physician of Record'}`, margin + 4, y + 17);

    const metaCol2 = margin + 92;
    doc.text(`Dispensing Pharmacy: ${options.pharmacyName || 'Local Dispensing Pharmacy'}`, metaCol2, y + 12);
    doc.text(`Emergency Support: ${options.emergencyContact || 'Poison Control 1-800-222-1222 / 911'}`, metaCol2, y + 17);

    y += 27;

    // Clinical Instruction Callout
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(55, 48, 163);
    doc.text('PATIENT ADHERENCE MANDATE:', margin + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(67, 56, 202);
    doc.text(
      'Take medications exactly as directed. Never stop or modify dosages without physician consultation. Keep out of reach of children.',
      margin + 4,
      y + 9
    );

    y += 16;

    // Main Active Medications Table
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('ACTIVE PRESCRIPTION DOSAGE TIMETABLE', margin, y);
    y += 5;

    // Table Header
    doc.setFillColor(30, 41, 59);
    doc.rect(margin, y, contentWidth, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);

    const c1 = margin + 3; // Medication & Strength
    const c2 = margin + 50; // Schedule & Time
    const c3 = margin + 82; // Instructions & Warnings
    const c4 = margin + 144; // Physical Pill Verification

    doc.text('MEDICATION & STRENGTH', c1, y + 4.8);
    doc.text('SCHEDULE & TIME', c2, y + 4.8);
    doc.text('INSTRUCTIONS & FOOD WARNINGS', c3, y + 4.8);
    doc.text('PHYSICAL PILL VERIFICATION', c4, y + 4.8);
    y += 7;

    if (medications.length === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(margin, y, contentWidth, 12, 'F');
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('No active medications currently registered in schedule.', margin + 4, y + 7);
      y += 14;
    } else {
      // Sort medications chronologically by time
      const sortedMeds = [...medications].sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      sortedMeds.forEach((med, idx) => {
        const instructionsText = med.instructions?.trim() || 'Take as directed by prescribing physician.';
        const splitInstructions = doc.splitTextToSize(instructionsText, 58);
        const appearanceText = med.pillAppearance || (med.pillColor || med.pillShape ? `${med.pillColor || ''} ${med.pillShape || ''}`.trim() : (med.pillPhoto ? 'Photo Verified on File' : 'Standard Oral Tablet/Capsule'));
        const splitAppearance = doc.splitTextToSize(appearanceText, 30);

        const neededRowHeight = Math.max(13, splitInstructions.length * 3.8 + 6, splitAppearance.length * 3.8 + 6);
        checkPageBreak(neededRowHeight + 4);

        // Row background
        if (idx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 250, 252);
        }
        doc.rect(margin, y, contentWidth, neededRowHeight, 'F');

        // Draw subtle border line
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + neededRowHeight, margin + contentWidth, y + neededRowHeight);

        // Col 1: Med Name & Dosage
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(med.name, c1, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(med.dosage, c1, y + 8.5);

        // Col 2: Time & Frequency
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(28, 78, 172);
        doc.text(med.time || '09:00', c2, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(med.frequency || 'Daily', c2, y + 8.5);

        // Col 3: Instructions & Warnings
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(30, 41, 59);
        doc.text(splitInstructions, c3, y + 4.5);

        // Col 4: Pill Verification
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(splitAppearance, c4, y + 4.5);

        if (med.pillPhoto) {
          try {
            if (med.pillPhoto.startsWith('data:image')) {
              doc.addImage(med.pillPhoto, 'JPEG', c4, y + 4.5 + Math.min(splitAppearance.length * 3.5, 6), 7, 7);
            }
          } catch (e) {
            // Silently fallback if image decoding in pdf fails
          }
        }

        y += neededRowHeight;
      });
    }

    y += 8;

    // Weekly Adherence Checklist Table (Printable checkboxes)
    if (options.includeChecklist !== false && medications.length > 0) {
      checkPageBreak(40);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text('WEEKLY DOSAGE ADHERENCE TRACKER (PRINTABLE CHECKLIST)', margin, y);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Post on refrigerator or medicine cabinet. Check off each dose when administered.', margin, y + 4);
      y += 8;

      // Table Header for Weekly Grid
      doc.setFillColor(51, 65, 85);
      doc.rect(margin, y, contentWidth, 6.5, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);

      const wMedCol = 52;
      const wDay = (contentWidth - wMedCol) / 7;

      doc.text('MEDICATION & TIME', margin + 3, y + 4.5);
      const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      days.forEach((day, dIdx) => {
        doc.text(day, margin + wMedCol + dIdx * wDay + wDay / 2, y + 4.5, { align: 'center' });
      });
      y += 6.5;

      medications.forEach((med, idx) => {
        checkPageBreak(8);
        doc.setFillColor(idx % 2 === 0 ? 255 : 248, 250, 252);
        doc.rect(margin, y, contentWidth, 7, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.line(margin, y + 7, margin + contentWidth, y + 7);

        // Med name and time
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);
        const medLabel = `${med.name} (${med.time || '09:00'})`;
        const truncatedLabel = doc.splitTextToSize(medLabel, wMedCol - 4)[0];
        doc.text(truncatedLabel, margin + 3, y + 4.8);

        // Checkbox boxes for each day
        days.forEach((_, dIdx) => {
          const boxX = margin + wMedCol + dIdx * wDay + (wDay / 2) - 2;
          const boxY = y + 1.8;
          doc.setDrawColor(148, 163, 184);
          doc.rect(boxX, boxY, 3.8, 3.8, 'D');
        });

        y += 7;
      });

      y += 8;
    }

    // Critical Warnings & Missed Dose Protocol
    checkPageBreak(30);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text('CRITICAL DRUG SAFETY & MISSED DOSE PROTOCOL', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor(127, 29, 29);
    const safetyNote1 = '• Missed Doses: Take as soon as you remember. If it is almost time for your next scheduled dose, skip the missed dose and resume your regular schedule. NEVER double up or take extra doses.';
    const safetyNote2 = '• Side Effects: Immediately report rash, swelling of face/lips, severe dizziness, or breathing difficulties to your doctor or emergency department.';
    doc.text(doc.splitTextToSize(safetyNote1, contentWidth - 8), margin + 4, y + 9);
    doc.text(doc.splitTextToSize(safetyNote2, contentWidth - 8), margin + 4, y + 14);

    y += 24;

    // Attending Physician / Pharmacist Verification Block
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('CLINICAL REVIEW & PHARMACIST SIGN-OFF', margin, y);
    y += 5;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);

    // Left signature line
    const sigWidth = (contentWidth - 10) / 2;
    doc.line(margin, y + 10, margin + sigWidth, y + 10);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Attending Physician / Caregiver Signature & Credentials', margin, y + 14);

    // Right date/stamp line
    doc.line(margin + sigWidth + 10, y + 10, margin + contentWidth, y + 10);
    doc.text('Review Date & Dispensing Pharmacy Verification Stamp', margin + sigWidth + 10, y + 14);

    y += 20;

    // Clinical Disclaimer
    checkPageBreak(18);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 12, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('LEGAL & MEDICAL DISCLAIMER', margin + 3, y + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text(
      'This schedule is compiled by MediMind AI based on patient-provided records. Always verify prescription details against official pharmacist labels and manufacturer packaging. In an emergency, dial 911 (US) or local emergency response immediately.',
      margin + 3,
      y + 7.5,
      { maxWidth: contentWidth - 6 }
    );

    // Page Numbers and Footer
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('MediMind AI — Active Prescription & Medication Regimen Schedule', margin, pageHeight - 10);
      doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    const safeFileName = `MediMind_Medication_Schedule_${Date.now()}.pdf`;
    doc.save(safeFileName);
    return safeFileName;
  }
};
