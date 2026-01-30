
import React from 'react';
import { UserProfile } from '../types';

interface Props {
  profile: UserProfile | null;
  onUpdate: (profile: UserProfile) => void;
  onClear: () => void;
}

const ProfileSettings: React.FC<Props> = ({ profile, onUpdate, onClear }) => {
  if (!profile) return null;

  const handleUpdate = (field: keyof UserProfile, value: string) => {
    onUpdate({ ...profile, [field]: value });
  };

  return (
    <div className="space-y-10 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white tracking-tighter">Vault Identity</h2>
        <button
          onClick={onClear}
          className="bg-red-500/10 text-red-500 border border-red-500/20 px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
        >
          Purge All Data
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="vault-card p-10 rounded-[3rem] space-y-8">
          <div className="flex items-center gap-6 pb-8 border-b border-white/5">
            <div className="w-20 h-20 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
              {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <span className="text-white opacity-20 text-3xl font-black">?</span>}
            </div>
            <div>
              <p className="text-[9px] font-black text-gold uppercase tracking-[0.3em] mb-1">Status: Verified</p>
              <h3 className="text-xl font-black text-white">{profile.name}</h3>
              <p className="text-sm text-slate-500 font-mono">{profile.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            <SettingField label="Legal Name" value={profile.name} onChange={(v) => handleUpdate('name', v)} />
            <SettingField label="Filing Status" value={profile.filingStatus || 'Not Set'} onChange={(v) => handleUpdate('filingStatus', v)} />
            <SettingField label="Phone" value={profile.phoneNumber || 'Not Set'} onChange={(v) => handleUpdate('phoneNumber', v)} />
          </div>
        </div>

        <div className="vault-card p-10 rounded-[3rem] space-y-6">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] mb-4">Tax Residence</h3>
          <SettingField label="Street" value={profile.streetAddress || ''} onChange={(v) => handleUpdate('streetAddress', v)} />
          <div className="grid grid-cols-2 gap-4">
            <SettingField label="City" value={profile.city || ''} onChange={(v) => handleUpdate('city', v)} />
            <SettingField label="State" value={profile.state || ''} onChange={(v) => handleUpdate('state', v)} />
          </div>
          <SettingField label="ZIP Code" value={profile.zipCode || ''} onChange={(v) => handleUpdate('zipCode', v)} />
          <div className="pt-6 border-t border-white/5">
            <p className="text-[9px] text-slate-600 leading-relaxed italic">
              * This info is used by the AI to pre-populate your Form 1040 draft. Keep it accurate for better tax estimates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingField = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => {
  const id = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[9px] font-black text-slate-700 uppercase tracking-widest">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-gold outline-none transition-all"
      />
    </div>
  );
};

export default ProfileSettings;
