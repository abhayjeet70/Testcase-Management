import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { X, UserPlus, Mail, Lock, Shield, User as UserIcon } from 'lucide-react';
import { User, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface UserManagementModalProps {
  editingUser?: User | null;
  onClose: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export default function UserManagementModal({ editingUser, onClose, showToast }: UserManagementModalProps) {
  const { adminCreateUser, adminUpdateUser } = useAuth();
  
  const [name, setName] = useState(editingUser?.name || '');
  const [email, setEmail] = useState(editingUser?.email || '');
  const [password, setPassword] = useState('Welcome@123');
  const [role, setRole] = useState<UserRole>(editingUser?.role || 'tester');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!name.trim() || !email.trim() || !password.trim()) {
      setLocalError('All fields are required.');
      return;
    }
    if (!editingUser && password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    
    setIsSubmitting(true);
    let success = false;
    let error = '';

    if (editingUser) {
      const res = await adminUpdateUser(editingUser.id, name.trim(), role);
      success = res.success;
      error = res.error || '';
    } else {
      const res = await adminCreateUser(email.trim(), password, name.trim(), role);
      success = res.success;
      error = res.error || '';
    }
    setIsSubmitting(false);

    if (success) {
      showToast(`✓ ${name} has been ${editingUser ? 'updated' : 'added'}!`, 'success');
      onClose();
    } else {
      setLocalError(error || `Failed to ${editingUser ? 'update' : 'create'} user.`);
    }
  };

  const modalContent = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: 'slideUp 0.2s ease-out' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start p-5 border-b border-[#F5EDE4] bg-[#FFF8F2]">
          <div>
            <h2 className="text-lg font-bold text-[#3B2A1D] flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#8B5A2B]" />
              {editingUser ? 'Edit Team Member' : 'Add New Team Member'}
            </h2>
            <p className="text-xs text-[#7A6A5A] mt-1">
              {editingUser ? 'Update member details and access level.' : 'Set login credentials for employees, interns, testers, etc.'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-[#7A6A5A] hover:bg-white hover:text-[#3B2A1D] rounded-xl transition-colors mt-0.5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Error banner */}
          {localError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {localError}
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-xs font-bold text-[#3B2A1D] mb-1.5">Full Name</label>
            <div className="relative">
              <input
                type="text"
                required
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E7D6C4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/25 focus:border-[#8B5A2B] transition-all text-sm"
                placeholder="e.g. Priya Sharma"
              />
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-[#3B2A1D] mb-1.5">Email Address (Login ID)</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!!editingUser}
                className={`w-full pl-9 pr-4 py-2.5 border border-[#E7D6C4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/25 focus:border-[#8B5A2B] transition-all text-sm ${editingUser ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                placeholder="priya@company.com"
              />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
            </div>
            {editingUser && <p className="text-[10px] text-[#7A6A5A] mt-1">Email address cannot be changed.</p>}
          </div>

          {/* Password */}
          {!editingUser && (
            <div>
              <label className="block text-xs font-bold text-[#3B2A1D] mb-1.5">Password</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E7D6C4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/25 focus:border-[#8B5A2B] transition-all text-sm font-mono"
                />
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
              </div>
              <p className="text-[10px] text-[#7A6A5A] mt-1">Min. 6 characters. Share this with the user so they can log in.</p>
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-[#3B2A1D] mb-1.5">Platform Role</label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value as UserRole)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E7D6C4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/25 focus:border-[#8B5A2B] transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="admin">Administrator — Full access</option>
                <option value="team_lead">Team Lead — Manage & assign bugs</option>
                <option value="developer">Developer — Fix & update bugs</option>
                <option value="tester">QA Tester — Report & test bugs</option>
                <option value="intern">Intern — Read-only access</option>
              </select>
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t border-[#F5EDE4]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-[#7A6A5A] hover:bg-[#F5EDE4] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-semibold rounded-xl transition-all flex items-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {editingUser ? 'Updating...' : 'Creating account...'}
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  {editingUser ? 'Save Changes' : 'Add Member'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );

  // Use a portal so the modal always renders at the body root, not inside overflow:hidden parents
  return ReactDOM.createPortal(modalContent, document.body);
}
