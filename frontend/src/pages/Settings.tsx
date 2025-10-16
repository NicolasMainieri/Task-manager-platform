import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User, Lock, Phone, MapPin, Building2, CreditCard, Save, Upload, Crown, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface UserProfile {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  avatar?: string;
  telefono?: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  paese?: string;
  role: {
    nome: string;
  };
  company?: {
    id: string;
    nome: string;
    plan: string;
    logo?: string;
    planStatus?: string;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
    nextRenewalDate?: string;
    partitaIva?: string;
    codiceFiscale?: string;
    indirizzo?: string;
    citta?: string;
    cap?: string;
    paese?: string;
    telefono?: string;
    emailFatturazione?: string;
    pec?: string;
    codiceSdi?: string;
  };
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'company'>('profile');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Profile form
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [indirizzo, setIndirizzo] = useState('');
  const [citta, setCitta] = useState('');
  const [cap, setCap] = useState('');
  const [paese, setPaese] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Company form (admin only)
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [codiceFiscale, setCodiceFiscale] = useState('');
  const [companyIndirizzo, setCompanyIndirizzo] = useState('');
  const [companyCitta, setCompanyCitta] = useState('');
  const [companyCap, setCompanyCap] = useState('');
  const [companyPaese, setCompanyPaese] = useState('');
  const [companyTelefono, setCompanyTelefono] = useState('');
  const [emailFatturazione, setEmailFatturazione] = useState('');
  const [pec, setPec] = useState('');
  const [codiceSdi, setCodiceSdi] = useState('');

  const token = localStorage.getItem('token');
  const isAdmin = user?.role?.nome === 'Admin';

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const response = await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const userData = response.data;
      setUser(userData);

      // Populate profile form
      setNome(userData.nome || '');
      setCognome(userData.cognome || '');
      setEmail(userData.email || '');
      setTelefono(userData.telefono || '');
      setIndirizzo(userData.indirizzo || '');
      setCitta(userData.citta || '');
      setCap(userData.cap || '');
      setPaese(userData.paese || '');
      setAvatarPreview(userData.avatar || '');

      // Populate company form if admin
      if (userData.company) {
        setCompanyLogo(userData.company.logo || '');
        setCompanyLogoPreview(userData.company.logo || '');
        setPartitaIva(userData.company.partitaIva || '');
        setCodiceFiscale(userData.company.codiceFiscale || '');
        setCompanyIndirizzo(userData.company.indirizzo || '');
        setCompanyCitta(userData.company.citta || '');
        setCompanyCap(userData.company.cap || '');
        setCompanyPaese(userData.company.paese || '');
        setCompanyTelefono(userData.company.telefono || '');
        setEmailFatturazione(userData.company.emailFatturazione || '');
        setPec(userData.company.pec || '');
        setCodiceSdi(userData.company.codiceSdi || '');
      }
    } catch (error) {
      console.error('Errore caricamento dati utente:', error);
      alert('Errore durante il caricamento dei dati');
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCompanyLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/users/me`,
        {
          nome,
          cognome,
          email,
          telefono,
          indirizzo,
          citta,
          cap,
          paese,
          avatar: avatarPreview, // In production, upload to cloud storage first
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Profilo aggiornato con successo!');
      loadUserData();
    } catch (error) {
      console.error('Errore aggiornamento profilo:', error);
      alert('Errore durante l\'aggiornamento del profilo');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      alert('Compila tutti i campi');
      return;
    }

    if (newPassword !== confirmPassword) {
      alert('Le password non coincidono');
      return;
    }

    if (newPassword.length < 6) {
      alert('La password deve essere di almeno 6 caratteri');
      return;
    }

    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/users/me/password`,
        {
          currentPassword,
          newPassword,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Password cambiata con successo!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Errore cambio password:', error);
      alert(error.response?.data?.error || 'Errore durante il cambio password');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCompanySettings = async () => {
    if (!user?.company?.id) return;

    setLoading(true);
    try {
      await axios.put(
        `${API_URL}/companies/${user.company.id}`,
        {
          logo: companyLogoPreview, // In production, upload to cloud storage first
          partitaIva,
          codiceFiscale,
          indirizzo: companyIndirizzo,
          citta: companyCitta,
          cap: companyCap,
          paese: companyPaese,
          telefono: companyTelefono,
          emailFatturazione,
          pec,
          codiceSdi,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      alert('Impostazioni aziendali aggiornate con successo!');
      loadUserData();
    } catch (error) {
      console.error('Errore aggiornamento azienda:', error);
      alert('Errore durante l\'aggiornamento delle impostazioni aziendali');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to calculate days remaining
  const calculateDaysRemaining = (dateString?: string) => {
    if (!dateString) return null;
    const targetDate = new Date(dateString);
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get subscription info
  const getSubscriptionInfo = () => {
    if (!user?.company) return null;

    const { plan, planStatus, trialEndsAt, subscriptionEndsAt, nextRenewalDate } = user.company;

    // Free trial
    if (plan === 'free_trial' && trialEndsAt) {
      const daysRemaining = calculateDaysRemaining(trialEndsAt);
      return {
        type: 'trial',
        status: daysRemaining && daysRemaining > 0 ? 'active' : 'expired',
        daysRemaining,
        endDate: formatDate(trialEndsAt),
        message: daysRemaining && daysRemaining > 0
          ? `Free Trial - ${daysRemaining} ${daysRemaining === 1 ? 'giorno rimanente' : 'giorni rimanenti'}`
          : 'Free Trial scaduto',
      };
    }

    // Active subscription
    if (planStatus === 'active' && nextRenewalDate) {
      return {
        type: 'subscription',
        status: 'active',
        renewalDate: formatDate(nextRenewalDate),
        plan: plan.charAt(0).toUpperCase() + plan.slice(1),
        message: `Piano ${plan.charAt(0).toUpperCase() + plan.slice(1)} Attivo`,
      };
    }

    // Expired subscription
    if (planStatus === 'expired' && subscriptionEndsAt) {
      return {
        type: 'subscription',
        status: 'expired',
        endDate: formatDate(subscriptionEndsAt),
        message: 'Abbonamento scaduto',
      };
    }

    return null;
  };

  const subscriptionInfo = getSubscriptionInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Impostazioni</h1>
          <p className="text-gray-400">Gestisci il tuo profilo e le impostazioni dell'account</p>
        </div>

        {/* Tabs */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl overflow-hidden">
          <div className="flex border-b border-indigo-500/20">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <User className="w-5 h-5 inline-block mr-2" />
              Profilo
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                activeTab === 'password'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Lock className="w-5 h-5 inline-block mr-2" />
              Password
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('company')}
                className={`flex-1 px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'company'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Building2 className="w-5 h-5 inline-block mr-2" />
                Azienda
              </button>
            )}
          </div>

          <div className="p-8">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white mb-6">Informazioni Profilo</h2>

                {/* Avatar */}
                <div className="flex items-center gap-6">
                  <div className="relative">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center border-4 border-indigo-500">
                        <User className="w-12 h-12 text-white" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors">
                      <Upload className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">
                      {nome} {cognome}
                    </h3>
                    <p className="text-gray-400">{email}</p>
                    <p className="text-indigo-400 text-sm mt-1">{user?.role?.nome}</p>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Nome *</label>
                    <input
                      type="text"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Cognome *</label>
                    <input
                      type="text"
                      value={cognome}
                      onChange={(e) => setCognome(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Telefono
                    </label>
                    <input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="+39 123 456 7890"
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-white mb-2">
                      <MapPin className="w-4 h-4 inline mr-1" />
                      Indirizzo
                    </label>
                    <input
                      type="text"
                      value={indirizzo}
                      onChange={(e) => setIndirizzo(e.target.value)}
                      placeholder="Via Roma, 123"
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Città</label>
                    <input
                      type="text"
                      value={citta}
                      onChange={(e) => setCitta(e.target.value)}
                      placeholder="Milano"
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">CAP</label>
                    <input
                      type="text"
                      value={cap}
                      onChange={(e) => setCap(e.target.value)}
                      placeholder="20121"
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Paese</label>
                    <input
                      type="text"
                      value={paese}
                      onChange={(e) => setPaese(e.target.value)}
                      placeholder="Italia"
                      className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6 max-w-md">
                <h2 className="text-2xl font-bold text-white mb-6">Cambia Password</h2>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Password Attuale *
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Nuova Password *
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Minimo 6 caratteri</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white mb-2">
                    Conferma Nuova Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-5 h-5" />
                  {loading ? 'Salvataggio...' : 'Cambia Password'}
                </button>
              </div>
            )}

            {/* Company Tab (Admin only) */}
            {activeTab === 'company' && isAdmin && user?.company && (
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white">Impostazioni Aziendali</h2>
                    <p className="text-gray-400 mt-1">Piano: <span className="text-indigo-400 font-semibold capitalize">{user.company.plan}</span></p>
                  </div>
                </div>

                {/* Company Logo */}
                <div className="flex items-center gap-6 pb-6 border-b border-indigo-500/20">
                  <div className="relative">
                    {companyLogoPreview ? (
                      <img
                        src={companyLogoPreview}
                        alt="Logo aziendale"
                        className="w-32 h-32 rounded-xl object-cover border-4 border-indigo-500"
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-xl bg-indigo-600 flex items-center justify-center border-4 border-indigo-500">
                        <Building2 className="w-16 h-16 text-white" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-indigo-600 p-2 rounded-full cursor-pointer hover:bg-indigo-700 transition-colors">
                      <Upload className="w-4 h-4 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCompanyLogoChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{user.company.nome}</h3>
                    <p className="text-gray-400">Logo Aziendale</p>
                  </div>
                </div>

                {/* Subscription Info Box */}
                {subscriptionInfo && (
                  <div className={`rounded-xl p-6 border-2 ${
                    subscriptionInfo.status === 'active'
                      ? 'bg-green-500/10 border-green-500/30'
                      : subscriptionInfo.status === 'expired'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-yellow-500/10 border-yellow-500/30'
                  }`}>
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${
                        subscriptionInfo.status === 'active'
                          ? 'bg-green-500'
                          : subscriptionInfo.status === 'expired'
                          ? 'bg-red-500'
                          : 'bg-yellow-500'
                      }`}>
                        {subscriptionInfo.type === 'trial' ? (
                          <Calendar className="w-6 h-6 text-white" />
                        ) : (
                          <Crown className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-bold text-lg">{subscriptionInfo.message}</h3>
                          {subscriptionInfo.status === 'active' && (
                            <CheckCircle className="w-5 h-5 text-green-400" />
                          )}
                          {subscriptionInfo.status === 'expired' && (
                            <AlertCircle className="w-5 h-5 text-red-400" />
                          )}
                        </div>

                        {subscriptionInfo.type === 'trial' && subscriptionInfo.daysRemaining !== null && subscriptionInfo.daysRemaining > 0 && (
                          <p className="text-gray-300 text-sm">
                            Il tuo periodo di prova scade il <span className="font-semibold">{subscriptionInfo.endDate}</span>
                          </p>
                        )}

                        {subscriptionInfo.type === 'subscription' && subscriptionInfo.status === 'active' && (
                          <p className="text-gray-300 text-sm">
                            Prossimo rinnovo: <span className="font-semibold">{subscriptionInfo.renewalDate}</span>
                          </p>
                        )}

                        {subscriptionInfo.status === 'expired' && (
                          <p className="text-gray-300 text-sm">
                            Scaduto il <span className="font-semibold">{subscriptionInfo.endDate}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Billing Info */}
                <div>
                  <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    Dati di Fatturazione
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Partita IVA
                      </label>
                      <input
                        type="text"
                        value={partitaIva}
                        onChange={(e) => setPartitaIva(e.target.value)}
                        placeholder="IT12345678901"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Codice Fiscale
                      </label>
                      <input
                        type="text"
                        value={codiceFiscale}
                        onChange={(e) => setCodiceFiscale(e.target.value)}
                        placeholder="RSSMRA80A01H501U"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-white mb-2">
                        Indirizzo
                      </label>
                      <input
                        type="text"
                        value={companyIndirizzo}
                        onChange={(e) => setCompanyIndirizzo(e.target.value)}
                        placeholder="Via Roma, 123"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Città</label>
                      <input
                        type="text"
                        value={companyCitta}
                        onChange={(e) => setCompanyCitta(e.target.value)}
                        placeholder="Milano"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">CAP</label>
                      <input
                        type="text"
                        value={companyCap}
                        onChange={(e) => setCompanyCap(e.target.value)}
                        placeholder="20121"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Paese</label>
                      <input
                        type="text"
                        value={companyPaese}
                        onChange={(e) => setCompanyPaese(e.target.value)}
                        placeholder="Italia"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Telefono
                      </label>
                      <input
                        type="tel"
                        value={companyTelefono}
                        onChange={(e) => setCompanyTelefono(e.target.value)}
                        placeholder="+39 02 1234567"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Email Fatturazione
                      </label>
                      <input
                        type="email"
                        value={emailFatturazione}
                        onChange={(e) => setEmailFatturazione(e.target.value)}
                        placeholder="fatturazione@azienda.it"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">PEC</label>
                      <input
                        type="email"
                        value={pec}
                        onChange={(e) => setPec(e.target.value)}
                        placeholder="azienda@pec.it"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">
                        Codice SDI
                      </label>
                      <input
                        type="text"
                        value={codiceSdi}
                        onChange={(e) => setCodiceSdi(e.target.value)}
                        placeholder="ABCDEFG"
                        className="w-full px-4 py-3 bg-slate-700 text-white rounded-xl border border-slate-600 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSaveCompanySettings}
                  disabled={loading}
                  className="w-full md:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  {loading ? 'Salvataggio...' : 'Salva Impostazioni Aziendali'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
