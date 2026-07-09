import React, { useState } from 'react';
import { Users, UserPlus, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import UserManagementModal from '../dashboard/UserManagementModal';

export default function TeamManagementModule() {
  const { users } = useAuth();
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showInternalToast = (text: string, type: 'success' | 'error') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 4000);
  };

  const formatDateOnly = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-sm border border-[#E7D6C4] overflow-hidden">
      
      {/* INTERNAL TOAST */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 animate-fade-in ${
          toastMsg.type === 'success' ? 'bg-[#34C759] text-white' : 'bg-[#FF4D4F] text-white'
        }`}>
          {toastMsg.type === 'success' ? '✓' : '✕'} {toastMsg.text}
        </div>
      )}

      {/* Header */}
      <div className="px-6 py-5 border-b border-[#E7D6C4] flex items-center justify-between bg-[#FFF4E8]/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center border border-orange-200">
            <Users className="w-5 h-5 text-[#8B5A2B]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#3B2A1D] leading-none flex items-center gap-2">
              Team Management
              <span className="bg-[#8B5A2B]/10 text-[#8B5A2B] text-[10px] font-bold px-2 py-0.5 rounded-full">Admin Only</span>
            </h2>
            <p className="text-xs text-[#7A6A5A] font-semibold mt-1">Add employees, interns, testers and set their login credentials</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddUserModal(true)}
          className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          Add New Member
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-[#FFF8F2]/30 p-6">
        <div className="bg-white border border-[#E7D6C4] rounded-2xl shadow-xs overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#E7D6C4] text-[#7A6A5A] font-semibold h-10 bg-gray-50/50">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Email / Login</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3 text-right">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5EDE4] text-[#3B2A1D]">
              {users.length > 0 ? users.map((user) => (
                <tr key={user.id} className="font-medium hover:bg-[#FFF8F2]/50 transition-colors">
                  <td className="px-5 py-4 font-bold">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#E7D6C4] to-[#CD853F] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        {(user.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-[#3B2A1D] text-[15px]">{user.name || 'Unknown User'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-mono text-[#7A6A5A] text-xs bg-[#F5EDE4] px-2.5 py-1 rounded-md">{user.email}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                      user.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                      user.role === 'team_lead' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      user.role === 'developer' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      user.role === 'tester' ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      {user.role === 'admin' && <Shield className="w-3 h-3" />}
                      {(user.role || 'user').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right text-[#7A6A5A] text-xs">
                    {formatDateOnly(user.createdAt)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-[#7A6A5A]/50">
                      <Users className="w-10 h-10" />
                      <p className="text-base font-medium">No team members yet.</p>
                      <p className="text-sm">Click "Add New Member" to invite your first employee or intern.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddUserModal && (
        <UserManagementModal 
          onClose={() => setShowAddUserModal(false)} 
          showToast={showInternalToast}
        />
      )}
    </div>
  );
}
