import React, { useEffect, useState } from 'react';
import { Trash2, RotateCcw, Inbox, Clock3 } from 'lucide-react';
import { RecycleItem } from '../../types';
import { getRecycleBin, restoreRecycleItem, permanentlyDeleteRecycleItem } from '../../utils/storage';

interface RecycleBinProps {
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
}

export default function RecycleBin({ showToast }: RecycleBinProps) {
  const [items, setItems] = useState<RecycleItem[]>([]);

  useEffect(() => {
    setItems(getRecycleBin());
  }, []);

  const refresh = () => setItems(getRecycleBin());

  const handleRestore = (item: RecycleItem) => {
    restoreRecycleItem(item);
    refresh();
    showToast(`${item.name} restored.`, 'success');
  };

  const handleDeleteForever = (item: RecycleItem) => {
    permanentlyDeleteRecycleItem(item);
    refresh();
    showToast(`${item.name} deleted permanently.`, 'info');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold text-[#3B2A1D] tracking-tight flex items-center gap-2">
          <Inbox className="w-5 h-5 text-[#8B5A2B]" />
          Recycle Bin
        </h1>
        <p className="text-xs text-[#7A6A5A] mt-0.5">Deleted projects, documents, test cases, and screenshots stay here for 30 days before cleanup.</p>
      </div>

      <div className="bg-white border border-[#E7D6C4] rounded-2xl overflow-hidden shadow-xs">
        {items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FFF4E8]/40 border-b border-[#E7D6C4] text-xs font-bold text-[#3B2A1D] h-11">
                  <th className="px-4">Type</th>
                  <th className="px-4">Name</th>
                  <th className="px-4">Deleted Date</th>
                  <th className="px-4">Deleted By</th>
                  <th className="px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs text-[#3B2A1D] divide-y divide-[#E7D6C4]/40">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-[#FFF8F2]/30">
                    <td className="px-4 py-3 font-semibold">{item.type}</td>
                    <td className="px-4 py-3">{item.name}</td>
                    <td className="px-4 py-3 flex items-center gap-1.5"><Clock3 className="w-3.5 h-3.5 text-[#7A6A5A]" />{new Date(item.deletedAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{item.deletedBy}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleRestore(item)} className="px-3 py-1.5 bg-[#8B5A2B] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" /> Restore
                        </button>
                        <button onClick={() => handleDeleteForever(item)} className="px-3 py-1.5 border border-red-200 text-red-600 text-[11px] font-bold rounded-lg flex items-center gap-1.5">
                          <Trash2 className="w-3.5 h-3.5" /> Delete Forever
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-20 text-center text-[#7A6A5A]/50">
            <Inbox className="w-10 h-10 mx-auto text-[#E7D6C4]" />
            <p className="text-sm font-semibold mt-2">Recycle Bin is empty.</p>
          </div>
        )}
      </div>
    </div>
  );
}
