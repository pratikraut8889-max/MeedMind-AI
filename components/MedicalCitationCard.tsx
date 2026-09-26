import React, { useState } from 'react';
import { CitationSource } from '../types';

interface MedicalCitationCardProps {
  citation: CitationSource;
  compact?: boolean;
}

export const MedicalCitationCard: React.FC<MedicalCitationCardProps> = ({ citation, compact = false }) => {
  const [showExcerpt, setShowExcerpt] = useState(false);

  const getOrgBadgeStyle = (org: string) => {
    const o = org.toLowerCase();
    if (o.includes('cdc')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800';
    }
    if (o.includes('heart') || o.includes('aha')) {
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    }
    if (o.includes('nih') || o.includes('medline') || o.includes('niddk')) {
      return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800';
    }
    if (o.includes('diabetes') || o.includes('ada')) {
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
  };

  return (
    <div
      id={`citation-${citation.documentIdentifier || citation.organization.replace(/\s+/g, '-').toLowerCase()}`}
      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span
            className={`px-2 py-0.5 rounded-md font-semibold border text-[10px] tracking-wide ${getOrgBadgeStyle(
              citation.organization
            )}`}
          >
            {citation.organization}
          </span>

          {citation.documentIdentifier && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
              <i className="fas fa-file-lines text-[9px]"></i>
              {citation.documentIdentifier}
            </span>
          )}

          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <i className="fas fa-shield-halved text-[10px]"></i>
            Verified Source
          </span>
        </div>

        {typeof citation.relevanceScore === 'number' && (
          <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            {Math.round(citation.relevanceScore * 100)}% match
          </span>
        )}
      </div>

      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-snug line-clamp-2">
          {citation.title}
        </h4>

        {citation.url && (
          <a
            href={citation.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 shrink-0 font-medium text-[11px] p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
            title="Open official medical reference"
          >
            <span>View</span>
            <i className="fas fa-arrow-up-right-from-square text-[9px]"></i>
          </a>
        )}
      </div>

      {citation.publicationDate && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          <i className="fas fa-calendar-days text-[9px]"></i>
          <span>Published: {citation.publicationDate}</span>
        </div>
      )}

      {citation.excerpt && !compact && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setShowExcerpt(!showExcerpt)}
            className="text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1 font-medium"
          >
            <span>{showExcerpt ? 'Hide clinical passage' : 'Show clinical passage'}</span>
            <i className={`fas fa-chevron-${showExcerpt ? 'up' : 'down'} text-[9px]`}></i>
          </button>

          {showExcerpt && (
            <p className="mt-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed italic border-l-2 border-blue-500">
              "{citation.excerpt}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};
