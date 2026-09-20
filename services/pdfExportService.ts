import jsPDF from 'jspdf';
import { AnalysisResult } from '../types';

export interface PDFExportOptions {
  patientName?: string;
  reportDate?: string | number;
  fileName?: string;
  location?: string;
}

export const PDFExportService = {
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
    doc.text('Location:', margin + 100, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(options.location || 'Not Specified', margin + 116, y + 6);

    if (result.estimatedCost) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Est. Cost:', margin + 4, y + 11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 64, 175);
      doc.text(result.estimatedCost, margin + 22, y + 11);
    }

    y += 20;

    // --- Section: Executive Clinical Summary ---
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

    // --- Section: Plain-Language Patient Explanation ---
    if (result.simpleExplanation) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('2. Patient-Friendly Explanation', margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      const explLines = doc.splitTextToSize(result.simpleExplanation, contentWidth);
      doc.text(explLines, margin, y);
      y += explLines.length * 4.2 + 8;
    }

    // --- Section: Red Flags & Urgent Observations ---
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
      result.redFlags.forEach((flag, idx) => {
        const flagText = `${flag.finding} - Action Required: ${flag.action}`;
        const lines = doc.splitTextToSize(flagText, contentWidth - 28);
        const cardHeight = Math.max(12, lines.length * 4.2 + 5);

        checkPageBreak(cardHeight + 4);

        const isHigh = flag.severity === 'HIGH';
        const isMed = flag.severity === 'MEDIUM';

        // Background color based on severity
        if (isHigh) {
          doc.setFillColor(254, 242, 242); // red-50
          doc.setDrawColor(254, 202, 202); // red-200
        } else if (isMed) {
          doc.setFillColor(255, 251, 235); // amber-50
          doc.setDrawColor(253, 230, 138); // amber-200
        } else {
          doc.setFillColor(241, 245, 249); // slate-100
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

    // --- Section: Next Steps & Recommended Actions ---
    if (result.nextSteps && result.nextSteps.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('4. Recommended Next Steps', margin, y);
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

    // --- Section: Medication Interactions (if present) ---
    if (result.medicationInteractions && result.medicationInteractions.length > 0) {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 58, 138);
      doc.text('5. Medication Interaction Notes', margin, y);
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

    // --- Clinical Disclaimer Box at the End ---
    checkPageBreak(25);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CLINICAL DISCLAIMER', margin + 4, y + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const disclaimer = 'This report was generated using MediMind AI for informational and educational second opinion purposes only. It does not replace professional medical advice, clinical diagnosis, or treatment. Always consult a qualified physician or healthcare provider regarding any medical condition or urgent symptoms.';
    const discLines = doc.splitTextToSize(disclaimer, contentWidth - 8);
    doc.text(discLines, margin + 4, y + 9.5);

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
  }
};
