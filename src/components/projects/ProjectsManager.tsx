import React, { useState } from 'react';
import { 
  FolderOpen, Folder, FileText, Plus, Search, 
  MoreVertical, Edit3, Trash2, Copy, FilePlus, ExternalLink,
  ChevronRight, Star, Settings2, ShieldCheck, Download, Upload, Clock
} from 'lucide-react';
import { Project } from '../../types';
import { supabase } from '../../lib/supabase';
import { 
  getDocuments, saveDocument, deleteDocument, duplicateDocument, 
  getDocumentsAll, getTestCasesByProject, getTestCases, saveTestCase, saveProject, addActivityLog 
} from '../../utils/storage';
import ArchiveFavoritesPanel from './ArchiveFavoritesPanel';
import { useAuth } from '../../contexts/AuthContext';

interface ProjectsManagerProps {
  projects: Project[];
  selectedProjectId: string;
  selectedDocumentId: string;
  onSelectProject: (id: string) => void;
  onSelectDocument: (id: string) => void;
  onAddProject: (name: string, desc?: string) => void;
  onDeleteProject: (id: string) => void;
  onDuplicateProject: (id: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onToggleFavorite: (id: string) => void;
  onSelectTab: (tab: string) => void;
}

export default function ProjectsManager({
  projects,
  selectedProjectId,
  selectedDocumentId,
  onSelectProject,
  onSelectDocument,
  onAddProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onToggleFavorite,
  onSelectTab
}: ProjectsManagerProps) {
  const { currentUser, users } = useAuth();
  const [projSearch, setProjSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Document creation modal state
  const [documentModalProject, setDocumentModalProject] = useState<string | null>(null);
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');

  // Document actions context menu state
  const [documentActionMenu, setDocumentActionMenu] = useState<{ docId: string; projectId: string } | null>(null);

  // Ribbon popup for sheets state
  const [selectedProjectForDocs, setSelectedProjectForDocs] = useState<Project | null>(null);

  // Project details modal state
  const [projectDetailsModal, setProjectDetailsModal] = useState<Project | null>(null);
  const [editedVersion, setEditedVersion] = useState('');
  const [editedDeveloper, setEditedDeveloper] = useState('');
  const [editedVercelLink, setEditedVercelLink] = useState('');
  const [editedZipFileName, setEditedZipFileName] = useState('');
  const [editedZipFileData, setEditedZipFileData] = useState('');
  const [editedTesterId, setEditedTesterId] = useState('');
  const [editedInternId, setEditedInternId] = useState('');

  const openProjectDetails = (p: Project) => {
    setEditedVersion(p.version || '');
    setEditedDeveloper(p.developer || '');
    setEditedVercelLink(p.vercel_link || '');
    setEditedZipFileName(p.zip_file_name || '');
    setEditedZipFileData(p.zip_file_data || '');
    setEditedTesterId(p.tester_id || '');
    setEditedInternId(p.intern_id || '');
    setProjectDetailsModal(p);
  };

  const handleSaveProjectDetails = () => {
    if (projectDetailsModal) {
      const payload: any = {
        id: projectDetailsModal.id,
        project_name: projectDetailsModal.project_name,
        version: editedVersion,
        developer: editedDeveloper,
        vercel_link: editedVercelLink,
        zip_file_name: editedZipFileName,
        tester_id: editedTesterId,
        intern_id: editedInternId
      };
      
      const now = new Date().toISOString();
      if (editedTesterId !== projectDetailsModal.tester_id) {
        payload.tester_assigned_at = now;
        const testerName = users.find(u => u.id === editedTesterId)?.name || editedTesterId || 'None';
        addActivityLog(projectDetailsModal.id, `Project "${projectDetailsModal.project_name}" Assigned to Tester: ${testerName}`);
      }
      if (editedInternId !== projectDetailsModal.intern_id) {
        payload.intern_assigned_at = now;
        const internName = users.find(u => u.id === editedInternId)?.name || editedInternId || 'None';
        addActivityLog(projectDetailsModal.id, `Project "${projectDetailsModal.project_name}" Assigned to Intern: ${internName}`);
      }
      if (editedDeveloper !== projectDetailsModal.developer) {
        payload.developer_assigned_at = now;
        const devName = editedDeveloper || 'None';
        addActivityLog(projectDetailsModal.id, `Project "${projectDetailsModal.project_name}" Assigned to Developer: ${devName}`);
      }

      if (editedZipFileData) {
        payload.zip_file_data = editedZipFileData;
      }

      saveProject(payload);
      setProjectDetailsModal(null);
      // Trigger a refresh (a hack since projects are passed via props)
      onRenameProject(projectDetailsModal.id, projectDetailsModal.project_name);
    }
  };

  const downloadDataUrl = async (dataUrl: string, fileName: string) => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error(err);
      alert("Failed to download ZIP file.");
    }
  };

