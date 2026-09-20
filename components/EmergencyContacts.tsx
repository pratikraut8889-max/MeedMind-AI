import React, { useState } from 'react';
import { EmergencyContact } from '../types';

interface EmergencyContactsProps {
  contacts: EmergencyContact[];
  onSaveContacts: (contacts: EmergencyContact[]) => void;
  darkMode: boolean;
  highContrast: boolean;
}

export const EmergencyContacts: React.FC<EmergencyContactsProps> = ({
  contacts,
  onSaveContacts,
  darkMode,
  highContrast
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('Doctor');
  const [notes, setNotes] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const relationsList = [
    'Doctor',
    'Primary Care Physician',
    'Cardiologist',
    'Pediatrician',
    'Specialist',
    'Family',
    'Spouse',
    'Parent',
    'Emergency Contact'
  ];

  const handleAdd = () => {
    if (!name.trim() || !phone.trim()) {
      alert('Please provide both name and phone number.');
      return;
    }

    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: name.trim(),
      phone: phone.trim(),
      relation,
      notes: notes.trim() ? notes.trim() : undefined
    };

    const updated = [...contacts, newContact];
    onSaveContacts(updated);
    setName('');
    setPhone('');
    setNotes('');
    setRelation('Doctor');
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this emergency contact?')) {
      const updated = contacts.filter(c => c.id !== id);
      onSaveContacts(updated);
    }
  };

  const handleCopyPhone = (phoneNum: string, id: string) => {
    navigator.clipboard.writeText(phoneNum);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const addPreset = (presetName: string, presetPhone: string, presetRelation: string, presetNotes: string) => {
    const newContact: EmergencyContact = {
      id: Date.now().toString(),
      name: presetName,
      phone: presetPhone,
      relation: presetRelation,
      notes: presetNotes
    };
    onSaveContacts([...contacts, newContact]);
  };

  const cardBg = highContrast
    ? 'bg-slate-900 border-2 border-yellow-400 text-yellow-300'
    : darkMode
    ? 'bg-slate-800 border border-slate-700 text-white'
    : 'bg-white border border-slate-100 shadow-sm text-slate-800';

  const badgeColor = (rel: string) => {
    if (rel.toLowerCase().includes('doctor') || rel.toLowerCase().includes('physician') || rel.toLowerCase().includes('cardiologist')) {
      return highContrast
        ? 'bg-yellow-400 text-black'
        : darkMode
        ? 'bg-blue-900/60 text-blue-300 border border-blue-700'
        : 'bg-blue-100 text-blue-800 border border-blue-200';
    }
    if (rel.toLowerCase().includes('emergency')) {
      return highContrast
        ? 'bg-red-500 text-white'
        : darkMode
        ? 'bg-red-900/60 text-red-300 border border-red-700'
        : 'bg-red-100 text-red-800 border border-red-200';
    }
    return highContrast
      ? 'bg-yellow-800 text-yellow-200'
      : darkMode
      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
      : 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center">
            <i className="fas fa-phone-alt text-sm"></i>
          </div>
          <div>
            <h3 className="font-bold text-base">Emergency Contacts & Doctors</h3>
            <p className="text-xs opacity-60">Store key numbers for rapid one-touch dialing</p>
          </div>
        </div>
        <button
          id="add-emergency-contact-btn"
          onClick={() => setShowAddModal(true)}
          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-500/20"
        >
          <i className="fas fa-plus text-[10px]"></i> Add Contact
        </button>
      </div>

      {contacts.length === 0 ? (
        <div className={`p-6 rounded-2xl border text-center ${cardBg}`}>
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto mb-3 text-xl">
            <i className="fas fa-address-book"></i>
          </div>
          <h4 className="font-bold text-sm mb-1">No Emergency Contacts Stored</h4>
          <p className="text-xs opacity-70 mb-4 max-w-sm mx-auto">
            Add phone numbers for your primary doctor, specialist, or family members to call instantly in an urgent situation.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => addPreset('Primary Care Clinic', '+1 (555) 019-2834', 'Primary Care Physician', 'Main hospital reception')}
              className="px-3 py-1 rounded-lg text-xs font-medium border border-blue-500/30 hover:bg-blue-500/10 transition"
            >
              + Quick Add Doctor
            </button>
            <button
              onClick={() => addPreset('Emergency Contact (Family)', '+1 (555) 012-9988', 'Family', 'Next of kin')}
              className="px-3 py-1 rounded-lg text-xs font-medium border border-red-500/30 hover:bg-red-500/10 transition"
            >
              + Quick Add Family
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-4 rounded-2xl transition-all relative flex flex-col justify-between ${cardBg}`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${badgeColor(contact.relation)}`}>
                    {contact.relation}
                  </span>
                  <button
                    onClick={() => handleDelete(contact.id)}
                    title="Delete contact"
                    className="text-slate-400 hover:text-red-500 p-1 text-xs transition-colors"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                <h4 className="font-bold text-base leading-tight mb-1">{contact.name}</h4>
                <p className="text-xs font-mono opacity-80 mb-2 flex items-center gap-1.5">
                  <i className="fas fa-phone text-[10px] opacity-60"></i>
                  <span>{contact.phone}</span>
                </p>
                {contact.notes && (
                  <p className="text-[11px] opacity-70 italic mb-3 line-clamp-2">
                    {contact.notes}
                  </p>
                )}
              </div>

              {/* Quick Call & Message Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 mt-1">
                <a
                  href={`tel:${contact.phone.replace(/[^0-9+]/g, '')}`}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <i className="fas fa-phone-alt"></i> Call Now
                </a>
                <a
                  href={`sms:${contact.phone.replace(/[^0-9+]/g, '')}`}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-center transition ${
                    darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Send text message"
                >
                  <i className="fas fa-comment-dots"></i>
                </a>
                <button
                  onClick={() => handleCopyPhone(contact.phone, contact.id)}
                  className={`p-2 rounded-xl border text-xs flex items-center justify-center transition ${
                    darkMode ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-100'
                  }`}
                  title="Copy phone number"
                >
                  <i className={`fas ${copiedId === contact.id ? 'fa-check text-green-500' : 'fa-copy'}`}></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className={`w-full max-w-md p-6 rounded-3xl relative shadow-2xl ${cardBg}`}>
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <i className="fas fa-times"></i>
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center text-lg">
                <i className="fas fa-user-plus"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold">Add Emergency Contact</h3>
                <p className="text-xs opacity-60">Physician, specialist, or family member</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Robert Chen (Cardiologist)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm outline-none transition ${
                    darkMode ? 'bg-slate-700 border-slate-600 focus:border-blue-400 text-white' : 'bg-white border-slate-200 focus:border-blue-600 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. +1 (555) 345-6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm outline-none transition ${
                    darkMode ? 'bg-slate-700 border-slate-600 focus:border-blue-400 text-white' : 'bg-white border-slate-200 focus:border-blue-600 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Relationship / Role</label>
                <select
                  value={relation}
                  onChange={(e) => setRelation(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm outline-none transition ${
                    darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  {relationsList.map((r) => (
                    <option key={r} value={r} className="text-black">
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase opacity-60 mb-1">Notes (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Clinic hours 9am-5pm, On-call pager"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full p-2.5 rounded-xl border text-sm outline-none transition ${
                    darkMode ? 'bg-slate-700 border-slate-600 focus:border-blue-400 text-white' : 'bg-white border-slate-200 focus:border-blue-600 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm shadow-md transition"
              >
                Save Contact
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
