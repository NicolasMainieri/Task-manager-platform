import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Globe,
  Linkedin,
  Tag,
  Save,
  User,
  Briefcase,
  PhoneCall,
  Link2,
  FileText,
  FolderOpen,
  Calendar,
  CheckSquare,
  Eye,
  Upload,
  Download,
  File,
  Image,
  Video,
  Music,
  Archive
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Contact {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  emailAziendale?: string;
  telefono?: string;
  telefonoCellulare?: string;
  azienda?: string;
  ruolo?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  paese?: string;
  sito?: string;
  linkedin?: string;
  note?: string;
  tags: string;
  avatar?: string;
  collegamenti?: string; // Array JSON di collegamenti (opzionale)
  createdAt: string;
  updatedAt: string;
}

interface Collegamento {
  tipo: 'task' | 'progetto' | 'nota' | 'evento';
  id: string;
  titolo: string;
}

interface Document {
  id: string;
  nome: string;
  descrizione?: string;
  tipo: string;
  dimensione?: number;
  url: string;
  mimeType?: string;
  createdAt: string;
}

const Contacts: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newCollegamento, setNewCollegamento] = useState<{ tipo: Collegamento['tipo'], titolo: string, id: string }>({
    tipo: 'task',
    titolo: '',
    id: ''
  });
  const [contactDocuments, setContactDocuments] = useState<Document[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    cognome: '',
    email: '',
    emailAziendale: '',
    telefono: '',
    telefonoCellulare: '',
    azienda: '',
    ruolo: '',
    indirizzo: '',
    citta: '',
    cap: '',
    paese: '',
    sito: '',
    linkedin: '',
    note: '',
    tags: [] as string[],
    avatar: ''
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchContacts();
    fetchTags();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery, selectedTag]);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/contacts/tags/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAllTags(response.data);
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const filterContacts = () => {
    let filtered = [...contacts];

    // Filtro per ricerca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contact =>
        contact.nome.toLowerCase().includes(query) ||
        contact.cognome?.toLowerCase().includes(query) ||
        contact.email?.toLowerCase().includes(query) ||
        contact.emailAziendale?.toLowerCase().includes(query) ||
        contact.azienda?.toLowerCase().includes(query)
      );
    }

    // Filtro per tag
    if (selectedTag) {
      filtered = filtered.filter(contact => {
        const tags = JSON.parse(contact.tags || '[]');
        return tags.includes(selectedTag);
      });
    }

    setFilteredContacts(filtered);
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const data = {
        ...formData,
        tags: formData.tags
      };

      if (editingContact) {
        await axios.put(
          `${API_URL}/api/contacts/${editingContact.id}`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/api/contacts`,
          data,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setShowModal(false);
      resetForm();
      fetchContacts();
      fetchTags();
    } catch (error) {
      console.error('Error saving contact:', error);
      alert('Errore nel salvataggio del contatto');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo contatto?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchContacts();
      fetchTags();
    } catch (error) {
      console.error('Error deleting contact:', error);
      alert('Errore nell\'eliminazione del contatto');
    }
  };

  const openEditModal = (contact: Contact) => {
    setEditingContact(contact);
    const tags = JSON.parse(contact.tags || '[]');
    setFormData({
      nome: contact.nome,
      cognome: contact.cognome || '',
      email: contact.email || '',
      emailAziendale: contact.emailAziendale || '',
      telefono: contact.telefono || '',
      telefonoCellulare: contact.telefonoCellulare || '',
      azienda: contact.azienda || '',
      ruolo: contact.ruolo || '',
      indirizzo: contact.indirizzo || '',
      citta: contact.citta || '',
      cap: contact.cap || '',
      paese: contact.paese || '',
      sito: contact.sito || '',
      linkedin: contact.linkedin || '',
      note: contact.note || '',
      tags: tags,
      avatar: contact.avatar || ''
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingContact(null);
    resetForm();
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      cognome: '',
      email: '',
      emailAziendale: '',
      telefono: '',
      telefonoCellulare: '',
      azienda: '',
      ruolo: '',
      indirizzo: '',
      citta: '',
      cap: '',
      paese: '',
      sito: '',
      linkedin: '',
      note: '',
      tags: [],
      avatar: ''
    });
    setEditingContact(null);
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const getInitials = (contact: Contact) => {
    const first = contact.nome[0] || '';
    const last = contact.cognome?.[0] || '';
    return (first + last).toUpperCase();
  };

  const addCollegamento = async () => {
    if (!newCollegamento.titolo.trim() || !selectedContact) return;

    try {
      const token = localStorage.getItem('token');
      const collegamenti = JSON.parse(selectedContact.collegamenti || '[]') as Collegamento[];
      collegamenti.push({
        tipo: newCollegamento.tipo,
        id: newCollegamento.id.trim() || `manual-${Date.now()}`,
        titolo: newCollegamento.titolo.trim()
      });

      await axios.put(
        `${API_URL}/api/contacts/${selectedContact.id}`,
        { collegamenti: JSON.stringify(collegamenti) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Aggiorna il contatto selezionato
      setSelectedContact({
        ...selectedContact,
        collegamenti: JSON.stringify(collegamenti)
      });

      // Reset form
      setNewCollegamento({ tipo: 'task', titolo: '', id: '' });

      // Refresh lista contatti
      fetchContacts();
    } catch (error) {
      console.error('Error adding collegamento:', error);
      alert('Errore nell\'aggiunta del collegamento');
    }
  };

  const removeCollegamento = async (index: number) => {
    if (!selectedContact) return;

    try {
      const token = localStorage.getItem('token');
      const collegamenti = JSON.parse(selectedContact.collegamenti || '[]') as Collegamento[];
      collegamenti.splice(index, 1);

      await axios.put(
        `${API_URL}/api/contacts/${selectedContact.id}`,
        { collegamenti: JSON.stringify(collegamenti) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Aggiorna il contatto selezionato
      setSelectedContact({
        ...selectedContact,
        collegamenti: JSON.stringify(collegamenti)
      });

      // Refresh lista contatti
      fetchContacts();
    } catch (error) {
      console.error('Error removing collegamento:', error);
      alert('Errore nella rimozione del collegamento');
    }
  };

  // Funzioni per gestire i documenti del contatto
  const fetchContactDocuments = async (contactId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/documents/contact/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContactDocuments(response.data);
    } catch (error) {
      console.error('Error fetching contact documents:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedContact || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/documents/contact/${selectedContact.id}/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      fetchContactDocuments(selectedContact.id);
      // Reset input
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Errore nel caricamento del file');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
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

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/documents/${docId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedContact) {
        fetchContactDocuments(selectedContact.id);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Errore nell\'eliminazione del documento');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-7 h-7 text-indigo-600" />
              Contatti
            </h1>
            <p className="text-gray-600 mt-1">{filteredContacts.length} contatti totali</p>
          </div>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo Contatto
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cerca per nome, email, azienda..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tag Filter */}
          <div className="flex gap-2 items-center">
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value || null)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Tutti i tag</option>
              {allTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contacts Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredContacts.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">
              {searchQuery || selectedTag ? 'Nessun contatto trovato' : 'Nessun contatto. Inizia creandone uno!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredContacts.map(contact => {
              const tags = JSON.parse(contact.tags || '[]');
              return (
                <div
                  key={contact.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg transition-shadow"
                >
                  {/* Avatar and Name */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {contact.avatar ? (
                        <img
                          src={contact.avatar}
                          alt={`${contact.nome} ${contact.cognome || ''}`}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
                          {getInitials(contact)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {contact.nome} {contact.cognome}
                        </h3>
                        {contact.ruolo && (
                          <p className="text-sm text-gray-500">{contact.ruolo}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setSelectedContact(contact);
                          setShowDetailsModal(true);
                          fetchContactDocuments(contact.id);
                        }}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="Visualizza Dettagli"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditModal(contact)}
                        className="p-1 text-gray-400 hover:text-indigo-600"
                        title="Modifica"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(contact.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Company */}
                  {contact.azienda && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Building2 className="w-4 h-4" />
                      <span>{contact.azienda}</span>
                    </div>
                  )}

                  {/* Email */}
                  {(contact.email || contact.emailAziendale) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{contact.email || contact.emailAziendale}</span>
                    </div>
                  )}

                  {/* Phone */}
                  {(contact.telefono || contact.telefonoCellulare) && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <Phone className="w-4 h-4" />
                      <span>{contact.telefono || contact.telefonoCellulare}</span>
                    </div>
                  )}

                  {/* Location */}
                  {contact.citta && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>{contact.citta}{contact.paese && `, ${contact.paese}`}</span>
                    </div>
                  )}

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-indigo-50 text-indigo-600 text-xs rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold">
                {editingContact ? 'Modifica Contatto' : 'Nuovo Contatto'}
              </h2>
              <button
                onClick={() => { setShowModal(false); resetForm(); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdate} className="p-6 space-y-6">
              {/* Informazioni Base */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-600" />
                  Informazioni Personali
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cognome
                    </label>
                    <input
                      type="text"
                      value={formData.cognome}
                      onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Contatti */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  Contatti
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Personale
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Aziendale
                    </label>
                    <input
                      type="email"
                      value={formData.emailAziendale}
                      onChange={(e) => setFormData({ ...formData, emailAziendale: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono Fisso
                    </label>
                    <input
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cellulare
                    </label>
                    <input
                      type="tel"
                      value={formData.telefonoCellulare}
                      onChange={(e) => setFormData({ ...formData, telefonoCellulare: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Informazioni Aziendali */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-indigo-600" />
                  Informazioni Aziendali
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Azienda
                    </label>
                    <input
                      type="text"
                      value={formData.azienda}
                      onChange={(e) => setFormData({ ...formData, azienda: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ruolo
                    </label>
                    <input
                      type="text"
                      value={formData.ruolo}
                      onChange={(e) => setFormData({ ...formData, ruolo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Indirizzo */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-indigo-600" />
                  Indirizzo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Via
                    </label>
                    <input
                      type="text"
                      value={formData.indirizzo}
                      onChange={(e) => setFormData({ ...formData, indirizzo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Città
                    </label>
                    <input
                      type="text"
                      value={formData.citta}
                      onChange={(e) => setFormData({ ...formData, citta: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CAP
                    </label>
                    <input
                      type="text"
                      value={formData.cap}
                      onChange={(e) => setFormData({ ...formData, cap: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paese
                    </label>
                    <input
                      type="text"
                      value={formData.paese}
                      onChange={(e) => setFormData({ ...formData, paese: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                </div>
              </div>

              {/* Social / Web */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Globe className="w-5 h-5 text-indigo-600" />
                  Web & Social
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sito Web
                    </label>
                    <input
                      type="url"
                      value={formData.sito}
                      onChange={(e) => setFormData({ ...formData, sito: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="https://"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn
                    </label>
                    <input
                      type="url"
                      value={formData.linkedin}
                      onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                      placeholder="https://linkedin.com/in/..."
                    />
                  </div>
                </div>
              </div>

              {/* Tags */}
              <div>
                <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                  <Tag className="w-5 h-5 text-indigo-600" />
                  Tag
                </h3>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Aggiungi tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-indigo-100 text-indigo-600 rounded-lg hover:bg-indigo-200"
                  >
                    Aggiungi
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-indigo-500 hover:text-indigo-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                  placeholder="Note aggiuntive..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingContact ? 'Salva Modifiche' : 'Crea Contatto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Dettagli Contatto */}
      {showDetailsModal && selectedContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <User className="w-6 h-6 text-indigo-600" />
                Dettagli Contatto
              </h2>
              <button
                onClick={() => { setShowDetailsModal(false); setSelectedContact(null); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Info Personali */}
              <div className="flex items-start gap-4">
                {selectedContact.avatar ? (
                  <img
                    src={selectedContact.avatar}
                    alt={`${selectedContact.nome} ${selectedContact.cognome || ''}`}
                    className="w-20 h-20 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-2xl">
                    {getInitials(selectedContact)}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900">
                    {selectedContact.nome} {selectedContact.cognome}
                  </h3>
                  {selectedContact.ruolo && <p className="text-gray-600">{selectedContact.ruolo}</p>}
                  {selectedContact.azienda && (
                    <p className="text-gray-500 flex items-center gap-1 mt-1">
                      <Building2 className="w-4 h-4" />
                      {selectedContact.azienda}
                    </p>
                  )}
                </div>
              </div>

              {/* Collegamenti */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-indigo-600" />
                  Collegamenti
                </h3>

                {/* Form per aggiungere nuovo collegamento */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Aggiungi nuovo collegamento</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={newCollegamento.tipo}
                      onChange={(e) => setNewCollegamento({ ...newCollegamento, tipo: e.target.value as Collegamento['tipo'] })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    >
                      <option value="task">Task</option>
                      <option value="progetto">Progetto</option>
                      <option value="nota">Nota</option>
                      <option value="evento">Evento</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Titolo *"
                      value={newCollegamento.titolo}
                      onChange={(e) => setNewCollegamento({ ...newCollegamento, titolo: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                    <input
                      type="text"
                      placeholder="ID (opzionale)"
                      value={newCollegamento.id}
                      onChange={(e) => setNewCollegamento({ ...newCollegamento, id: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900"
                    />
                  </div>
                  <button
                    onClick={addCollegamento}
                    disabled={!newCollegamento.titolo.trim()}
                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi collegamento
                  </button>
                </div>

                {/* Lista collegamenti */}
                {(() => {
                  const collegamenti = JSON.parse(selectedContact.collegamenti || '[]') as Collegamento[];
                  if (collegamenti.length === 0) {
                    return (
                      <p className="text-gray-500 text-sm">Nessun collegamento associato a questo contatto.</p>
                    );
                  }
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {collegamenti.map((coll, idx) => {
                        const iconMap = {
                          task: CheckSquare,
                          progetto: FolderOpen,
                          nota: FileText,
                          evento: Calendar
                        };
                        const colorMap = {
                          task: 'text-blue-600 bg-blue-50 border-blue-200',
                          progetto: 'text-purple-600 bg-purple-50 border-purple-200',
                          nota: 'text-yellow-600 bg-yellow-50 border-yellow-200',
                          evento: 'text-green-600 bg-green-50 border-green-200'
                        };
                        const Icon = iconMap[coll.tipo];
                        const colorClass = colorMap[coll.tipo];

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${colorClass}`}
                          >
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs uppercase font-semibold opacity-70">{coll.tipo}</p>
                              <p className="font-medium truncate">{coll.titolo}</p>
                              {coll.id && <p className="text-xs opacity-60 truncate">ID: {coll.id}</p>}
                            </div>
                            <button
                              onClick={() => removeCollegamento(idx)}
                              className="p-1 hover:bg-red-100 rounded text-red-600"
                              title="Rimuovi collegamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Informazioni di contatto */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Mail className="w-5 h-5 text-indigo-600" />
                  Informazioni di Contatto
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedContact.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email Personale</p>
                      <p className="font-medium">{selectedContact.email}</p>
                    </div>
                  )}
                  {selectedContact.emailAziendale && (
                    <div>
                      <p className="text-sm text-gray-500">Email Aziendale</p>
                      <p className="font-medium">{selectedContact.emailAziendale}</p>
                    </div>
                  )}
                  {selectedContact.telefono && (
                    <div>
                      <p className="text-sm text-gray-500">Telefono Fisso</p>
                      <p className="font-medium">{selectedContact.telefono}</p>
                    </div>
                  )}
                  {selectedContact.telefonoCellulare && (
                    <div>
                      <p className="text-sm text-gray-500">Cellulare</p>
                      <p className="font-medium">{selectedContact.telefonoCellulare}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Indirizzo */}
              {(selectedContact.indirizzo || selectedContact.citta) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    Indirizzo
                  </h3>
                  <div>
                    {selectedContact.indirizzo && <p>{selectedContact.indirizzo}</p>}
                    {selectedContact.citta && (
                      <p>{selectedContact.citta}{selectedContact.cap && `, ${selectedContact.cap}`}{selectedContact.paese && `, ${selectedContact.paese}`}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Web & Social */}
              {(selectedContact.sito || selectedContact.linkedin) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-indigo-600" />
                    Web & Social
                  </h3>
                  <div className="space-y-2">
                    {selectedContact.sito && (
                      <a
                        href={selectedContact.sito}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-2"
                      >
                        <Globe className="w-4 h-4" />
                        {selectedContact.sito}
                      </a>
                    )}
                    {selectedContact.linkedin && (
                      <a
                        href={selectedContact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-2"
                      >
                        <Linkedin className="w-4 h-4" />
                        LinkedIn
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {(() => {
                const tags = JSON.parse(selectedContact.tags || '[]');
                return tags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Tag className="w-5 h-5 text-indigo-600" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag: string) => (
                        <span
                          key={tag}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Note */}
              {selectedContact.note && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Note</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedContact.note}</p>
                </div>
              )}

              {/* File & Documenti */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-indigo-600" />
                  File & Documenti
                </h3>

                {/* Upload Area */}
                <div className="mb-4 p-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 hover:border-indigo-400 transition-colors">
                  <div className="text-center">
                    <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <label htmlFor="file-upload-contact" className="cursor-pointer">
                      <span className="text-sm text-gray-600">
                        Clicca per caricare o trascina un file qui
                      </span>
                      <input
                        id="file-upload-contact"
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </label>
                    {uploadingFile && (
                      <p className="text-sm text-indigo-600 mt-2">Caricamento in corso...</p>
                    )}
                  </div>
                </div>

                {/* Lista Documenti */}
                {contactDocuments.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nessun file caricato per questo contatto.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {contactDocuments.map((doc) => {
                      const FileIcon = getFileIcon(doc.tipo);
                      return (
                        <div
                          key={doc.id}
                          className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow flex items-center gap-3"
                        >
                          <FileIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{doc.nome}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(doc.dimensione)} • {new Date(doc.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => handleDownloadDocument(doc)}
                              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                              title="Scarica"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                              title="Elimina"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contacts;
