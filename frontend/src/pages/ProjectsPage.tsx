import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  FolderOpen,
  Folder,
  Plus,
  MoreVertical,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Users,
  FileText,
  Contact,
  File,
  Award,
  Upload,
  Download,
  X,
  Calendar,
  Mail,
  Play,
  Pause,
  ArrowLeft,
  StickyNote,
  Database
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface Project {
  id: string;
  nome: string;
  descrizione?: string;
  colore?: string;
  stato: string;
  progresso: number;
  isActive: boolean;
  isFolder: boolean;
  parentId?: string;
  rewardPoints: number;
  rewardDistributed: boolean;
  owner: {
    id: string;
    nome: string;
    cognome: string;
  };
  memberIds: string[];
  _count: {
    tasks: number;
    notes: number;
    contacts: number;
    documents: number;
    events?: number;
    emails?: number;
    subProjects: number;
  };
  dataInizio?: string;
  scadenza?: string;
  createdAt: string;
  tasks?: any[];
  notes?: any[];
  documents?: any[];
  events?: any[];
  emails?: any[];
}

interface Document {
  id: string;
  nome: string;
  descrizione?: string;
  tipo: string;
  dimensione: number;
  url: string;
  mimeType: string;
  createdAt: string;
}

const ProjectsPage: React.FC = () => {
  const { user } = useAuth();
  const [progetti, setProgetti] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isFolder, setIsFolder] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  // Selected project for detail view
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'documents' | 'contacts' | 'notes' | 'events' | 'emails' | 'crm'>('tasks');

  // Documents state
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedProjectForDocs, setSelectedProjectForDocs] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Task creation state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({
    titolo: '',
    descrizione: '',
    priorita: 'medium',
    difficolta: 3,
    scadenza: ''
  });

  // Note creation state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    titolo: '',
    contenuto: ''
  });

  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    colore: '#3B82F6',
    rewardPoints: 50,
    dataInizio: '',
    scadenza: ''
  });

  const token = localStorage.getItem('token');

  // Check if user is admin
  const userAny = user as any;
  const isAdmin = userAny?.role?.nome === "Admin" || userAny?.role?.permessi?.isAdmin === true;

  useEffect(() => {
    loadProgetti();
  }, []);

  const loadProgetti = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProgetti(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dei progetti:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await axios.post(
        `${API_URL}/projects`,
        {
          ...formData,
          isFolder,
          parentId: selectedParent
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowCreateModal(false);
      resetForm();
      loadProgetti();
    } catch (error: any) {
      console.error('Errore nella creazione del progetto:', error);
      alert(error.response?.data?.error || 'Errore nella creazione del progetto');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingProject) return;

    try {
      await axios.put(
        `${API_URL}/projects/${editingProject.id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setEditingProject(null);
      resetForm();
      loadProgetti();
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento del progetto:', error);
      alert(error.response?.data?.error || 'Errore nell\'aggiornamento del progetto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo progetto/cartella?')) return;

    try {
      await axios.delete(`${API_URL}/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadProgetti();
    } catch (error: any) {
      console.error('Errore nell\'eliminazione del progetto:', error);
      alert(error.response?.data?.error || 'Errore nell\'eliminazione del progetto');
    }
  };

  const handleComplete = async (id: string) => {
    if (!confirm('Completare il progetto? I premi verranno distribuiti automaticamente al team.')) return;

    try {
      await axios.post(
        `${API_URL}/projects/${id}/complete`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      loadProgetti();
      alert('Progetto completato! I premi sono stati distribuiti.');
    } catch (error: any) {
      console.error('Errore nel completamento del progetto:', error);
      alert(error.response?.data?.error || 'Errore nel completamento del progetto');
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      descrizione: '',
      colore: '#3B82F6',
      rewardPoints: 50,
      dataInizio: '',
      scadenza: ''
    });
    setIsFolder(false);
    setSelectedParent(null);
  };

  // Load project detail with all contents
  const loadProjectDetail = async (projectId: string) => {
    try {
      setLoadingProject(true);
      const response = await axios.get(`${API_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedProject(response.data);
    } catch (error) {
      console.error('Errore nel caricamento del progetto:', error);
    } finally {
      setLoadingProject(false);
    }
  };

  // Toggle project active status
  const handleToggleActive = async (projectId: string) => {
    try {
      await axios.post(
        `${API_URL}/projects/${projectId}/toggle-active`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Reload project detail if it's the selected one
      if (selectedProject && selectedProject.id === projectId) {
        await loadProjectDetail(projectId);
      }
      // Reload list
      await loadProgetti();
    } catch (error: any) {
      console.error('Errore nel toggle del progetto:', error);
      alert(error.response?.data?.error || 'Errore nel toggle del progetto');
    }
  };

  // Documents functions
  const openDocumentsModal = async (project: Project) => {
    setSelectedProjectForDocs(project);
    setShowDocumentsModal(true);
    await loadDocuments(project.id);
  };

  const loadDocuments = async (projectId: string) => {
    try {
      const response = await axios.get(`${API_URL}/documents/project/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(response.data);
    } catch (error) {
      console.error('Errore nel caricamento documenti:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProjectForDocs) return;

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', file);

      await axios.post(
        `${API_URL}/documents/project/${selectedProjectForDocs.id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      await loadDocuments(selectedProjectForDocs.id);
      await loadProgetti(); // Reload per aggiornare il contatore
      e.target.value = ''; // Reset input
    } catch (error: any) {
      console.error('Errore nel caricamento file:', error);
      alert(error.response?.data?.error || 'Errore nel caricamento file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      await axios.delete(`${API_URL}/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (selectedProjectForDocs) {
        await loadDocuments(selectedProjectForDocs.id);
        await loadProgetti();
      }
    } catch (error: any) {
      console.error('Errore nell\'eliminazione documento:', error);
      alert(error.response?.data?.error || 'Errore nell\'eliminazione documento');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Task functions
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await axios.post(
        `${API_URL}/tasks`,
        {
          ...taskForm,
          progettoId: selectedProject.id,
          scadenza: taskForm.scadenza ? new Date(taskForm.scadenza) : null
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowTaskModal(false);
      setTaskForm({ titolo: '', descrizione: '', priorita: 'medium', difficolta: 3, scadenza: '' });
      await loadProjectDetail(selectedProject.id);
      await loadProgetti();
    } catch (error: any) {
      console.error('Errore nella creazione della task:', error);
      alert(error.response?.data?.error || 'Errore nella creazione della task');
    }
  };

  // Note functions
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;

    try {
      await axios.post(
        `${API_URL}/notes`,
        {
          ...noteForm,
          progettoId: selectedProject.id
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowNoteModal(false);
      setNoteForm({ titolo: '', contenuto: '' });
      await loadProjectDetail(selectedProject.id);
      await loadProgetti();
    } catch (error: any) {
      console.error('Errore nella creazione della nota:', error);
      alert(error.response?.data?.error || 'Errore nella creazione della nota');
    }
  };

  const startEdit = (project: Project) => {
    setEditingProject(project);
    setFormData({
      nome: project.nome,
      descrizione: project.descrizione || '',
      colore: project.colore || '#3B82F6',
      rewardPoints: project.rewardPoints,
      dataInizio: project.dataInizio ? new Date(project.dataInizio).toISOString().split('T')[0] : '',
      scadenza: project.scadenza ? new Date(project.scadenza).toISOString().split('T')[0] : ''
    });
  };

  const getStatusColor = (stato: string) => {
    switch (stato) {
      case 'completed':
        return 'bg-green-500/20 text-green-400';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400';
      case 'archived':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-indigo-500/20 text-indigo-400';
    }
  };

  const getStatusLabel = (stato: string) => {
    switch (stato) {
      case 'completed':
        return 'Completato';
      case 'in_progress':
        return 'In corso';
      case 'archived':
        return 'Archiviato';
      default:
        return stato;
    }
  };

  // Raggruppa progetti per parent
  const folders = progetti.filter(p => p.isFolder);
  const rootProjects = progetti.filter(p => !p.isFolder && !p.parentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-400">Caricamento progetti...</div>
      </div>
    );
  }

  // Se c'è un progetto selezionato, mostra il dettaglio
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header con back button */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedProject(null)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white">{selectedProject.nome}</h1>
              {selectedProject.descrizione && (
                <p className="text-gray-400 mt-2">{selectedProject.descrizione}</p>
              )}
            </div>
            <button
              onClick={() => handleToggleActive(selectedProject.id)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                selectedProject.isActive
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {selectedProject.isActive ? (
                <>
                  <Pause className="w-5 h-5" />
                  Disattiva Progetto
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Attiva Progetto
                </>
              )}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-indigo-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span className="text-sm text-gray-400">Task</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedProject.tasks?.length || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <StickyNote className="w-5 h-5 text-purple-400" />
                <span className="text-sm text-gray-400">Note</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedProject.notes?.length || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <File className="w-5 h-5 text-blue-400" />
                <span className="text-sm text-gray-400">Documenti</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedProject.documents?.length || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Contact className="w-5 h-5 text-green-400" />
                <span className="text-sm text-gray-400">Contatti</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedProject.memberIds?.length || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-gray-400">Eventi</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedProject.events?.length || 0}</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-5 h-5 text-red-400" />
                <span className="text-sm text-gray-400">Email</span>
              </div>
              <p className="text-2xl font-bold text-white">{selectedProject.emails?.length || 0}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-slate-800/50 rounded-xl border border-indigo-500/20 overflow-hidden">
            {/* Tab Headers */}
            <div className="flex items-center gap-2 p-2 border-b border-slate-700 overflow-x-auto">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'tasks' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                Task ({selectedProject.tasks?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'documents' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <File className="w-4 h-4" />
                Documenti ({selectedProject.documents?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'contacts' ? 'bg-green-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <Contact className="w-4 h-4" />
                Contatti ({selectedProject.memberIds?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'notes' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <StickyNote className="w-4 h-4" />
                Note ({selectedProject.notes?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'events' ? 'bg-amber-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Eventi ({selectedProject.events?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('emails')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'emails' ? 'bg-red-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <Mail className="w-4 h-4" />
                Email ({selectedProject.emails?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('crm')}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'crm' ? 'bg-cyan-600 text-white' : 'text-gray-400 hover:bg-slate-700'
                }`}
              >
                <Database className="w-4 h-4" />
                CRM
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {activeTab === 'tasks' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Task del Progetto</h3>
                    <button
                      onClick={() => setShowTaskModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Nuova Task
                    </button>
                  </div>
                  {selectedProject.tasks && selectedProject.tasks.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.tasks.map((task: any) => (
                        <div key={task.id} className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-white font-medium">{task.titolo}</p>
                          <p className="text-gray-400 text-sm">{task.descrizione}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">Nessuna task ancora</p>
                      <p className="text-gray-500 text-sm">Crea la prima task per questo progetto</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Documenti del Progetto</h3>
                    <button
                      onClick={() => openDocumentsModal(selectedProject)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Aggiungi Documento
                    </button>
                  </div>
                  {selectedProject.documents && selectedProject.documents.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.documents.map((doc: any) => (
                        <div key={doc.id} className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-white font-medium">{doc.nome}</p>
                          <p className="text-gray-400 text-sm">{doc.tipo}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <File className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">Nessun documento ancora</p>
                      <p className="text-gray-500 text-sm">Aggiungi il primo documento dal Drive o carica un nuovo file</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'contacts' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Contatti del Progetto</h3>
                    <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Aggiungi Contatto
                    </button>
                  </div>
                  <div className="text-center py-12">
                    <Contact className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">Funzionalità in arrivo</p>
                    <p className="text-gray-500 text-sm">Gestione contatti del progetto</p>
                  </div>
                </div>
              )}

              {activeTab === 'notes' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Note del Progetto</h3>
                    <button
                      onClick={() => setShowNoteModal(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Nuova Nota
                    </button>
                  </div>
                  {selectedProject.notes && selectedProject.notes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.notes.map((note: any) => (
                        <div key={note.id} className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-white font-medium">{note.titolo}</p>
                          <p className="text-gray-400 text-sm">{note.contenuto}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <StickyNote className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">Nessuna nota ancora</p>
                      <p className="text-gray-500 text-sm">Crea la prima nota per questo progetto</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Eventi del Progetto</h3>
                    <button className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Nuovo Evento
                    </button>
                  </div>
                  {selectedProject.events && selectedProject.events.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.events.map((event: any) => (
                        <div key={event.id} className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-white font-medium">{event.titolo}</p>
                          <p className="text-gray-400 text-sm">{event.descrizione}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Calendar className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">Nessun evento ancora</p>
                      <p className="text-gray-500 text-sm">Crea il primo evento per questo progetto</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'emails' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Email del Progetto</h3>
                    <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2">
                      <Plus className="w-5 h-5" />
                      Nuova Email
                    </button>
                  </div>
                  {selectedProject.emails && selectedProject.emails.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProject.emails.map((email: any) => (
                        <div key={email.id} className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-white font-medium">{email.oggetto}</p>
                          <p className="text-gray-400 text-sm">{email.corpo}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Mail className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                      <p className="text-gray-400">Nessuna email ancora</p>
                      <p className="text-gray-500 text-sm">Le email collegate a questo progetto appariranno qui</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'crm' && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">CRM del Progetto</h3>
                    <button
                      onClick={() => {
                        // TODO: Aprire modal per collegare CRM esistente o crearne uno nuovo
                        alert('Funzionalità in arrivo: collega un CRM esistente o creane uno nuovo per questo progetto');
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-5 h-5" />
                      Collega CRM
                    </button>
                  </div>
                  <div className="text-center py-12">
                    <Database className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400">Nessun CRM collegato</p>
                    <p className="text-gray-500 text-sm">
                      Collega un CRM esistente o creane uno nuovo per tracciare clienti, investimenti, leads e altro ancora all'interno di questo progetto
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Progetti</h1>
            <p className="text-gray-400">
              Gestisci i progetti e le cartelle del tuo team
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                resetForm();
                setIsFolder(true);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Folder className="w-5 h-5" />
              Nuova Cartella
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsFolder(false);
                setShowCreateModal(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuovo Progetto
            </button>
          </div>
        </div>
      </div>

      {/* Cartelle */}
      {folders.length > 0 && (
        <div className="max-w-7xl mx-auto mb-8">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <Folder className="w-6 h-6 text-purple-400" />
            Cartelle
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map(folder => (
              <div
                key={folder.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-6 hover:border-purple-500/40 transition-all cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-purple-600/20 rounded-lg">
                      <Folder className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-purple-400 transition-colors">
                        {folder.nome}
                      </h3>
                      <p className="text-sm text-gray-400">{folder._count.subProjects} progetti</p>
                    </div>
                  </div>
                  <div className="relative">
                    <button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
                {folder.descrizione && (
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">{folder.descrizione}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progetti Root */}
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-indigo-400" />
          Progetti
        </h2>

        {rootProjects.length === 0 ? (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-12 text-center">
            <FolderOpen className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Nessun progetto</h3>
            <p className="text-gray-400 mb-6">
              Inizia creando il tuo primo progetto
            </p>
            <button
              onClick={() => {
                resetForm();
                setIsFolder(false);
                setShowCreateModal(true);
              }}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crea Progetto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {rootProjects.map(project => (
              <div
                key={project.id}
                onClick={() => loadProjectDetail(project.id)}
                className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6 hover:border-indigo-500/40 transition-all cursor-pointer"
                style={{ borderColor: `${project.colore}40` }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-semibold text-white">{project.nome}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(project.stato)}`}>
                        {getStatusLabel(project.stato)}
                      </span>
                    </div>
                    {project.descrizione && (
                      <p className="text-sm text-gray-400 line-clamp-2">{project.descrizione}</p>
                    )}
                  </div>
                  <div className="relative flex gap-2">
                    {project.stato === 'in_progress' && !project.rewardDistributed && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleComplete(project.id);
                        }}
                        className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                        title="Completa progetto"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(project);
                      }}
                      className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.id);
                      }}
                      className="p-2 hover:bg-red-600/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-400">Progresso</span>
                    <span className="text-sm font-semibold text-indigo-400">{project.progresso}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300"
                      style={{ width: `${project.progresso}%` }}
                    />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-indigo-400" />
                      <span className="text-xs text-gray-400">Task</span>
                    </div>
                    <p className="text-lg font-bold text-white">{project._count.tasks}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Note</span>
                    </div>
                    <p className="text-lg font-bold text-white">{project._count.notes}</p>
                  </div>
                  <div className="bg-slate-900/50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Contact className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-400">Contatti</span>
                    </div>
                    <p className="text-lg font-bold text-white">{project._count.contacts}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openDocumentsModal(project);
                    }}
                    className="bg-slate-900/50 rounded-lg p-3 hover:bg-slate-800/70 transition-colors w-full text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <File className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Docs</span>
                    </div>
                    <p className="text-lg font-bold text-white">{project._count.documents}</p>
                  </button>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-700">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users className="w-4 h-4" />
                      <span>{project.memberIds.length} membri</span>
                    </div>
                    {project.scadenza && (
                      <div className="flex items-center gap-1 text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>{new Date(project.scadenza).toLocaleDateString('it-IT')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 font-semibold">
                    <Award className="w-4 h-4" />
                    <span>{project.rewardPoints} pts</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Creazione/Modifica */}
      {(showCreateModal || editingProject) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingProject ? 'Modifica Progetto' : isFolder ? 'Nuova Cartella' : 'Nuovo Progetto'}
            </h2>
            <form onSubmit={editingProject ? handleUpdate : handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Nome *
                </label>
                <input
                  type="text"
                  required
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {!isFolder && !editingProject && (
                <>
                  <div className={`grid ${isAdmin ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Colore
                      </label>
                      <input
                        type="color"
                        value={formData.colore}
                        onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
                        className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
                      />
                    </div>
                    {isAdmin && (
                      <div>
                        <label className="block text-sm font-semibold text-gray-300 mb-2">
                          Punti Premio (default: 50)
                        </label>
                        <input
                          type="number"
                          value={formData.rewardPoints}
                          onChange={(e) => setFormData({ ...formData, rewardPoints: parseInt(e.target.value) })}
                          min="0"
                          className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Data Inizio
                      </label>
                      <input
                        type="date"
                        value={formData.dataInizio}
                        onChange={(e) => setFormData({ ...formData, dataInizio: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-300 mb-2">
                        Scadenza
                      </label>
                      <input
                        type="date"
                        value={formData.scadenza}
                        onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
                        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingProject(null);
                    resetForm();
                  }}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                >
                  {editingProject ? 'Salva' : 'Crea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Documenti */}
      {showDocumentsModal && selectedProjectForDocs && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <File className="w-6 h-6 text-blue-400" />
                  Documenti - {selectedProjectForDocs.nome}
                </h2>
                <p className="text-gray-400 text-sm mt-1">{documents.length} file caricati</p>
              </div>
              <button
                onClick={() => {
                  setShowDocumentsModal(false);
                  setSelectedProjectForDocs(null);
                  setDocuments([]);
                }}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            {/* Upload Section */}
            <div className="mb-6">
              <label className="flex items-center justify-center gap-2 px-6 py-4 bg-indigo-600/20 hover:bg-indigo-600/30 border-2 border-dashed border-indigo-500/50 rounded-lg cursor-pointer transition-colors">
                <Upload className="w-5 h-5 text-indigo-400" />
                <span className="text-indigo-400 font-semibold">
                  {uploadingFile ? 'Caricamento in corso...' : 'Clicca per caricare file'}
                </span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                  accept="*/*"
                />
              </label>
              <p className="text-gray-500 text-xs mt-2 text-center">
                Supporta tutti i tipi di file (PDF, immagini, video, audio, archivi, ecc.) - Max 50MB
              </p>
            </div>

            {/* Documents List */}
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <File className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                <p className="text-gray-400">Nessun documento caricato</p>
                <p className="text-gray-500 text-sm">Inizia caricando il tuo primo file</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className="bg-slate-900/50 rounded-lg p-4 flex items-center justify-between hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="p-2 bg-blue-600/20 rounded-lg">
                        <File className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{doc.nome}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>{formatFileSize(doc.dimensione)}</span>
                          <span>•</span>
                          <span>{new Date(doc.createdAt).toLocaleDateString('it-IT')}</span>
                          <span>•</span>
                          <span className="px-2 py-0.5 bg-slate-700 rounded">{doc.tipo.toUpperCase()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={`${API_URL.replace('/api', '')}${doc.url}`}
                        download
                        className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Task */}
      {showTaskModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nuova Task - {selectedProject.nome}</h2>
              <button onClick={() => setShowTaskModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Titolo *</label>
                <input
                  type="text"
                  required
                  value={taskForm.titolo}
                  onChange={(e) => setTaskForm({ ...taskForm, titolo: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Descrizione</label>
                <textarea
                  value={taskForm.descrizione}
                  onChange={(e) => setTaskForm({ ...taskForm, descrizione: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Priorità</label>
                  <select
                    value={taskForm.priorita}
                    onChange={(e) => setTaskForm({ ...taskForm, priorita: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="bassa">Bassa</option>
                    <option value="medium">Media</option>
                    <option value="alta">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">Difficoltà (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={taskForm.difficolta}
                    onChange={(e) => setTaskForm({ ...taskForm, difficolta: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Scadenza</label>
                <input
                  type="date"
                  value={taskForm.scadenza}
                  onChange={(e) => setTaskForm({ ...taskForm, scadenza: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowTaskModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Crea Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Note */}
      {showNoteModal && selectedProject && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-xl p-6 max-w-2xl w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Nuova Nota - {selectedProject.nome}</h2>
              <button onClick={() => setShowNoteModal(false)} className="p-2 hover:bg-slate-700 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleCreateNote} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Titolo *</label>
                <input
                  type="text"
                  required
                  value={noteForm.titolo}
                  onChange={(e) => setNoteForm({ ...noteForm, titolo: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Contenuto *</label>
                <textarea
                  required
                  value={noteForm.contenuto}
                  onChange={(e) => setNoteForm({ ...noteForm, contenuto: e.target.value })}
                  rows={6}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Scrivi qui la tua nota..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Crea Nota
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
