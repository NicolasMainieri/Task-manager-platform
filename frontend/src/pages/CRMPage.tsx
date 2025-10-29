import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  BarChart3,
  X,
  Save,
  ArrowLeft,
  Euro,
  Calendar,
  Type,
  Hash,
  Check,
  List,
  UserPlus,
  Download,
  Settings
} from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface CRMTemplate {
  id: string;
  nome: string;
  descrizione?: string;
  icona?: string;
  colore?: string;
  nomeTabella?: string;
  _count?: {
    records: number;
    fields: number;
  };
  fields?: CRMField[];
  records?: CRMRecord[];
}

interface CRMField {
  id?: string;
  nome: string;
  tipo: 'text' | 'number' | 'currency' | 'date' | 'select' | 'multiselect' | 'contact' | 'boolean';
  descrizione?: string;
  ordine: number;
  obbligatorio: boolean;
  opzioni: string[];
  valoreDefault?: string;
  isAggregabile: boolean;
  isStatPrincipale: boolean;
}

interface CRMRecord {
  id: string;
  dati: Record<string, any>;
  contactId?: string;
  note?: string;
  tags: string[];
  createdAt: string;
}

interface CRMStats {
  totalRecords: number;
  aggregatedFields: Record<string, {
    total: number;
    average: number;
    isPrincipal: boolean;
  }>;
}

