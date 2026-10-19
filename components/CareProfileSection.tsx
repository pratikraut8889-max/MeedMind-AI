import React from 'react';
import { CareProfile } from '../types';

interface CareProfileSectionProps {
  profile: CareProfile | null;
  onEdit: () => void;
  onAskAiForFriend: () => void;
  darkMode: boolean;
  highContrast: boolean;
}

export const CareProfileSection: React.FC<CareProfileSectionProps> = ({
  profile,
  onEdit,
  onAskAiForFriend,
  darkMode,
  highContrast
}) => {
  const cardBg = highContrast
    ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
    : darkMode
    ? 'bg-slate-900/90 border border-slate-800 text-white'
    : 'bg-gradient-to-r from-rose-50/70 via-white to-pink-50/50 border border-rose-200/80 shadow-sm text-slate-800';

  if (!profile || !profile.name) {
    return (
      <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${cardBg}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center text-base shadow-sm shrink-0">
              <i className="fas fa-heart"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Build for a Friend
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  Hacktoberfest 2026
                </span>
              </div>
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white mt-0.5">
                Who are you building MediMind for?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl mt-0.5">
                "I built this for someone I care about. Give MediMind enough context to make health information easier to understand."
              </p>
            </div>
          </div>

          <button
            type="button"
            id="configure-care-profile-btn"
            onClick={onEdit}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm shrink-0 active:scale-95"
          >
            <i className="fas fa-user-plus"></i>
            <span>Set Up Care Profile</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 sm:p-5 rounded-3xl border transition-all ${cardBg}`}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-600 text-white flex items-center justify-center text-lg shadow-md shadow-rose-500/20 shrink-0">
            <i className="fas fa-heart"></i>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                Built for Someone I Care About
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                Active Care Profile
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-0.5">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                {profile.name}
              </h3>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                ({profile.relationship}{profile.ageRange ? ` • ${profile.ageRange}` : ''})
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-0.5 max-w-2xl">
              "Personalized health guidance based on the information you choose to provide."
            </p>

            {/* Profile Context Chips */}
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {profile.knownConditions && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                  <i className="fas fa-stethoscope text-rose-500 text-[9px]"></i>
                  <span className="max-w-[200px] truncate">{profile.knownConditions}</span>
                </span>
              )}
              {profile.allergies && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 flex items-center gap-1">
                  <i className="fas fa-shield-virus text-rose-500 text-[9px]"></i>
                  <span className="max-w-[180px] truncate">Allergy: {profile.allergies}</span>
                </span>
              )}
              {profile.healthGoals && (
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                  <i className="fas fa-bullseye text-blue-500 text-[9px]"></i>
                  <span className="max-w-[220px] truncate">{profile.healthGoals}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            type="button"
            id="ask-ai-for-friend-btn"
            onClick={onAskAiForFriend}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95"
            title={`Ask health question personalized for ${profile.name}`}
          >
            <i className="fas fa-comment-medical"></i>
            <span>Ask for {profile.name.split(' ')[0]}</span>
          </button>

          <button
            type="button"
            id="edit-care-profile-btn"
            onClick={onEdit}
            className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
            title="Edit Care Profile details"
          >
            <i className="fas fa-pen text-[10px]"></i>
            <span>Edit</span>
          </button>
        </div>
      </div>
    </div>
  );
};
