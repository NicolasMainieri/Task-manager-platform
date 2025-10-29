import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  HardDrive,
  Upload,
  Download,
  Trash2,
  Search,
  File,
  FileText,
  Image,
  Video,
  Music,
  Archive,
  FolderOpen,
  Folder as FolderIcon,
  Grid,
  List,
  Plus,
  X,
  Share2,
  Edit,
  Users,
  ChevronRight,
  Home
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Document {
  id: string;
  nome: string;
  descrizione?: string;
  tipo: string;
  dimensione?: number;
  url: string;
  mimeType?: string;
  folderId?: string;
  createdAt: string;
  updatedAt: string;
}

interface Folder {
  id: string;
  nome: string;
  descrizione?: string;
  colore: string;
  ownerId: string;
  owner: {
    id: string;
    nome: string;
    cognome: string;
  };
  sharedWith: FolderShare[];
  documents: Document[];
  subFolders?: Folder[];
  isOwner?: boolean;
}

interface FolderShare {
  id: string;
  userId: string;
  user: {
    id: string;
    nome: string;
    cognome: string;
    avatar?: string;
  };
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canShare: boolean;
}

interface User {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  avatar?: string;
}

const Drive: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFolderForShare, setSelectedFolderForShare] = useState<Folder | null>(null);

  // Form states
  const [newFolderData, setNewFolderData] = useState({ nome: '', descrizione: '', colore: '#3B82F6' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sharePermissions, setSharePermissions] = useState<{ [userId: string]: { canView: boolean; canEdit: boolean; canDelete: boolean; canShare: boolean } }>({});
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [foldersRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/folders`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_URL}/api/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      setFolders(foldersRes.data);
      setAllUsers(usersRes.data);

      // Se non siamo in una cartella, mostra i documenti root (senza cartella)
      if (!currentFolder) {
        // Qui possiamo aggiungere una chiamata per i documenti root se necessario
        setDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const openFolder = async (folder: Folder) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/folders/${folder.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentFolder(response.data);
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error opening folder:', error);
      alert('Errore nell\'apertura della cartella');
    }
  };

  const goToRoot = () => {
    setCurrentFolder(null);
    setDocuments([]);
  };

  const handleCreateFolder = async () => {
    if (!newFolderData.nome.trim()) {
      alert('Nome cartella obbligatorio');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/folders`,
        {
          ...newFolderData,
          parentFolderId: currentFolder?.id || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewFolderData({ nome: '', descrizione: '', colore: '#3B82F6' });
      setShowCreateFolderModal(false);
      fetchData();
      if (currentFolder) {
        openFolder(currentFolder);
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Errore nella creazione della cartella');
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Seleziona un file');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (currentFolder) {
      formData.append('folderId', currentFolder.id);
    }

    try {
      setUploadingFile(true);
      const token = localStorage.getItem('token');

      // Upload generico nel Drive (creiamo una nuova route)
      await axios.post(
        `${API_URL}/api/documents/drive/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      setSelectedFile(null);
      setShowUploadModal(false);
      if (currentFolder) {
        openFolder(currentFolder);
      } else {
        fetchData();
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Errore nel caricamento del file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleShare = async () => {
    if (!selectedFolderForShare || selectedUsers.length === 0) {
      alert('Seleziona almeno un utente');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Prepara i permessi per gli utenti selezionati
      const permissions = selectedUsers.reduce((acc, userId) => {
        const perms = sharePermissions[userId] || { canView: true, canEdit: false, canDelete: false, canShare: false };
        return { ...acc, [userId]: perms };
      }, {});

      await axios.post(
        `${API_URL}/api/folders/${selectedFolderForShare.id}/share`,
        {
          userIds: selectedUsers,
          permissions: sharePermissions[selectedUsers[0]] || { canView: true, canEdit: false, canDelete: false, canShare: false }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setShowShareModal(false);
      setSelectedFolderForShare(null);
      setSelectedUsers([]);
      setSharePermissions({});
      fetchData();
    } catch (error) {
      console.error('Error sharing folder:', error);
      alert('Errore nella condivisione della cartella');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa cartella e tutto il suo contenuto?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/folders/${folderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
      if (currentFolder?.id === folderId) {
        goToRoot();
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Errore nell\'eliminazione della cartella');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (currentFolder) {
        openFolder(currentFolder);
      } else {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Errore nell\'eliminazione del documento');
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}${doc.url}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.nome);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading document:', error);
      alert('Errore nel download del file');
    }
  };

  const getFileIcon = (tipo: string) => {
    switch (tipo) {
      case 'pdf':
      case 'doc':
      case 'xls':
        return FileText;
      case 'img':
        return Image;
      case 'video':
        return Video;
      case 'audio':
        return Music;
      case 'archive':
        return Archive;
      default:
        return File;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
    if (!sharePermissions[userId]) {
      setSharePermissions(prev => ({
        ...prev,
        [userId]: { canView: true, canEdit: false, canDelete: false, canShare: false }
      }));
    }
  };

  const updatePermission = (userId: string, permission: keyof FolderShare, value: boolean) => {
    setSharePermissions(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || { canView: true, canEdit: false, canDelete: false, canShare: false }),
        [permission]: value
      }
    }));
  };

  const filteredFolders = folders.filter(folder =>
    folder.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocuments = documents.filter(doc =>
    doc.nome.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Caricamento Drive...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <HardDrive className="w-8 h-8 text-indigo-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Drive</h1>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <button onClick={goToRoot} className="hover:text-indigo-600">
                  <Home className="w-4 h-4" />
                </button>
                {currentFolder && (
                  <>
                    <ChevronRight className="w-4 h-4" />
                    <span className="font-medium">{currentFolder.nome}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FolderIcon className="w-5 h-5" />
              Nuova Cartella
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Carica File
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Cerca cartelle e file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>
          <div className="flex border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {!currentFolder && filteredFolders.length === 0 && filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <HardDrive className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg mb-2">Il tuo Drive è vuoto</p>
          <p className="text-gray-400 text-sm">Crea una cartella o carica un file per iniziare</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="space-y-6">
          {/* Folders Section */}
          {(!currentFolder ? filteredFolders : currentFolder.subFolders || []).length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Cartelle</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {(!currentFolder ? filteredFolders : currentFolder.subFolders || []).map((folder) => (
                  <div
                    key={folder.id}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => openFolder(folder)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <FolderIcon className="w-10 h-10" style={{ color: folder.colore }} />
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {folder.isOwner && (
                          <button
                            onClick={() => {
                              setSelectedFolderForShare(folder);
                              setShowShareModal(true);
                            }}
                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Condividi"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>
                        )}
                        {folder.isOwner && (
                          <button
                            onClick={() => handleDeleteFolder(folder.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 mb-1 truncate" title={folder.nome}>
                      {folder.nome}
                    </h3>

                    {folder.descrizione && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{folder.descrizione}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{folder.documents?.length || 0} file</span>
                      {(folder.sharedWith?.length || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span>{folder.sharedWith?.length || 0}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {filteredDocuments.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">File</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDocuments.map((doc) => {
                  const FileIcon = getFileIcon(doc.tipo);

                  return (
                    <div
                      key={doc.id}
                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <FileIcon className="w-10 h-10 text-indigo-600" />
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Scarica"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Elimina"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-1 truncate" title={doc.nome}>
                        {doc.nome}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{formatFileSize(doc.dimensione)}</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dimensione</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Folders */}
              {(!currentFolder ? filteredFolders : currentFolder.subFolders || []).map((folder) => (
                <tr key={folder.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openFolder(folder)}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <FolderIcon className="w-6 h-6" style={{ color: folder.colore }} />
                      <div>
                        <p className="font-medium text-gray-900">{folder.nome}</p>
                        {folder.descrizione && <p className="text-xs text-gray-500">{folder.descrizione}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Cartella</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{folder.documents?.length || 0} file</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(folder.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2 justify-end">
                      {folder.isOwner && (
                        <button
                          onClick={() => {
                            setSelectedFolderForShare(folder);
                            setShowShareModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      )}
                      {folder.isOwner && (
                        <button
                          onClick={() => handleDeleteFolder(folder.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {/* Documents */}
              {filteredDocuments.map((doc) => {
                const FileIcon = getFileIcon(doc.tipo);
                return (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <FileIcon className="w-6 h-6 text-indigo-600" />
                        <p className="font-medium text-gray-900">{doc.nome}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 capitalize">{doc.tipo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatFileSize(doc.dimensione)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleDownload(doc)} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded">
                          <Download className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteDocument(doc.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nuova Cartella</h2>
              <button onClick={() => setShowCreateFolderModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {currentFolder && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    La cartella sarà creata dentro: <strong>{currentFolder.nome}</strong>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Cartella *</label>
                <input
                  type="text"
                  value={newFolderData.nome}
                  onChange={(e) => setNewFolderData({ ...newFolderData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Es: Documenti Importanti"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <textarea
                  value={newFolderData.descrizione}
                  onChange={(e) => setNewFolderData({ ...newFolderData, descrizione: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  rows={3}
                  placeholder="Descrizione opzionale..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colore</label>
                <div className="flex gap-2">
                  {['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'].map(color => (
                    <button
                      key={color}
                      onClick={() => setNewFolderData({ ...newFolderData, colore: color })}
                      className={`w-10 h-10 rounded-full border-2 ${newFolderData.colore === color ? 'border-gray-900' : 'border-gray-300'}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateFolderModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderData.nome.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  Crea Cartella
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Carica File</h2>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <label htmlFor="file-upload-drive" className="cursor-pointer">
                  <span className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : 'Clicca per selezionare un file'}
                  </span>
                  <input
                    id="file-upload-drive"
                    type="file"
                    className="hidden"
                    onChange={(e) => e.target.files && setSelectedFile(e.target.files[0])}
                  />
                </label>
              </div>

              {currentFolder && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    Il file sarà caricato in: <strong>{currentFolder.nome}</strong>
                  </p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowUploadModal(false); setSelectedFile(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleFileUpload}
                  disabled={!selectedFile || uploadingFile}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  {uploadingFile ? 'Caricamento...' : 'Carica'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Folder Modal */}
      {showShareModal && selectedFolderForShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Condividi: {selectedFolderForShare.nome}</h2>
              <button onClick={() => { setShowShareModal(false); setSelectedUsers([]); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="border border-gray-200 rounded-lg divide-y max-h-96 overflow-y-auto">
                {allUsers.filter(u => u.id !== selectedFolderForShare.ownerId).map(user => (
                  <div key={user.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <div>
                          <p className="font-medium text-gray-900">{user.nome} {user.cognome}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </div>

                    {selectedUsers.includes(user.id) && (
                      <div className="ml-7 mt-2 flex gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sharePermissions[user.id]?.canView !== false}
                            onChange={(e) => updatePermission(user.id, 'canView', e.target.checked)}
                            className="rounded"
                          />
                          <span>Visualizza</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sharePermissions[user.id]?.canEdit || false}
                            onChange={(e) => updatePermission(user.id, 'canEdit', e.target.checked)}
                            className="rounded"
                          />
                          <span>Modifica</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sharePermissions[user.id]?.canDelete || false}
                            onChange={(e) => updatePermission(user.id, 'canDelete', e.target.checked)}
                            className="rounded"
                          />
                          <span>Elimina</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sharePermissions[user.id]?.canShare || false}
                            onChange={(e) => updatePermission(user.id, 'canShare', e.target.checked)}
                            className="rounded"
                          />
                          <span>Condividi</span>
                        </label>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowShareModal(false); setSelectedUsers([]); }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={handleShare}
                  disabled={selectedUsers.length === 0}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  Condividi con {selectedUsers.length} {selectedUsers.length === 1 ? 'utente' : 'utenti'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drive;