const CRMPage: React.FC = () => {
  const { user } = useAuth();
  const [crms, setCrms] = useState<CRMTemplate[]>([]);
  const [selectedCRM, setSelectedCRM] = useState<CRMTemplate | null>(null);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showEditCRMModal, setShowEditCRMModal] = useState(false);
  const [showFieldsModal, setShowFieldsModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<CRMRecord | null>(null);

  const [newCRM, setNewCRM] = useState({
    nome: '',
    descrizione: '',
    colore: '#3B82F6',
    nomeTabella: 'Record'
  });

  const [fields, setFields] = useState<CRMField[]>([]);
  const [recordData, setRecordData] = useState<Record<string, any>>({});

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadCRMs();
  }, []);

  const loadCRMs = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/crm`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCrms(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dei CRM:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCRMDetail = async (crmId: string) => {
    try {
      const response = await axios.get(`${API_URL}/crm/${crmId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedCRM(response.data);
      loadCRMStats(crmId);
    } catch (error) {
      console.error('Errore nel caricamento del CRM:', error);
    }
  };

  const loadCRMStats = async (crmId: string) => {
    try {
      const response = await axios.get(`${API_URL}/crm/${crmId}/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Stats ricevute:', response.data);
      console.log('Aggregated fields:', response.data.aggregatedFields);
      setStats(response.data);
    } catch (error) {
      console.error('Errore nel caricamento delle statistiche:', error);
    }
  };

  const handleCreateCRM = async () => {
    try {
      if (!newCRM.nome) {
        alert('Il nome è obbligatorio');
        return;
      }

      if (fields.length === 0) {
        alert('Aggiungi almeno un campo');
        return;
      }

      await axios.post(
        `${API_URL}/crm`,
        {
          ...newCRM,
          fields
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowCreateModal(false);
      setNewCRM({ nome: '', descrizione: '', colore: '#3B82F6', nomeTabella: 'Record' });
      setFields([]);
      loadCRMs();
    } catch (error: any) {
      console.error('Errore nella creazione del CRM:', error);
      alert(error.response?.data?.error || 'Errore nella creazione del CRM');
    }
  };

  const handleUpdateCRM = async () => {
    try {
      if (!selectedCRM) return;

      await axios.put(
        `${API_URL}/crm/${selectedCRM.id}`,
        {
          nome: selectedCRM.nome,
          descrizione: selectedCRM.descrizione,
          colore: selectedCRM.colore,
          nomeTabella: selectedCRM.nomeTabella
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setShowEditCRMModal(false);
      loadCRMDetail(selectedCRM.id);
    } catch (error: any) {
      console.error('Errore nell\'aggiornamento del CRM:', error);
      alert(error.response?.data?.error || 'Errore nell\'aggiornamento del CRM');
    }
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        nome: '',
        tipo: 'text',
        ordine: fields.length,
        obbligatorio: false,
        opzioni: [],
        isAggregabile: false,
        isStatPrincipale: false
      }
    ]);
  };

  const updateField = (index: number, updates: Partial<CRMField>) => {
    const newFields = [...fields];

    // Se cambia il tipo a "currency", attiva automaticamente aggregabile e statPrincipale
    if (updates.tipo === 'currency') {
      newFields[index] = {
        ...newFields[index],
        ...updates,
        isAggregabile: true,
        isStatPrincipale: true
      };
    } else if (updates.tipo && updates.tipo !== 'currency') {
      // Se cambia da currency a un altro tipo, disattiva le checkbox
      newFields[index] = {
        ...newFields[index],
        ...updates,
        isAggregabile: false,
        isStatPrincipale: false
      };
    } else {
      newFields[index] = { ...newFields[index], ...updates };
    }

    setFields(newFields);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const handleAddOrUpdateRecord = async () => {
    try {
      if (!selectedCRM) return;

      if (editingRecord) {
        // Update existing record
        await axios.put(
          `${API_URL}/crm/${selectedCRM.id}/records/${editingRecord.id}`,
          { dati: recordData },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        // Create new record
        await axios.post(
          `${API_URL}/crm/${selectedCRM.id}/records`,
          {
            dati: recordData,
            createContact: true
          },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setShowRecordModal(false);
      setRecordData({});
      setEditingRecord(null);
      loadCRMDetail(selectedCRM.id);
    } catch (error: any) {
      console.error('Errore nel salvataggio del record:', error);
      alert(error.response?.data?.error || 'Errore nel salvataggio del record');
    }
  };

  const handleDeleteRecord = async (recordId: string) => {
    if (!selectedCRM) return;
    if (!confirm('Sei sicuro di voler eliminare questo record?')) return;

    try {
      await axios.delete(
        `${API_URL}/crm/${selectedCRM.id}/records/${recordId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadCRMDetail(selectedCRM.id);
    } catch (error) {
      console.error('Errore nell\'eliminazione del record:', error);
      alert('Errore nell\'eliminazione del record');
    }
  };

  const handleAddFieldToCRM = async () => {
    if (!selectedCRM || fields.length === 0) return;

    try {
      for (const field of fields) {
        await axios.post(
          `${API_URL}/crm/${selectedCRM.id}/fields`,
          field,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      setShowFieldsModal(false);
      setFields([]);
      loadCRMDetail(selectedCRM.id);
    } catch (error) {
      console.error('Errore nell\'aggiunta dei campi:', error);
      alert('Errore nell\'aggiunta dei campi');
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!selectedCRM) return;
    if (!confirm('Sei sicuro di voler eliminare questo campo? I dati esistenti verranno persi.')) return;

    try {
      await axios.delete(
        `${API_URL}/crm/${selectedCRM.id}/fields/${fieldId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      loadCRMDetail(selectedCRM.id);
    } catch (error) {
      console.error('Errore nell\'eliminazione del campo:', error);
      alert('Errore nell\'eliminazione del campo');
    }
  };

  const exportToCSV = () => {
    if (!selectedCRM || !selectedCRM.records || selectedCRM.records.length === 0) {
      alert('Nessun dato da esportare');
      return;
    }

    // Header CSV
    const headers = selectedCRM.fields?.map(f => f.nome).join(',') || '';

    // Rows CSV
    const rows = selectedCRM.records.map(record => {
      return selectedCRM.fields?.map(field => {
        const value = record.dati[field.nome] || '';
        // Escape commas and quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',');
    }).join('\n');

    const csv = `${headers}\n${rows}`;

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedCRM.nome}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const getFieldIcon = (tipo: string) => {
    switch (tipo) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'currency': return <Euro className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'boolean': return <Check className="w-4 h-4" />;
      case 'select':
      case 'multiselect': return <List className="w-4 h-4" />;
      case 'contact': return <UserPlus className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
        <div className="text-gray-400">Caricamento CRM...</div>
      </div>
    );
  }

  // Visualizzazione dettaglio CRM
  if (selectedCRM) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedCRM(null)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-gray-400" />
            </button>
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-white">{selectedCRM.nome}</h1>
              {selectedCRM.descrizione && (
                <p className="text-gray-400 mt-2">{selectedCRM.descrizione}</p>
              )}
            </div>
            <button
              onClick={() => setShowEditCRMModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <Edit className="w-5 h-5" />
              Modifica CRM
            </button>
          </div>

          {/* Stats */}
          <div className="bg-slate-800/50 rounded-xl p-6 border border-indigo-500/20 mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-indigo-400" />
                <div>
                  <span className="text-gray-400 text-sm">Totale {selectedCRM.nomeTabella || 'Record'}</span>
                  <p className="text-3xl font-bold text-white">{stats?.totalRecords || 0}</p>
                </div>
              </div>

              {stats?.aggregatedFields && Object.entries(stats.aggregatedFields).map(([fieldName, data]: [string, any]) => (
                data.isPrincipal && (
                  <div key={fieldName} className="flex items-center gap-3">
                    <Euro className="w-8 h-8 text-green-400" />
                    <div>
                      <span className="text-gray-400 text-sm">{fieldName}</span>
                      <p className="text-3xl font-bold text-white">
                        {data.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })} €
                      </p>
                    </div>
                  </div>
                )
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-slate-700">
              <button
                onClick={() => {
                  setRecordData({});
                  setEditingRecord(null);
                  setShowRecordModal(true);
                }}
                className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Aggiungi {selectedCRM.nomeTabella || 'Record'}
              </button>
              <button
                onClick={() => setShowFieldsModal(true)}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Settings className="w-5 h-5" />
                Gestisci Struttura
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                Esporta
              </button>
            </div>
          </div>

          {/* Records Table */}
          <div className="bg-slate-800/50 rounded-xl border border-indigo-500/20 overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-xl font-bold text-white">{selectedCRM.nomeTabella || 'Record'}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    {selectedCRM.fields?.map(field => (
                      <th key={field.id} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        {field.nome}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {selectedCRM.records && selectedCRM.records.length > 0 ? (
                    selectedCRM.records.map(record => (
                      <tr key={record.id} className="hover:bg-slate-800/30">
                        {selectedCRM.fields?.map(field => (
                          <td key={field.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                            {field.tipo === 'currency' && record.dati[field.nome]
                              ? `${parseFloat(record.dati[field.nome]).toLocaleString('it-IT')} €`
                              : record.dati[field.nome] || '-'}
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium flex justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingRecord(record);
                              setRecordData(record.dati);
                              setShowRecordModal(true);
                            }}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={100} className="px-6 py-12 text-center text-gray-400">
                        Nessun {selectedCRM.nomeTabella || 'record'} ancora. Aggiungi il primo!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Edit CRM Modal */}
        {showEditCRMModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full border border-indigo-500/20">
              <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Modifica CRM</h3>
                <button onClick={() => setShowEditCRMModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome CRM</label>
                  <input
                    type="text"
                    value={selectedCRM.nome}
                    onChange={(e) => setSelectedCRM({ ...selectedCRM, nome: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Descrizione</label>
                  <textarea
                    value={selectedCRM.descrizione || ''}
                    onChange={(e) => setSelectedCRM({ ...selectedCRM, descrizione: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome Tabella</label>
                  <input
                    type="text"
                    value={selectedCRM.nomeTabella || ''}
                    onChange={(e) => setSelectedCRM({ ...selectedCRM, nomeTabella: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                    placeholder="Record / Clienti / Investimenti..."
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowEditCRMModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleUpdateCRM}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Manage Fields Modal */}
        {showFieldsModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-indigo-500/20">
              <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Gestisci Campi</h3>
                <button onClick={() => setShowFieldsModal(false)} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Existing Fields */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">Campi Esistenti</h4>
                  <div className="space-y-2">
                    {selectedCRM.fields?.map(field => (
                      <div key={field.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          {getFieldIcon(field.tipo)}
                          <div>
                            <p className="text-white font-medium">{field.nome}</p>
                            <p className="text-xs text-gray-400">{field.tipo}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteField(field.id!)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add New Fields */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-white">Aggiungi Nuovi Campi</h4>
                    <button
                      onClick={addField}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Aggiungi Campo
                    </button>
                  </div>

                  <div className="space-y-4">
                    {fields.map((field, index) => (
                      <div key={index} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <input
                                type="text"
                                value={field.nome}
                                onChange={(e) => updateField(index, { nome: e.target.value })}
                                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                                placeholder="Nome campo"
                              />
                              <select
                                value={field.tipo}
                                onChange={(e) => updateField(index, { tipo: e.target.value as any })}
                                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                              >
                                <option value="text">Testo</option>
                                <option value="number">Numero</option>
                                <option value="currency">Valuta (€)</option>
                                <option value="date">Data</option>
                                <option value="select">Select</option>
                                <option value="boolean">Si/No</option>
                              </select>
                            </div>

                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={field.isAggregabile}
                                  onChange={(e) => updateField(index, { isAggregabile: e.target.checked })}
                                  className="rounded"
                                />
                                Aggregabile
                              </label>
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={field.isStatPrincipale}
                                  onChange={(e) => updateField(index, { isStatPrincipale: e.target.checked })}
                                  className="rounded"
                                />
                                Statistica principale
                              </label>
                            </div>
                          </div>

                          <button
                            onClick={() => removeField(index)}
                            className="text-red-400 hover:text-red-300 p-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 bg-slate-800 p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowFieldsModal(false);
                    setFields([]);
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Chiudi
                </button>
                {fields.length > 0 && (
                  <button
                    onClick={handleAddFieldToCRM}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Salva Nuovi Campi
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit Record Modal */}
        {showRecordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-indigo-500/20">
              <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">
                  {editingRecord ? 'Modifica' : 'Aggiungi'} {selectedCRM.nomeTabella || 'Record'}
                </h3>
                <button onClick={() => {
                  setShowRecordModal(false);
                  setEditingRecord(null);
                  setRecordData({});
                }} className="text-gray-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                {selectedCRM.fields?.map(field => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {field.nome}
                      {field.obbligatorio && <span className="text-red-400 ml-1">*</span>}
                    </label>
                    {field.tipo === 'text' && (
                      <input
                        type="text"
                        value={recordData[field.nome] || ''}
                        onChange={(e) => setRecordData({ ...recordData, [field.nome]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        placeholder={field.descrizione}
                      />
                    )}
                    {field.tipo === 'number' && (
                      <input
                        type="number"
                        value={recordData[field.nome] || ''}
                        onChange={(e) => setRecordData({ ...recordData, [field.nome]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        placeholder={field.descrizione}
                      />
                    )}
                    {field.tipo === 'currency' && (
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="number"
                          step="0.01"
                          value={recordData[field.nome] || ''}
                          onChange={(e) => setRecordData({ ...recordData, [field.nome]: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                          placeholder={field.descrizione}
                        />
                      </div>
                    )}
                    {field.tipo === 'date' && (
                      <input
                        type="date"
                        value={recordData[field.nome] || ''}
                        onChange={(e) => setRecordData({ ...recordData, [field.nome]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    )}
                    {field.tipo === 'select' && (
                      <select
                        value={recordData[field.nome] || ''}
                        onChange={(e) => setRecordData({ ...recordData, [field.nome]: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="">Seleziona...</option>
                        {field.opzioni.map((opt, idx) => (
                          <option key={idx} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    {field.tipo === 'boolean' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={recordData[field.nome] === 'true' || recordData[field.nome] === true}
                          onChange={(e) => setRecordData({ ...recordData, [field.nome]: e.target.checked.toString() })}
                          className="w-4 h-4 rounded"
                        />
                        <span className="text-sm text-gray-400">Sì</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-slate-800 p-6 border-t border-slate-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowRecordModal(false);
                    setEditingRecord(null);
                    setRecordData({});
                  }}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={handleAddOrUpdateRecord}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {editingRecord ? 'Salva Modifiche' : 'Salva Record'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Lista CRM
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white">CRM Personalizzati</h1>
            <p className="text-gray-400 mt-2">Crea e gestisci CRM custom per le tue esigenze</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuovo CRM
          </button>
        </div>

        {/* CRM Grid */}
        {crms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {crms.map(crm => (
              <div
                key={crm.id}
                onClick={() => loadCRMDetail(crm.id)}
                className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-xl p-6 hover:border-indigo-500/40 transition-all cursor-pointer"
                style={{ borderColor: `${crm.colore}40` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">{crm.nome}</h3>
                    {crm.descrizione && (
                      <p className="text-sm text-gray-400 line-clamp-2">{crm.descrizione}</p>
                    )}
                  </div>
                  <Users className="w-8 h-8 text-indigo-400" />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-500">{crm.nomeTabella || 'Record'}</p>
                    <p className="text-lg font-bold text-white">{crm._count?.records || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Campi</p>
                    <p className="text-lg font-bold text-white">{crm._count?.fields || 0}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Users className="w-20 h-20 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">Nessun CRM ancora</h3>
            <p className="text-gray-500 mb-6">Crea il tuo primo CRM personalizzato</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Crea CRM
            </button>
          </div>
        )}
      </div>

      {/* Create CRM Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-indigo-500/20">
            <div className="sticky top-0 bg-slate-800 p-6 border-b border-slate-700 flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Crea Nuovo CRM</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Nome, Descrizione, Nome Tabella */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome CRM <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newCRM.nome}
                  onChange={(e) => setNewCRM({ ...newCRM, nome: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="es: Tracciato Clienti Fondo Investimento"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={newCRM.descrizione}
                  onChange={(e) => setNewCRM({ ...newCRM, descrizione: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Descrizione opzionale..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Tabella <span className="text-gray-500">(es: Clienti, Investimenti, Lead...)</span>
                </label>
                <input
                  type="text"
                  value={newCRM.nomeTabella}
                  onChange={(e) => setNewCRM({ ...newCRM, nomeTabella: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Record"
                />
              </div>

              {/* Campi */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="block text-sm font-medium text-gray-300">
                    Campi Personalizzati
                  </label>
                  <button
                    onClick={addField}
                    className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Aggiungi Campo
                  </button>
                </div>

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={index} className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={field.nome}
                              onChange={(e) => updateField(index, { nome: e.target.value })}
                              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                              placeholder="Nome campo (es: € Investiti)"
                            />
                            <select
                              value={field.tipo}
                              onChange={(e) => updateField(index, { tipo: e.target.value as any })}
                              className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm"
                            >
                              <option value="text">Testo</option>
                              <option value="number">Numero</option>
                              <option value="currency">Valuta (€)</option>
                              <option value="date">Data</option>
                              <option value="select">Select</option>
                              <option value="boolean">Si/No</option>
                            </select>
                          </div>

                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                              <input
                                type="checkbox"
                                checked={field.isAggregabile}
                                onChange={(e) => updateField(index, { isAggregabile: e.target.checked })}
                                className="rounded"
                              />
                              Aggregabile (somma)
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-300">
                              <input
                                type="checkbox"
                                checked={field.isStatPrincipale}
                                onChange={(e) => updateField(index, { isStatPrincipale: e.target.checked })}
                                className="rounded"
                              />
                              Statistica principale
                            </label>
                          </div>
                        </div>

                        <button
                          onClick={() => removeField(index)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-800 p-6 border-t border-slate-700 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreateCRM}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Crea CRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
