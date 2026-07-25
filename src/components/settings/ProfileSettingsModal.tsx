import React, { useState } from 'react';
import { User as UserIcon, X, Save, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface ProfileSettingsModalProps {
  onClose: () => void;
}

export default function ProfileSettingsModal({ onClose }: ProfileSettingsModalProps) {
  const { currentUser, updateProfile, seedInitialUsers } = useAuth();
  
  const [name, setName] = useState(currentUser?.name || '');
  const [password, setPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  if (!currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    
    const { success, error } = await updateProfile(name, password || undefined);
    
    setIsSaving(false);
    if (success) {
      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setPassword(''); // clear password field
    } else {
      setMessage({ text: error || 'Failed to update profile', type: 'error' });
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setMessage({ text: 'Seeding users...', type: 'success' as any });
    const { success, message: msg, error } = await seedInitialUsers();
    setIsSeeding(false);
    if (success) {
      setMessage({ text: msg || 'Users seeded!', type: 'success' });
    } else {
      setMessage({ text: error || 'Failed to seed users', type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] animate-fade-in p-4" onClick={onClose}>
      <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#F5EDE4] pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-[#3B2A1D]">Profile Settings</h3>
              <p className="text-xs text-[#7A6A5A]">Update your personal info</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#7A6A5A] hover:bg-[#F5EDE4] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-xs font-bold ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#7A6A5A]">Display Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2.5 border border-[#E7D6C4] rounded-xl text-sm text-[#3B2A1D] bg-[#FFF8F2]/30 focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#7A6A5A]">New Password (Optional)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#7A6A5A]/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Leave blank to keep current"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-[#E7D6C4] rounded-xl text-sm text-[#3B2A1D] bg-[#FFF8F2]/30 focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </form>

        {currentUser.role === 'admin' && (
          <div className="pt-4 border-t border-[#F5EDE4]">
            <button
              type="button"
              onClick={handleSeed}
              disabled={isSeeding}
              className="w-full py-2 border border-[#8B5A2B] text-[#8B5A2B] hover:bg-[#FFF4E8] rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSeeding ? 'Seeding...' : 'Seed Demo Users'}
            </button>
            <p className="text-[10px] text-center text-[#7A6A5A] mt-2">
              Creates tl, emp, tester, intern1, intern2 @webnxt.co
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
