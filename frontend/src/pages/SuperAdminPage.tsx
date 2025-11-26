import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, FileText, Activity, Package, CheckCircle, XCircle,
  Settings, ChevronDown, ChevronUp, Search, Filter, TrendingUp, BarChart3,
  Shield, Eye, EyeOff, Briefcase, ArrowLeft
} from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

type Company = {
  id: string;
  nome: string;
  plan: string;
  categoria: string;
  moduliAttivi: string[];
  _count: {
    users: number;
    tasks: number;
  };
  createdAt: string;
};

type GlobalStats = {
  totalCompanies: number;
  totalUsers: number;
  totalTasks: number;
  companiesByPlan: Record<string, number>;
  companiesByCategory: Record<string, number>;
};

type Module = {
  id: string;
  nome: string;
  descrizione: string;
  categorieIdeali: string[];
};

const AVAILABLE_MODULES: Module[] = [
  { id: "tasks", nome: "Task Management", descrizione: "Gestione task e progetti", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house", "manifatturiero"] },
  { id: "preventivi", nome: "Preventivi AI", descrizione: "Generazione preventivi con AI", categorieIdeali: ["generale", "ecommerce", "agenzia", "software_house", "manifatturiero"] },
  { id: "newsletter", nome: "Newsletter", descrizione: "Gestione newsletter e campagne email", categorieIdeali: ["generale", "ecommerce", "agenzia"] },
  { id: "crm", nome: "CRM", descrizione: "Customer Relationship Management", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house"] },
  { id: "drive", nome: "Drive", descrizione: "Archiviazione documenti cloud", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house", "manifatturiero"] },
  { id: "videocall", nome: "Video Call", descrizione: "Videoconferenze integrate", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house"] },
  { id: "calendar", nome: "Calendario", descrizione: "Calendario e appuntamenti", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house", "manifatturiero"] },
  { id: "tickets", nome: "Ticket System", descrizione: "Sistema di ticketing", categorieIdeali: ["generale", "ecommerce", "software_house"] },
  { id: "rewards", nome: "Gamification", descrizione: "Sistema premi e gamification", categorieIdeali: ["generale", "ecommerce", "agenzia", "software_house", "manifatturiero"] },
  { id: "studi_legali", nome: "Studi Legali", descrizione: "Gestione casi e ricerca giuridica", categorieIdeali: ["studio_legale"] },
  { id: "fatture", nome: "Fatturazione", descrizione: "Gestione fatture", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house", "manifatturiero"] },
  { id: "pagamenti", nome: "Pagamenti", descrizione: "Gestione pagamenti", categorieIdeali: ["generale", "ecommerce", "studio_legale", "agenzia", "software_house", "manifatturiero"] },
];

export default function SuperAdminPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPlan, setFilterPlan] = useState<string>("all");
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);
  const [editingModules, setEditingModules] = useState<string | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);

  // Verifica se l'utente è SuperAdmin
  useEffect(() => {
    if (!user?.isSuperAdmin) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  // Carica dati iniziali
  useEffect(() => {
    loadData();
  }, [token]);

  // Filtra aziende
  useEffect(() => {
    let filtered = companies;

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(c => c.categoria === filterCategory);
    }

    if (filterPlan !== "all") {
      filtered = filtered.filter(c => c.plan === filterPlan);
    }

    setFilteredCompanies(filtered);
  }, [companies, searchTerm, filterCategory, filterPlan]);

  const loadData = async () => {
    try {
      setLoading(true);

      const [statsRes, companiesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/superadmin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/superadmin/companies`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (companiesRes.ok) {
        const companiesData = await companiesRes.json();
        setCompanies(companiesData);
      }
    } catch (error) {
      console.error("Errore caricamento dati:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditModules = (company: Company) => {
    setEditingModules(company.id);
    setSelectedModules([...company.moduliAttivi]);
    setExpandedCompany(company.id);
  };

  const handleToggleModule = (moduleId: string) => {
    if (selectedModules.includes(moduleId)) {
      setSelectedModules(selectedModules.filter(m => m !== moduleId));
    } else {
      setSelectedModules([...selectedModules, moduleId]);
    }
  };

  const handleSaveModules = async (companyId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/companies/${companyId}/modules`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ moduliAttivi: selectedModules })
      });

      if (res.ok) {
        const updatedCompany = await res.json();
        setCompanies(companies.map(c =>
          c.id === companyId ? { ...c, moduliAttivi: updatedCompany.moduliAttivi } : c
        ));
        setEditingModules(null);
        setSelectedModules([]);
      }
    } catch (error) {
      console.error("Errore salvataggio moduli:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditingModules(null);
    setSelectedModules([]);
  };

  const handleAutoActivate = async (companyId: string, categoria: string) => {
    const recommendedModules = AVAILABLE_MODULES
      .filter(m => m.categorieIdeali.includes(categoria))
      .map(m => m.id);

    try {
      const res = await fetch(`${API_BASE_URL}/superadmin/companies/${companyId}/modules`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ moduliAttivi: recommendedModules })
      });

      if (res.ok) {
        const updatedCompany = await res.json();
        setCompanies(companies.map(c =>
          c.id === companyId ? { ...c, moduliAttivi: updatedCompany.moduliAttivi } : c
        ));
      }
    } catch (error) {
      console.error("Errore attivazione automatica:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3">
                <Shield className="w-8 h-8 text-purple-400" />
                <div>
                  <h1 className="text-2xl font-bold text-white">SuperAdmin Dashboard</h1>
                  <p className="text-sm text-white/60">Gestione globale piattaforma</p>
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Statistiche Globali */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Aziende Totali</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalCompanies}</p>
                </div>
                <Building2 className="w-12 h-12 text-purple-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Utenti Totali</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalUsers}</p>
                </div>
                <Users className="w-12 h-12 text-blue-400" />
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/60 text-sm">Task Totali</p>
                  <p className="text-3xl font-bold text-white mt-1">{stats.totalTasks}</p>
                </div>
                <FileText className="w-12 h-12 text-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* Filtri */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-white/60 text-sm mb-2">Cerca Azienda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nome azienda..."
                  className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Filtra per Categoria</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tutte le categorie</option>
                <option value="generale">Generale</option>
                <option value="ecommerce">E-commerce</option>
                <option value="studio_legale">Studio Legale</option>
                <option value="agenzia">Agenzia</option>
                <option value="software_house">Software House</option>
                <option value="manifatturiero">Manifatturiero</option>
              </select>
            </div>

            <div>
              <label className="block text-white/60 text-sm mb-2">Filtra per Piano</label>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Tutti i piani</option>
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>
        </div>

        {/* Lista Aziende */}
        <div className="space-y-4">
          {filteredCompanies.map(company => (
            <div
              key={company.id}
              className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-6 h-6 text-purple-400" />
                      <h3 className="text-xl font-bold text-white">{company.nome}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        company.plan === "enterprise" ? "bg-purple-500/20 text-purple-300" :
                        company.plan === "professional" ? "bg-blue-500/20 text-blue-300" :
                        company.plan === "starter" ? "bg-green-500/20 text-green-300" :
                        "bg-gray-500/20 text-gray-300"
                      }`}>
                        {company.plan.toUpperCase()}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300">
                        {company.categoria.replace("_", " ").toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-white/60">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <span>{company._count.users} utenti</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{company._count.tasks} task</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        <span>{company.moduliAttivi.length} moduli attivi</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAutoActivate(company.id, company.categoria)}
                      className="px-3 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-all text-sm"
                    >
                      Auto-attiva
                    </button>
                    {editingModules === company.id ? (
                      <>
                        <button
                          onClick={() => handleSaveModules(company.id)}
                          className="px-3 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition-all"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="px-3 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleEditModules(company)}
                        className="px-3 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all"
                      >
                        <Settings className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedCompany(expandedCompany === company.id ? null : company.id)}
                      className="px-3 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all"
                    >
                      {expandedCompany === company.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Moduli espansi */}
                {expandedCompany === company.id && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <h4 className="text-white font-semibold mb-4">Gestione Moduli</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {AVAILABLE_MODULES.map(module => {
                        const isActive = editingModules === company.id
                          ? selectedModules.includes(module.id)
                          : company.moduliAttivi.includes(module.id);
                        const isRecommended = module.categorieIdeali.includes(company.categoria);

                        return (
                          <div
                            key={module.id}
                            onClick={() => editingModules === company.id && handleToggleModule(module.id)}
                            className={`p-4 rounded-lg border-2 transition-all ${
                              editingModules === company.id ? "cursor-pointer" : ""
                            } ${
                              isActive
                                ? "bg-green-500/20 border-green-500/50"
                                : isRecommended
                                ? "bg-purple-500/10 border-purple-500/30"
                                : "bg-white/5 border-white/10"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="text-white font-medium text-sm">{module.nome}</p>
                                  {isRecommended && (
                                    <span className="px-2 py-0.5 bg-purple-500/30 text-purple-300 rounded text-xs">
                                      Consigliato
                                    </span>
                                  )}
                                </div>
                                <p className="text-white/60 text-xs mt-1">{module.descrizione}</p>
                              </div>
                              {isActive ? (
                                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                              ) : (
                                <XCircle className="w-5 h-5 text-white/30 flex-shrink-0" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredCompanies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-white/60">Nessuna azienda trovata</p>
          </div>
        )}
      </div>
    </div>
  );
}
