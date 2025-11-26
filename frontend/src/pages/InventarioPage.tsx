import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  Upload,
  X,
  Download
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface InventarioItem {
  id: string;
  codice: string;
  nome: string;
  descrizione?: string;
  categoria?: string;
  immagine?: string;
  prezzoAcquisto: number;
  prezzoVendita: number;
  iva: number;
  quantita: number;
  unitaMisura: string;
  scorteMinime: number;
  fornitore?: string;
  fornitoreId?: string;
  attivo: boolean;
  note?: string;
}

interface Stats {
  totaleItems: number;
  valoreTotale: number;
  itemsSottoScorta: number;
  perCategoria: Record<string, number>;
}

const InventarioPage: React.FC = () => {
  const [items, setItems] = useState<InventarioItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventarioItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form state
  const [codice, setCodice] = useState('');
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [categoria, setCategoria] = useState('Prodotto');
  const [immagine, setImmagine] = useState('');
  const [prezzoAcquisto, setPrezzoAcquisto] = useState(0);
  const [prezzoVendita, setPrezzoVendita] = useState(0);
  const [iva, setIva] = useState(22);
  const [quantita, setQuantita] = useState(0);
  const [unitaMisura, setUnitaMisura] = useState('pz');
  const [scorteMinime, setScorteMinime] = useState(0);
  const [fornitore, setFornitore] = useState('');
  const [note, setNote] = useState('');
  const [importData, setImportData] = useState('');

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchItems();
    fetchStats();
  }, [categoryFilter]);

  const fetchItems = async () => {
    try {
      const params: any = {};
      if (categoryFilter) params.categoria = categoryFilter;
      params.attivo = 'true';

      const response = await axios.get(`${API_URL}/api/inventario`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      setItems(response.data || []);
    } catch (error) {
      console.error('Errore caricamento inventario:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/inventario/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Errore caricamento statistiche:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!codice || !nome || prezzoVendita <= 0) {
      alert('Codice, nome e prezzo vendita sono obbligatori');
      return;
    }

    try {
      if (editingItem) {
        await axios.put(`${API_URL}/api/inventario/${editingItem.id}`, {
          codice,
          nome,
          descrizione,
          categoria,
          immagine,
          prezzoAcquisto,
          prezzoVendita,
          iva,
          quantita,
          unitaMisura,
          scorteMinime,
          fornitore,
          note
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Articolo aggiornato con successo!');
      } else {
        await axios.post(`${API_URL}/api/inventario`, {
          codice,
          nome,
          descrizione,
          categoria,
          immagine,
          prezzoAcquisto,
          prezzoVendita,
          iva,
          quantita,
          unitaMisura,
          scorteMinime,
          fornitore,
          note
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Articolo creato con successo!');
      }

      setShowCreateModal(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nel salvataggio dell\'articolo');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo articolo?')) return;

    try {
      await axios.delete(`${API_URL}/api/inventario/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Articolo eliminato con successo!');
      fetchItems();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'eliminazione dell\'articolo');
    }
  };

  const handleEdit = (item: InventarioItem) => {
    setEditingItem(item);
    setCodice(item.codice);
    setNome(item.nome);
    setDescrizione(item.descrizione || '');
    setCategoria(item.categoria || 'Prodotto');
    setImmagine(item.immagine || '');
    setPrezzoAcquisto(item.prezzoAcquisto);
    setPrezzoVendita(item.prezzoVendita);
    setIva(item.iva);
    setQuantita(item.quantita);
    setUnitaMisura(item.unitaMisura);
    setScorteMinime(item.scorteMinime);
    setFornitore(item.fornitore || '');
    setNote(item.note || '');
    setShowCreateModal(true);
  };

  const handleImport = async () => {
    if (!importData.trim()) {
      alert('Inserisci i dati da importare');
      return;
    }

    try {
      // Parse CSV data
      const lines = importData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());

      const items = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const item: any = {};
        headers.forEach((header, index) => {
          item[header] = values[index];
        });
        return item;
      });

      const response = await axios.post(`${API_URL}/api/inventario/import`, {
        items
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Importazione completata!\nImportati: ${response.data.imported}\nAggiornati: ${response.data.updated}\nErrori: ${response.data.errors.length}`);
      if (response.data.errors.length > 0) {
        console.error('Errori import:', response.data.errors);
      }

      setShowImportModal(false);
      setImportData('');
      fetchItems();
      fetchStats();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Errore nell\'importazione');
    }
  };

  const handleExportCSV = () => {
    const headers = ['codice', 'nome', 'descrizione', 'categoria', 'prezzoAcquisto', 'prezzoVendita', 'iva', 'quantita', 'unitaMisura', 'scorteMinime', 'fornitore', 'note'];
    const csv = [
      headers.join(','),
      ...itemsFiltrati.map(item =>
        headers.map(h => item[h as keyof InventarioItem] || '').join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'inventario.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const resetForm = () => {
    setCodice('');
    setNome('');
    setDescrizione('');
    setCategoria('Prodotto');
    setImmagine('');
    setPrezzoAcquisto(0);
    setPrezzoVendita(0);
    setIva(22);
    setQuantita(0);
    setUnitaMisura('pz');
    setScorteMinime(0);
    setFornitore('');
    setNote('');
  };

  const itemsFiltrati = items.filter(item =>
    item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.codice.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="text-purple-600" />
              Gestione Inventario
            </h1>
            <p className="text-gray-600 mt-1">Prodotti, servizi e scorte</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload size={20} />
              Importa
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Download size={20} />
              Esporta
            </button>
            <button
              onClick={() => { setShowCreateModal(true); setEditingItem(null); resetForm(); }}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Nuovo Articolo
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Totale Articoli</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totaleItems}</p>
                </div>
                <Package className="text-purple-600" size={32} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Valore Totale</p>
                  <p className="text-2xl font-bold text-gray-900">€{stats.valoreTotale.toFixed(2)}</p>
                </div>
                <TrendingUp className="text-green-600" size={32} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Sotto Scorta</p>
                  <p className="text-2xl font-bold text-red-600">{stats.itemsSottoScorta}</p>
                </div>
                <AlertTriangle className="text-red-600" size={32} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600 mb-2">Per Categoria</p>
              {Object.entries(stats.perCategoria).map(([cat, count]) => (
                <div key={cat} className="text-xs text-gray-700">
                  {cat}: {count}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Cerca per nome o codice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Tutte le categorie</option>
            <option value="Prodotto">Prodotto</option>
            <option value="Servizio">Servizio</option>
            <option value="Materiale">Materiale</option>
          </select>
        </div>

        {/* Items Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Codice</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prezzo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantità</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {itemsFiltrati.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Nessun articolo trovato
                  </td>
                </tr>
              ) : (
                itemsFiltrati.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{item.codice}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.nome}</div>
                      {item.descrizione && (
                        <div className="text-sm text-gray-500">{item.descrizione}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        {item.categoria || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">€{item.prezzoVendita.toFixed(2)}</div>
                      {item.prezzoAcquisto > 0 && (
                        <div className="text-xs text-gray-500">Acq: €{item.prezzoAcquisto.toFixed(2)}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${item.quantita <= item.scorteMinime ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.quantita} {item.unitaMisura}
                      </div>
                      {item.quantita <= item.scorteMinime && (
                        <div className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle size={12} />
                          Sotto scorta
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Modifica"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Elimina"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingItem ? 'Modifica Articolo' : 'Nuovo Articolo'}
                </h2>
                <button
                  onClick={() => { setShowCreateModal(false); setEditingItem(null); resetForm(); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Codice *</label>
                    <input
                      type="text"
                      value={codice}
                      onChange={(e) => setCodice(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                    <textarea
                      value={descrizione}
                      onChange={(e) => setDescrizione(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                    <select
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="Prodotto">Prodotto</option>
                      <option value="Servizio">Servizio</option>
                      <option value="Materiale">Materiale</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Immagine (URL)</label>
                    <input
                      type="text"
                      value={immagine}
                      onChange={(e) => setImmagine(e.target.value)}
                      placeholder="https://esempio.com/immagine.jpg"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fornitore</label>
                    <input
                      type="text"
                      value={fornitore}
                      onChange={(e) => setFornitore(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo Acquisto (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prezzoAcquisto}
                      onChange={(e) => setPrezzoAcquisto(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo Vendita (€) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={prezzoVendita}
                      onChange={(e) => setPrezzoVendita(parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">IVA (%)</label>
                    <input
                      type="number"
                      value={iva}
                      onChange={(e) => setIva(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                    <input
                      type="number"
                      value={quantita}
                      onChange={(e) => setQuantita(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unità Misura</label>
                    <select
                      value={unitaMisura}
                      onChange={(e) => setUnitaMisura(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="pz">Pezzi (pz)</option>
                      <option value="kg">Kilogrammi (kg)</option>
                      <option value="l">Litri (l)</option>
                      <option value="h">Ore (h)</option>
                      <option value="m">Metri (m)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scorte Minime</label>
                    <input
                      type="number"
                      value={scorteMinime}
                      onChange={(e) => setScorteMinime(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      rows={2}
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); setEditingItem(null); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    {editingItem ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Importa Inventario</h2>
                <button
                  onClick={() => { setShowImportModal(false); setImportData(''); }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">
                  Incolla i dati CSV con le colonne: codice, nome, descrizione, categoria, prezzoAcquisto, prezzoVendita, iva, quantita, unitaMisura, scorteMinime, fornitore, note
                </p>
                <textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
                  rows={15}
                  placeholder="codice,nome,descrizione,categoria,prezzoAcquisto,prezzoVendita,iva,quantita,unitaMisura,scorteMinime,fornitore,note&#10;PROD001,Prodotto Test,Descrizione,Prodotto,10.00,20.00,22,100,pz,10,Fornitore SRL,"
                />

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => { setShowImportModal(false); setImportData(''); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Upload size={20} />
                    Importa
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InventarioPage;
