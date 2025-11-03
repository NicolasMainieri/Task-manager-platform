import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Building2, Mail, Lock, User, AlertCircle, CheckCircle } from 'lucide-react';
import LiquidEther from '../components/LiquidEther';
import api from '../services/api';

interface ValidationErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  companyName?: string;
  companyCode?: string;
  name?: string;
}

// Login Component
const Login = () => {
  const location = useLocation();
  const [view, setView] = useState(location.state?.view || 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [plan, setPlan] = useState('starter');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔍 Login - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('✅ User already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const validateForm = () => {
    const errors: ValidationErrors = {};

    if (!email) {
      errors.email = 'Email richiesta';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email non valida';
    }

    if (!password) {
      errors.password = 'Password richiesta';
    } else if (password.length < 8 && view !== 'login') {
      errors.password = 'Password deve essere almeno 8 caratteri';
    }

    if (view !== 'login' && password !== confirmPassword) {
      errors.confirmPassword = 'Le password non coincidono';
    }

    if (view === 'register-admin' && !companyName) {
      errors.companyName = 'Nome azienda richiesto';
    }

    if (view === 'register-employee' && !companyCode) {
      errors.companyCode = 'Codice azienda richiesto';
    }

    if ((view === 'register-admin' || view === 'register-employee') && !name) {
      errors.name = 'Nome richiesto';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      if (view === 'login') {
        console.log('📤 Attempting login with:', { email });

        const response = await api.post('/auth/login', { email, password });
        const data = response.data;

        console.log('📥 Login response:', { status: response.status, data });

        // ✅ Passa TUTTI i dati dell'utente al context (inclusi role, company, adminCompany)
        const userData = data.user;

        console.log('✅ Login successful, calling login function with full user data:', userData);
        login(userData, data.token);

        setTimeout(() => {
          console.log('🔄 Navigating to dashboard');
          navigate('/dashboard', { replace: true });
        }, 100);
      } else if (view === 'register-admin') {
        console.log('📤 Attempting admin registration');

        const response = await api.post('/auth/register-company', {
          email,
          password,
          name,
          companyName,
          plan
        });

        const data = response.data;

        setSuccess(`Account aziendale creato! Codice azienda: ${data.companyCode}`);
        setTimeout(() => {
          setView('login');
        }, 3000);
      } else if (view === 'register-employee') {
        console.log('📤 Attempting employee registration');

        const response = await api.post('/auth/register-employee', {
          email,
          password,
          name,
          companyCode
        });

        const data = response.data;

        setSuccess('Richiesta inviata! Attendi l\'approvazione dell\'amministratore.');
        setTimeout(() => {
          setView('login');
        }, 3000);
      }
    } catch (err: any) {
      console.error('❌ Error:', err);
      setError(err.response?.data?.message || 'Errore di connessione al server');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      {/* LiquidEther Background */}
      <div className="fixed inset-0 z-0">
        <LiquidEther
          colors={['#5227FF', '#FF9FFC', '#B19EEF']}
          mouseForce={20}
          cursorSize={100}
          isViscous={false}
          viscous={30}
          iterationsViscous={32}
          iterationsPoisson={32}
          resolution={0.5}
          isBounce={false}
          autoDemo={true}
          autoSpeed={0.5}
          autoIntensity={2.2}
          takeoverDuration={0.25}
          autoResumeDelay={3000}
          autoRampDuration={0.6}
          style={{ width: '100%', height: '100%' }}
        />
      </div>

      {/* Overlay gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900/70 via-purple-900/60 to-slate-900/70 z-0"></div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Back to landing */}
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Torna alla home
        </button>

        {/* Auth Card */}
        <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-8 shadow-2xl">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white text-center mb-2">
            {view === 'login' && 'Bentornato!'}
            {view === 'register-admin' && 'Registra la tua Azienda'}
            {view === 'register-employee' && 'Registrati come Dipendente'}
          </h2>
          <p className="text-gray-400 text-center mb-8">
            {view === 'login' && 'Accedi al tuo account'}
            {view === 'register-admin' && 'Crea un account aziendale e inizia subito'}
            {view === 'register-employee' && 'Richiedi l\'accesso alla tua azienda'}
          </p>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-300 text-sm">{success}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (only for registration) */}
            {view !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                    placeholder="Mario Rossi"
                  />
                </div>
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.name}
                  </p>
                )}
              </div>
            )}

            {/* Company Name (only for admin registration) */}
            {view === 'register-admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nome Azienda
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                    placeholder="TechCorp S.r.l."
                  />
                </div>
                {validationErrors.companyName && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.companyName}
                  </p>
                )}
              </div>
            )}

            {/* Company Code (only for employee registration) */}
            {view === 'register-employee' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Codice Azienda
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value)}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                    placeholder="ABC123"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Richiedi il codice al tuo amministratore aziendale
                </p>
                {validationErrors.companyCode && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.companyCode}
                  </p>
                )}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="mario@azienda.it"
                />
              </div>
              {validationErrors.email && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                  placeholder="••••••••"
                />
              </div>
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {validationErrors.password}
                </p>
              )}
            </div>

            {/* Confirm Password (only for registration) */}
            {view !== 'login' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Conferma Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                    placeholder="••••••••"
                  />
                </div>
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {validationErrors.confirmPassword}
                  </p>
                )}
              </div>
            )}

            {/* Plan Selection (only for admin registration) */}
            {view === 'register-admin' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scegli il Piano
                </label>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value)}
                  className="w-full bg-slate-900/50 border border-purple-500/30 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                >
                  <option value="starter">Starter - €19.99/mese (10 utenti, 500 task)</option>
                  <option value="professional">Professional - €99.99/mese (50 utenti, task illimitati)</option>
                  <option value="enterprise">Enterprise - Contattaci (Utenti e task illimitati)</option>
                </select>
                <p className="mt-1 text-xs text-gray-400">
                  14 giorni di prova gratuita, nessuna carta richiesta
                </p>
              </div>
            )}

            {/* Remember me / Forgot password (only for login) */}
            {view === 'login' && (
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-purple-500/30 bg-slate-900/50 text-purple-500 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">Ricordami</span>
                </label>
                <button
                  type="button"
                  className="text-sm text-purple-400 hover:text-purple-300 transition"
                >
                  Password dimenticata?
                </button>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Caricamento...' : (
                <>
                  {view === 'login' && 'Accedi'}
                  {view === 'register-admin' && 'Crea Account Aziendale'}
                  {view === 'register-employee' && 'Richiedi Accesso'}
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-purple-500/30"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-slate-800/90 to-slate-900/90 text-gray-400">oppure</span>
            </div>
          </div>

          {/* Switch View */}
          <div className="space-y-3">
            {view === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => setView('register-admin')}
                  className="w-full bg-white/10 text-white py-3 rounded-lg font-medium hover:bg-white/20 transition border border-white/20 flex items-center justify-center gap-2"
                >
                  <Building2 className="w-5 h-5" />
                  Registra la tua Azienda
                </button>
                <button
                  type="button"
                  onClick={() => setView('register-employee')}
                  className="w-full bg-white/10 text-white py-3 rounded-lg font-medium hover:bg-white/20 transition border border-white/20 flex items-center justify-center gap-2"
                >
                  <User className="w-5 h-5" />
                  Sono un Dipendente
                </button>
              </>
            )}

            {(view === 'register-admin' || view === 'register-employee') && (
              <div className="text-center">
                <span className="text-gray-400">Hai già un account? </span>
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-purple-400 hover:text-purple-300 transition font-medium"
                >
                  Accedi
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          {view === 'register-admin' && (
            <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Cosa ottieni:
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Codice azienda univoco per i tuoi dipendenti</li>
                <li>• Pannello admin per gestire team e permessi</li>
                <li>• Approvazione richieste di accesso</li>
                <li>• Analytics e report aziendali</li>
              </ul>
            </div>
          )}

          {view === 'register-employee' && (
            <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Come funziona:
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>1. Richiedi il codice azienda al tuo amministratore</li>
                <li>2. Compila il form di registrazione</li>
                <li>3. Attendi l'approvazione dell'admin</li>
                <li>4. Riceverai un'email quando sarai approvato</li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          Registrandoti accetti i nostri{' '}
          <a href="#" className="text-purple-400 hover:text-purple-300 transition">
            Termini di Servizio
          </a>{' '}
          e la{' '}
          <a href="#" className="text-purple-400 hover:text-purple-300 transition">
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;