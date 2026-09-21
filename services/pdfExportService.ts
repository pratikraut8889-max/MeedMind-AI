import jsPDF from 'jspdf';
import { AnalysisResult, StoredReport } from '../types';

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
  },

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

      // Quick High-Level Executive Summary
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

      // Red Flags
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
      } else {
        checkPageBreak(8);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(22, 101, 52);
        doc.text('✓ No emergent red flags identified for this entry.', margin + 3, y);
        y += 5;
      }

      // Lab Measurements
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

      // Next Steps
      if (report.result?.nextSteps && report.result.nextSteps.length > 0) {
        checkPageBreak(15);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        doc.text('Next Steps:', margin, y);
        y += 3.5;

        report.result.nextSteps.slice(0, 3).forEach((step, sIdx) => {
          const sLines = doc.splitTextToSize(`${sIdx + 1}. ${step}`, contentWidth - 4);
          checkPageBreak(sLines.length * 3.5 + 1);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(51, 65, 85);
          doc.text(sLines, margin + 2, y);
          y += sLines.length * 3.5 + 1.5;
        });
        y += 2;
      }

      // Separator
      checkPageBreak(8);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, margin + contentWidth, y);
      y += 6;
    });

    // Final Disclaimer
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

    // Footers
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
  }
};
