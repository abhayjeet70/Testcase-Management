import React, { useState } from 'react';
import { 
  Folder, Plus, Search, MoreVertical, Edit3, Copy, Trash2, 
  FileText, Star, FolderOpen, Move, Upload, Download 
} from 'lucide-react';
import { Project } from '../../types';
import { supabase } from '../../lib/supabase';
import { 
  getDocuments, saveDocument, deleteDocument, duplicateDocument, 
  getDocumentsAll, getTestCasesByProject, getTestCases, saveTestCase, saveProject 
} from '../../utils/storage';
import ArchiveFavoritesPanel from './ArchiveFavoritesPanel';

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

  // Project details modal state
  const [projectDetailsModal, setProjectDetailsModal] = useState<Project | null>(null);
  const [editedVersion, setEditedVersion] = useState('');
  const [editedDeveloper, setEditedDeveloper] = useState('');
  const [editedVercelLink, setEditedVercelLink] = useState('');
  const [editedZipFileName, setEditedZipFileName] = useState('');
  const [editedZipFileData, setEditedZipFileData] = useState('');

  const openProjectDetails = (p: Project) => {
    setEditedVersion(p.version || '');
    setEditedDeveloper(p.developer || '');
    setEditedVercelLink(p.vercel_link || '');
    setEditedZipFileName(p.zip_file_name || '');
    setEditedZipFileData(p.zip_file_data || '');
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
        zip_file_name: editedZipFileName
      };
      
      if (editedZipFileData) {
        payload.zip_file_data = editedZipFileData;
      }

      saveProject(payload);
      setProjectDetailsModal(null);
      // Trigger a refresh (a hack since projects are passed via props)
      onRenameProject(projectDetailsModal.id, projectDetailsModal.project_name);
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
    
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = editedZipFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3B2A1D] tracking-tight flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-[#8B5A2B]" />
            Workspace Projects
          </h1>
          <p className="text-sm text-[#7A6A5A] mt-1">Manage all your testing suites, documents, and files.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-[#8B5A2B] hover:bg-[#A66B37] text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Create New Project
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* LEFT COLUMN: Archive & Favorites & Search */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-[#7A6A5A]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={projSearch}
              onChange={e => setProjSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-[#E7D6C4] bg-white rounded-xl text-sm text-[#3B2A1D] placeholder-[#7A6A5A]/50 focus:outline-none focus:ring-2 focus:ring-[#8B5A2B] transition-all shadow-sm"
            />
          </div>
          <div className="bg-white border border-[#E7D6C4] rounded-2xl p-4 shadow-sm">
            <ArchiveFavoritesPanel
              selectedProjectId={selectedProjectId}
              onSelectProject={onSelectProject}
              onSelectDocument={onSelectDocument}
              onSelectTab={onSelectTab}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Projects Grid */}
        <div className="md:col-span-3 space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((p) => {
                const docs = getDocuments(p.id);
                const totalCases = getTestCasesByProject(p.id);
                const isMenuOpen = activeMenuId === p.id;

                return (
                  <div key={p.id} className="bg-white border border-[#E7D6C4] rounded-2xl shadow-sm hover:shadow-md transition-shadow group flex flex-col relative">
                    <div className="p-4 border-b border-[#F5EDE4] flex items-start justify-between">
                      <div 
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => openProjectDetails(p)}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Folder className="w-5 h-5 text-[#8B5A2B] shrink-0" />
                          <h3 className="font-bold text-[#3B2A1D] truncate text-sm">{p.project_name}</h3>
                          {p.favorite && <Star className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623] shrink-0" />}
                        </div>
                        <p className="text-xs text-[#7A6A5A] line-clamp-1 mb-1">{p.description || 'No description provided.'}</p>
                        <div className="flex items-center gap-1.5 flex-wrap mt-1">
                          {p.version && (
                            <div className="text-[10px] bg-[#FFF4E8] text-[#8B5A2B] px-1.5 py-0.5 rounded font-bold">
                              {p.version}
                            </div>
                          )}
                          {p.developer && (
                            <div className="text-[10px] bg-[#FFF4E8] text-[#8B5A2B] px-1.5 py-0.5 rounded font-bold">
                              Dev: {p.developer}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Context Menu Button */}
                      <div className="relative shrink-0 ml-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setActiveMenuId(isMenuOpen ? null : p.id); }}
                          className="p-1.5 rounded-lg hover:bg-[#FFF8F2] text-[#7A6A5A] hover:text-[#3B2A1D]"
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
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-3 flex-1 bg-[#FDFBF9] flex flex-col">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-[10px] font-bold text-[#7A6A5A] uppercase tracking-wider">Documents ({docs.length})</span>
                        <button
                          onClick={() => setDocumentModalProject(p.id)}
                          className="text-[#8B5A2B] hover:text-[#A66B37] text-[10px] font-bold flex items-center gap-0.5"
                        >
                          <Plus className="w-3 h-3" /> Add File
                        </button>
                      </div>
                      <div className="flex-1 space-y-1 max-h-[150px] overflow-y-auto pr-1 custom-scrollbar">
                        {docs.length > 0 ? docs.map(doc => {
                          const docCases = getTestCases(doc.id).length;
                          return (
                            <div 
                              key={doc.id}
                              onClick={() => { onSelectProject(p.id); onSelectDocument(doc.id); onSelectTab('Projects'); }}
                              className="group/doc flex items-center justify-between p-2 rounded-lg hover:bg-white border border-transparent hover:border-[#E7D6C4] cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText className="w-3.5 h-3.5 text-[#8B5A2B]/70 shrink-0" />
                                <span className="text-xs font-semibold text-[#3B2A1D] truncate">{doc.name}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] text-[#7A6A5A] bg-[#FFF4E8] px-1.5 py-0.5 rounded-md">{docCases} cases</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDocumentActionMenu({ docId: doc.id, projectId: p.id }); }}
                                  className="opacity-0 group-hover/doc:opacity-100 p-0.5 rounded hover:bg-[#FFF4E8] text-[#7A6A5A] transition-opacity"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        }) : (
                          <div className="text-center py-4 text-xs text-[#7A6A5A]/60 italic bg-white border border-dashed border-[#E7D6C4] rounded-lg">
                            No documents yet.
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="p-3 border-t border-[#F5EDE4] bg-[#FFF8F2]/30 rounded-b-2xl text-[10px] font-semibold text-[#7A6A5A] flex justify-between items-center">
                      <span>Total Cases: {totalCases.length}</span>
                      <button 
                        onClick={() => {
                          onSelectProject(p.id);
                          if (docs.length > 0) onSelectDocument(docs[0].id);
                          onSelectTab('Projects');
                        }}
                        className="text-[#8B5A2B] hover:underline"
                      >
                        Open Workspace →
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full py-12 text-center bg-white border border-dashed border-[#E7D6C4] rounded-2xl flex flex-col items-center">
                <FolderOpen className="w-10 h-10 text-[#E7D6C4] mb-3" />
                <h3 className="text-sm font-bold text-[#3B2A1D]">No projects found</h3>
                <p className="text-xs text-[#7A6A5A] mt-1">Create a new project or adjust your search.</p>
              </div>
            )}
          </div>
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
                <input
                  type="text"
                  placeholder="e.g. Jane Doe"
                  value={editedDeveloper}
                  onChange={e => setEditedDeveloper(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E7D6C4] rounded-xl text-xs bg-[#FFF8F2]/30 text-[#3B2A1D] focus:ring-1 focus:ring-[#8B5A2B] focus:outline-none"
                />
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
    </div>
  );
}