  const handleDownloadProjectZip = async (proj: Project) => {
    if (!proj.zip_file_name) return;
    
    let dataUrl = proj.zip_file_data;
    if (!dataUrl) {
      const { data, error } = await supabase
        .from('tc_projects')
        .select('zip_file_data')
        .eq('id', proj.id)
        .single();
      
      if (data?.zip_file_data) {
        dataUrl = data.zip_file_data;
      } else {
        alert("No ZIP file data found in the database.");
        return;
      }
    }
    
    await downloadDataUrl(dataUrl, proj.zip_file_name);
  };

  const handleUploadZipToProject = (proj: Project, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          proj.zip_file_name = file.name;
          proj.zip_file_data = reader.result;
          saveProject(proj);
          onRenameProject(proj.id, proj.project_name); // Trigger refresh
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadZip = async () => {
    if (!projectDetailsModal || !editedZipFileName) return;
    
    let dataUrl = editedZipFileData;
    if (!dataUrl) {
      const { data, error } = await supabase
        .from('tc_projects')
        .select('zip_file_data')
        .eq('id', projectDetailsModal.id)
        .single();
      
      if (data?.zip_file_data) {
        dataUrl = data.zip_file_data;
        setEditedZipFileData(dataUrl);
      } else {
        alert("No ZIP file data found in the database.");
        return;
      }
    }
    
    await downloadDataUrl(dataUrl, editedZipFileName);
  };

  const filteredProjects = projects.filter(p => 
    (p.project_name || '').toLowerCase().includes((projSearch || '').toLowerCase()) && !p.archived
  );

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjName.trim()) {
      onAddProject(newProjName.trim(), newProjDesc.trim());
      setNewProjName('');
      setNewProjDesc('');
      setShowAddForm(false);
    }
  };

  const triggerRename = (proj: Project) => {
    const val = prompt('Enter new project name:', proj.project_name);
    if (val && val.trim()) {
      onRenameProject(proj.id, val.trim());
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3B2A1D] tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#8B5A2B]" />
            Workspace Projects
          </h1>
          <p className="text-sm text-[#7A6A5A] mt-1">Manage all your testing suites, documents, and files.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#7A6A5A]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={projSearch}
              onChange={e => setProjSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E7D6C4] bg-white rounded-xl text-sm text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B] transition-all shadow-sm"
            />
          </div>
          {currentUser && ['admin', 'team_lead', 'developer'].includes(currentUser.role) && (
            <button 
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              Create New Project
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {showAddForm && (
            <form onSubmit={handleCreate} className="bg-white border border-[#E7D6C4] p-5 rounded-2xl space-y-4 shadow-sm animate-fade-in">
              <h3 className="text-sm uppercase font-bold text-[#8B5A2B] tracking-wider border-b border-[#F5EDE4] pb-2">New Project Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#7A6A5A]">Project Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. E-Commerce App Testing"
                    value={newProjName}
                    onChange={e => setNewProjName(e.target.value)}
                    className="w-full p-2.5 border border-[#E7D6C4] rounded-xl text-sm text-[#3B2A1D] bg-[#FFF8F2]/30 focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#7A6A5A]">Description</label>
                  <input
                    type="text"
                    placeholder="Brief description..."
                    value={newProjDesc}
                    onChange={e => setNewProjDesc(e.target.value)}
                    className="w-full p-2.5 border border-[#E7D6C4] rounded-xl text-sm text-[#3B2A1D] bg-[#FFF8F2]/30 focus:outline-none focus:ring-1 focus:ring-[#8B5A2B]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#F5EDE4]">
                <button 
                  type="button" 
                  onClick={() => setShowAddForm(false)} 
                  className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  Create Project
                </button>
              </div>
            </form>
          )}

          <div className="flex flex-col gap-3">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((p) => {
                const docs = getDocuments(p.id);
                const totalCases = getTestCasesByProject(p.id);
                const isMenuOpen = activeMenuId === p.id;
                
                let latestUpdate = p.updated_at;
                if (docs.length > 0) {
                  const sortedDocs = [...docs].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                  latestUpdate = sortedDocs[0].updated_at;
                }

                return (
                  <div 
                    key={p.id} 
                    className="bg-white border border-[#E7D6C4] rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 relative cursor-pointer"
                    onClick={() => setSelectedProjectForDocs(p)}
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-3 bg-[#FFF4E8] rounded-xl shrink-0">
                        <Folder className="w-6 h-6 text-[#8B5A2B]" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-[#3B2A1D] text-base truncate">{p.project_name}</h3>
                          {p.favorite && <Star className="w-4 h-4 fill-[#F5A623] text-[#F5A623] shrink-0" />}
                        </div>
                        <p className="text-xs text-[#7A6A5A] line-clamp-1 mb-2">{p.description || 'No description provided.'}</p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.version && (
                            <div className="text-[10px] bg-[#FFF4E8] text-[#8B5A2B] px-2 py-0.5 rounded-md font-bold">
                              {p.version}
                            </div>
                          )}
                          {p.developer && (
                            <div className="text-[10px] bg-[#F5F5F5] text-[#555] px-2 py-0.5 rounded-md font-bold">
                              Dev: {p.developer}
                            </div>
                          )}
                          {p.vercel_link && (
                            <a 
                              href={p.vercel_link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold truncate max-w-[150px] hover:underline"
                            >
                              {p.vercel_link.replace(/^https?:\/\//, '')}
                            </a>
                          )}
                          <div className="text-[10px] bg-[#FDFBF9] border border-[#E7D6C4] text-[#7A6A5A] px-2 py-0.5 rounded-md font-bold">
                            {docs.length} Sheets
                          </div>
                          
                          {latestUpdate && (
                            <div className="text-[10px] bg-gray-50 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-md font-bold flex items-center gap-1" title="Last Updated">
                              <Clock className="w-3 h-3" />
                              {new Date(latestUpdate).toLocaleString(undefined, { 
                                month: 'short', day: 'numeric', 
                                hour: 'numeric', minute: '2-digit' 
                              })}
                            </div>
                          )}
                          
                          {p.tester_id && users.find(u => u.id === p.tester_id) && (
                            <div className="text-[10px] bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-md font-bold truncate max-w-[200px]" title={p.tester_assigned_at ? `Assigned: ${new Date(p.tester_assigned_at).toLocaleString()}` : ''}>
                              Tester: {users.find(u => u.id === p.tester_id)?.name} {p.tester_assigned_at ? `(${new Date(p.tester_assigned_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})` : ''}
                            </div>
                          )}
                          
                          {p.intern_id && users.find(u => u.id === p.intern_id) && (
                            <div className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md font-bold truncate max-w-[200px]" title={p.intern_assigned_at ? `Assigned: ${new Date(p.intern_assigned_at).toLocaleString()}` : ''}>
                              Intern: {users.find(u => u.id === p.intern_id)?.name} {p.intern_assigned_at ? `(${new Date(p.intern_assigned_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})})` : ''}
                            </div>
                          )}
                          
                          <div className="flex items-center gap-1 bg-[#FFF4E8] border border-[#E7D6C4] rounded-md px-1.5 py-0.5">
                            <label className="text-[10px] font-bold text-[#8B5A2B] cursor-pointer flex items-center gap-1 hover:underline">
                              <Upload className="w-3 h-3" />
                              <span className="truncate max-w-[80px]">{p.zip_file_name || 'Upload ZIP'}</span>
                              <input 
                                type="file" 
                                accept=".zip,.rar,.7z" 
                                className="hidden" 
                                onChange={(e) => handleUploadZipToProject(p, e)} 
                              />
                            </label>
                            {p.zip_file_name && (
                              <>
                                <div className="w-[1px] h-3 bg-[#E7D6C4] mx-0.5"></div>
                                <button onClick={(e) => { e.stopPropagation(); handleDownloadProjectZip(p); }} className="text-[#8B5A2B] hover:text-[#A66B37]" title="Download ZIP">
                                  <Download className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center justify-end gap-2 shrink-0">
                      {currentUser && ['admin', 'team_lead', 'developer'].includes(currentUser.role) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openProjectDetails(p); }}
                          className="p-2 border border-[#E7D6C4] text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF4E8] rounded-xl transition-colors"
                          title="Project Settings"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}

                      <div className="relative shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : p.id); }}
                          className="p-2 border border-[#E7D6C4] text-[#7A6A5A] hover:text-[#3B2A1D] hover:bg-[#FFF4E8] rounded-xl transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {isMenuOpen && (
                          <div 
                            className="absolute right-0 top-full mt-1 z-30 bg-white border border-[#E7D6C4] rounded-xl py-1.5 w-40 shadow-lg animate-fade-in"
                            onClick={e => e.stopPropagation()}
                          >
                            <button onClick={() => { onToggleFavorite(p.id); setActiveMenuId(null); }} className="w-full px-3 py-1.5 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2">
                              <Star className={`w-3.5 h-3.5 ${p.favorite ? 'fill-[#F5A623] text-[#F5A623]' : 'text-[#7A6A5A]'}`} />
                              {p.favorite ? 'Unfavorite' : 'Favorite'}
                            </button>
                            {currentUser && ['admin', 'team_lead', 'developer'].includes(currentUser.role) && (
                              <>
                                <button onClick={() => { triggerRename(p); setActiveMenuId(null); }} className="w-full px-3 py-1.5 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2">
                                  <Edit3 className="w-3.5 h-3.5 text-[#7A6A5A]" />
                                  Rename Project
                                </button>
                                <button onClick={() => { onDuplicateProject(p.id); setActiveMenuId(null); }} className="w-full px-3 py-1.5 hover:bg-[#FFF4E8] text-left text-xs font-semibold text-[#3B2A1D] flex items-center gap-2">
                                  <Copy className="w-3.5 h-3.5 text-[#7A6A5A]" />
                                  Duplicate
                                </button>
                                <button onClick={() => { if (confirm(`Delete project "${p.project_name}"?`)) onDeleteProject(p.id); setActiveMenuId(null); }} className="w-full px-3 py-1.5 hover:bg-red-50 text-left text-xs font-bold text-red-600 flex items-center gap-2">
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete Project
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProject(p.id);
                          if (docs.length > 0) onSelectDocument(docs[0].id);
                          onSelectTab('Projects');
                        }}
                        className="px-4 py-2 bg-[#FFF4E8] text-[#8B5A2B] hover:bg-[#FCECDA] border border-[#E7D6C4]/60 text-xs font-bold rounded-xl transition-colors shadow-xs"
                      >
                        Open Workspace →
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center bg-white border border-dashed border-[#E7D6C4] rounded-2xl flex flex-col items-center">
                <FolderOpen className="w-10 h-10 text-[#E7D6C4] mb-3" />
                <h3 className="text-sm font-bold text-[#3B2A1D]">No projects found</h3>
                <p className="text-xs text-[#7A6A5A] mt-1">Create a new project or adjust your search.</p>
              </div>
            )}
          </div>
        </div>

      {/* CREATE NEW FILE MODAL */}
      {documentModalProject && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setDocumentModalProject(null)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#3B2A1D]">Create Test Case File</h3>
                <p className="text-xs text-[#7A6A5A] mt-1 leading-relaxed">Add a new document file module under this project workspace.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">File Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Login Module"
                  value={newDocName}
                  onChange={e => setNewDocName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-none font-medium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Description (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Test scenarios for authentication flows"
                  value={newDocDesc}
                  onChange={e => setNewDocDesc(e.target.value)}
                  className="w-full px-3.5 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-none font-medium"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDocumentModalProject(null)}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newDocName.trim()) {
                    const saved = saveDocument({
                      project_id: documentModalProject,
                      name: newDocName.trim(),
                      description: newDocDesc.trim()
                    });
                    onSelectProject(documentModalProject);
                    onSelectDocument(saved.id);
                    setNewDocName('');
                    setNewDocDesc('');
                    setDocumentModalProject(null);
                  }
                }}
                className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Create File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT ACTIONS MODAL */}
      {documentActionMenu && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setDocumentActionMenu(null)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 max-w-xs w-full shadow-2xl space-y-1 text-xs" onClick={e => e.stopPropagation()}>
            <h4 className="font-bold text-[#3B2A1D] pb-1.5 border-b border-[#F5EDE4] mb-1.5 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#8B5A2B]" /> Document Actions
            </h4>
            <button
              onClick={() => {
                onSelectDocument(documentActionMenu.docId);
                onSelectTab('Projects');
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#8B5A2B]" /> Open Document
            </button>
            <button
              onClick={() => {
                const doc = getDocumentsAll().find(d => d.id === documentActionMenu.docId);
                if (doc) {
                  const val = prompt('Rename Document:', doc.name);
                  if (val && val.trim()) {
                    saveDocument({ ...doc, name: val.trim() });
                    onSelectProject(documentActionMenu.projectId); 
                  }
                }
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#7A6A5A]" /> Rename File
            </button>
            <button
              onClick={() => {
                duplicateDocument(documentActionMenu.docId);
                onSelectProject(documentActionMenu.projectId);
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <Copy className="w-3.5 h-3.5 text-[#7A6A5A]" /> Duplicate File
            </button>
            <button
              onClick={() => {
                const doc = getDocumentsAll().find(d => d.id === documentActionMenu.docId);
                if (doc) {
                  const otherProjs = projects.filter(p => p.id !== documentActionMenu.projectId);
                  if (otherProjs.length === 0) {
                    alert('No other projects available to move this document to.');
                  } else {
                    const names = otherProjs.map((p, i) => `${i + 1}. ${p.project_name}`).join('\n');
                    const num = prompt(`Move to which project?\n${names}\nEnter project number:`);
                    const idx = num ? parseInt(num) - 1 : -1;
                    if (idx >= 0 && idx < otherProjs.length) {
                      const targetProj = otherProjs[idx];
                      saveDocument({ ...doc, project_id: targetProj.id });
                      const cases = getTestCases(doc.id);
                      cases.forEach(tc => saveTestCase({ ...tc, project_id: targetProj.id, document_id: doc.id }));
                      onSelectProject(targetProj.id);
                      onSelectDocument(doc.id);
                    }
                  }
                }
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-[#FFF4E8] rounded-lg font-semibold text-[#3B2A1D] flex items-center gap-2"
            >
              <Move className="w-3.5 h-3.5 text-[#7A6A5A]" /> Move to Project...
            </button>
            <button
              onClick={() => {
                if (confirm('Move this document and its test cases to the Recycle Bin?')) {
                  deleteDocument(documentActionMenu.docId);
                  onSelectProject(documentActionMenu.projectId);
                }
                setDocumentActionMenu(null);
              }}
              className="w-full text-left px-3 py-2 hover:bg-red-50 rounded-lg font-bold text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" /> Delete Document
            </button>
            <button onClick={() => setDocumentActionMenu(null)} className="w-full text-center py-1.5 border border-[#E7D6C4] hover:bg-gray-50 rounded-lg text-[#7A6A5A] mt-2 font-bold">
              Close Menu
            </button>
          </div>
        </div>
      )}
      {/* PROJECT DETAILS MODAL */}
      {projectDetailsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setProjectDetailsModal(null)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-3 border-b border-[#F5EDE4] pb-3">
              <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-[#3B2A1D] truncate">{projectDetailsModal.project_name}</h3>
                <p className="text-xs text-[#7A6A5A] truncate">Project Details</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Version</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0.0"
                  value={editedVersion}
                  onChange={e => setEditedVersion(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Developer Assigned</label>
                <select
                  value={editedDeveloper}
                  onChange={e => setEditedDeveloper(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-none"
                >
                  <option value="">-- None --</option>
                  {users.filter(u => u.role?.toLowerCase().trim() === 'developer' || u.role?.toLowerCase().trim() === 'intern').map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} {u.email && !u.email.includes('unknown') ? `(${u.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Vercel Link</label>
                <input
                  type="url"
                  placeholder="https://your-project.vercel.app"
                  value={editedVercelLink}
                  onChange={e => setEditedVercelLink(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-none"
                />
                {editedVercelLink && (
                  <a href={editedVercelLink} target="_blank" rel="noopener noreferrer" className="inline-block mt-1 text-[10px] text-[#8B5A2B] hover:underline">
                    ↗ Open Link
                  </a>
                )}
              </div>
              <div className="space-y-1 pt-1">
                <label className="text-[10px] uppercase font-bold text-[#7A6A5A] tracking-wider">Project ZIP File</label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="file"
                      accept=".zip,.rar,.7z"
                      id="zip-upload"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          setEditedZipFileName(file.name);
                          
                          // Read file as Base64 string for database storage
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            if (typeof reader.result === 'string') {
                              setEditedZipFileData(reader.result);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <label 
                      htmlFor="zip-upload" 
                      className="w-full px-3 py-2 border border-dashed border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#7A6A5A] flex items-center justify-between cursor-pointer hover:bg-[#FFF4E8] transition-colors"
                    >
                      <span className="truncate mr-2 text-[#3B2A1D] font-semibold">{editedZipFileName || 'No file selected...'}</span>
                      <Upload className="w-3.5 h-3.5 text-[#8B5A2B] shrink-0" />
                    </label>
                  </div>
                  {editedZipFileName && (
                    <button
                      type="button"
                      onClick={handleDownloadZip}
                      title="Download ZIP"
                      className="p-2 border border-[#E7D6C4] rounded-xl hover:bg-[#FFF4E8] text-[#8B5A2B] shrink-0"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {currentUser && ['admin', 'team_lead', 'developer'].includes(currentUser.role) && (
                <div className="space-y-3 pt-3 border-t border-[#F5EDE4]">
                  <h4 className="text-[10px] uppercase font-bold text-[#8B5A2B] tracking-wider">Manage Team</h4>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#7A6A5A]">Assign Tester</label>
                    <select
                      value={editedTesterId}
                      onChange={e => setEditedTesterId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B]"
                    >
                      <option value="">-- None --</option>
                      {users.filter(u => u.role?.toLowerCase().trim() === 'tester').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.email && !u.email.includes('unknown') ? `(${u.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-[#7A6A5A]">Assign Intern (Dev)</label>
                    <select
                      value={editedInternId}
                      onChange={e => setEditedInternId(e.target.value)}
                      className="w-full px-3 py-1.5 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B]"
                    >
                      <option value="">-- None --</option>
                      {users.filter(u => u.role?.toLowerCase().trim() === 'intern').map(u => (
                        <option key={u.id} value={u.id}>
                          {u.name} {u.email && !u.email.includes('unknown') ? `(${u.email})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-[#F5EDE4]">
              <button
                type="button"
                onClick={() => {
                  setProjectDetailsModal(null);
                  onSelectProject(projectDetailsModal.id);
                  const docs = getDocuments(projectDetailsModal.id);
                  if (docs.length > 0) onSelectDocument(docs[0].id);
                  onSelectTab('Projects');
                }}
                className="text-xs font-bold text-[#8B5A2B] hover:text-[#A66B37]"
              >
                Open Workspace →
              </button>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setProjectDetailsModal(null)}
                  className="px-3 py-1.5 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProjectDetails}
                  className="px-3 py-1.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* SHEETS / DOCUMENTS POPUP */}
      {selectedProjectForDocs && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in p-4" onClick={() => setSelectedProjectForDocs(null)}>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#F5EDE4] pb-3 shrink-0 gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-[#FFF4E8] text-[#8B5A2B] rounded-xl shrink-0">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-extrabold text-[#3B2A1D] truncate pr-2">{selectedProjectForDocs.project_name}</h3>
                  <p className="text-xs text-[#7A6A5A] truncate">Sheets & Documents</p>
                </div>
              </div>
              <button
                onClick={() => setDocumentModalProject(selectedProjectForDocs.id)}
                className="px-3 py-1.5 bg-[#8B5A2B] hover:bg-[#A66B37] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors shrink-0 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" /> Add Sheet
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 pr-1 custom-scrollbar space-y-2">
              {(() => {
                const docs = getDocuments(selectedProjectForDocs.id);
                if (docs.length === 0) {
                  return (
                    <div className="text-center py-8 text-xs text-[#7A6A5A]/60 italic bg-white border border-dashed border-[#E7D6C4] rounded-xl">
                      No sheets added yet.
                    </div>
                  );
                }
                return docs.map(doc => {
                  const docCases = getTestCases(doc.id).length;
                  const versionMatch = doc.name.match(/V(\d+)/i);
                  const versionTag = versionMatch ? `V${versionMatch[1]}` : null;

                  return (
                    <div 
                      key={doc.id}
                      onClick={() => { 
                        onSelectProject(selectedProjectForDocs.id); 
                        onSelectDocument(doc.id); 
                        onSelectTab('Projects'); 
                      }}
                      className="group/doc flex items-center justify-between p-3 rounded-xl hover:bg-[#FDFBF9] border border-[#E7D6C4]/60 hover:border-[#8B5A2B]/40 cursor-pointer transition-all"
                    >
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#8B5A2B]/70 shrink-0" />
                          <span className="text-sm font-bold text-[#3B2A1D] truncate">{doc.name}</span>
                        </div>
                        {doc.description && (
                          <span className="text-xs text-[#7A6A5A] truncate mt-1 ml-6">{doc.description}</span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        {versionTag && (
                          <span className="text-[10px] text-[#8B5A2B] bg-[#FFF4E8] px-2 py-0.5 rounded-md font-bold border border-[#F5EDE4]">
                            {versionTag}
                          </span>
                        )}
                        <span className="text-[10px] text-[#555] bg-gray-100 px-2 py-0.5 rounded-md font-bold">
                          {docCases} cases
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDocumentActionMenu({ docId: doc.id, projectId: selectedProjectForDocs.id }); }}
                          className="p-1 rounded hover:bg-gray-200 text-[#7A6A5A] transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-3 border-t border-[#F5EDE4] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProjectForDocs(null)}
                className="px-4 py-2 border border-[#E7D6C4] text-[#7A6A5A] text-xs font-semibold rounded-xl hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
