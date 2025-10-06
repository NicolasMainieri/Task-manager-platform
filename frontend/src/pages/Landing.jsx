import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, CheckCircle, Zap, Users, BarChart3, Brain, ArrowRight, Star } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: "AI-Powered Insights",
      description: "Analisi intelligente delle performance e suggerimenti automatici per ottimizzare il workflow"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Team Collaboration",
      description: "Gestione team avanzata con ruoli, permessi e assegnazioni intelligenti"
    },
    {
      icon: <BarChart3 className="w-6 h-6" />,
      title: "Analytics Avanzate",
      description: "Dashboard interattive con metriche in tempo reale e report personalizzabili"
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Automazione Smart",
      description: "Automatizza task ripetitivi e workflow con regole intelligenti"
    }
  ];

  const plans = [
    {
      name: "Starter",
      price: { monthly: 9, yearly: 90 },
      description: "Perfetto per freelancer e piccoli team",
      features: [
        "Fino a 5 utenti",
        "100 task attivi",
        "Analytics base",
        "Supporto email",
        "1 workspace"
      ],
      popular: false
    },
    {
      name: "Professional",
      price: { monthly: 29, yearly: 290 },
      description: "Per team in crescita che vogliono di più",
      features: [
        "Fino a 20 utenti",
        "Task illimitati",
        "AI Analytics avanzate",
        "Supporto prioritario",
        "5 workspace",
        "Integrazioni premium",
        "Report personalizzati"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: { monthly: 99, yearly: 990 },
      description: "Per organizzazioni che richiedono il massimo",
      features: [
        "Utenti illimitati",
        "Task illimitati",
        "AI completa + Chat Assistant",
        "Supporto dedicato 24/7",
        "Workspace illimitati",
        "Tutte le integrazioni",
        "API access",
        "Custom branding",
        "SSO & Advanced security"
      ],
      popular: false
    }
  ];

  const testimonials = [
    {
      name: "Marco Rossi",
      role: "CEO @ TechStart",
      content: "TaskFlow ha trasformato completamente il nostro modo di lavorare. L'AI è incredibilmente accurata.",
      rating: 5
    },
    {
      name: "Laura Bianchi",
      role: "Project Manager @ DesignCo",
      content: "Finalmente uno strumento che capisce davvero le esigenze del team. Imprescindibile!",
      rating: 5
    },
    {
      name: "Giovanni Verdi",
      role: "CTO @ DevHub",
      content: "Le analytics e i report automatici ci hanno fatto risparmiare ore ogni settimana.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Navigation */}
      <nav className="fixed w-full bg-slate-900/80 backdrop-blur-lg z-50 border-b border-purple-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">TaskFlow</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition">Pricing</a>
              <a href="#testimonials" className="text-gray-300 hover:text-white transition">Testimonials</a>
              <button className="text-gray-300 hover:text-white transition">Login</button>
              <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition">
                Inizia Gratis
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900 border-t border-purple-500/20">
            <div className="px-4 py-4 space-y-3">
              <a href="#features" className="block text-gray-300 hover:text-white">Features</a>
              <a href="#pricing" className="block text-gray-300 hover:text-white">Pricing</a>
              <a href="#testimonials" className="block text-gray-300 hover:text-white">Testimonials</a>
              <button className="block w-full text-left text-gray-300 hover:text-white">Login</button>
              <button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg">
                Inizia Gratis
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-block mb-4 px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30">
            <span className="text-purple-300 text-sm font-medium">🚀 Nuova AI Assistant disponibile ora</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Gestione Task con
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Super Poteri AI</span>
          </h1>
          
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto">
            Organizza, collabora e ottimizza il lavoro del tuo team con l'intelligenza artificiale. 
            Analytics avanzate, automazione intelligente e insights predittivi.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition flex items-center justify-center gap-2">
              Inizia Gratis 14 Giorni
              <ArrowRight className="w-5 h-5" />
            </button>
            <button className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/20 transition border border-white/20">
              Guarda Demo
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-8 text-gray-400 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Nessuna carta richiesta</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Setup in 2 minuti</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span>Cancella quando vuoi</span>
            </div>
          </div>

          {/* Preview Image Placeholder */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 blur-3xl"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-purple-500/30 p-8 shadow-2xl">
              <div className="aspect-video bg-slate-950 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="w-20 h-20 text-purple-400 mx-auto mb-4" />
                  <p className="text-gray-400">Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Tutto quello che serve per essere produttivi
            </h2>
            <p className="text-xl text-gray-400">
              Features progettate per team moderni e ambiziosi
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-purple-500/20 hover:border-purple-500/50 transition group hover:shadow-xl hover:shadow-purple-500/20"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition text-white">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Prezzi semplici e trasparenti
            </h2>
            <p className="text-xl text-gray-400 mb-8">
              Scegli il piano perfetto per il tuo team
            </p>

            {/* Toggle Monthly/Yearly */}
            <div className="inline-flex bg-slate-800 rounded-lg p-1 border border-purple-500/20">
              <button
                onClick={() => setSelectedPlan('monthly')}
                className={`px-6 py-2 rounded-lg transition ${
                  selectedPlan === 'monthly' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'text-gray-400'
                }`}
              >
                Mensile
              </button>
              <button
                onClick={() => setSelectedPlan('yearly')}
                className={`px-6 py-2 rounded-lg transition relative ${
                  selectedPlan === 'yearly' 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' 
                    : 'text-gray-400'
                }`}
              >
                Annuale
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                  -17%
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div 
                key={index}
                className={`relative bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-2xl border ${
                  plan.popular 
                    ? 'border-purple-500 shadow-2xl shadow-purple-500/20 scale-105' 
                    : 'border-purple-500/20'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Più Popolare
                    </span>
                  </div>
                )}

                <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                <p className="text-gray-400 mb-6">{plan.description}</p>

                <div className="mb-6">
                  <span className="text-5xl font-bold text-white">
                    €{plan.price[selectedPlan]}
                  </span>
                  <span className="text-gray-400">/{selectedPlan === 'monthly' ? 'mese' : 'anno'}</span>
                </div>

                <button className={`w-full py-3 rounded-lg font-semibold transition mb-6 ${
                  plan.popular
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50'
                    : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
                }`}>
                  Inizia Ora
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Adorato da team di tutto il mondo
            </h2>
            <p className="text-xl text-gray-400">
              Scopri cosa dicono i nostri clienti
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index}
                className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl border border-purple-500/20"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
                <div>
                  <p className="text-white font-semibold">{testimonial.name}</p>
                  <p className="text-gray-400 text-sm">{testimonial.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-12 rounded-3xl border border-purple-500/30">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Pronto a trasformare il tuo workflow?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              Unisciti a migliaia di team che già usano TaskFlow ogni giorno
            </p>
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:shadow-2xl hover:shadow-purple-500/50 transition">
              Inizia Gratis Oggi
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-purple-500/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">TaskFlow</span>
              </div>
              <p className="text-gray-400 text-sm">
                La piattaforma di task management potenziata dall'AI
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Prodotto</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Features</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition">Roadmap</a></li>
                <li><a href="#" className="hover:text-white transition">Changelog</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Azienda</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Chi siamo</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Carriere</a></li>
                <li><a href="#" className="hover:text-white transition">Contatti</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4">Legale</h4>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition">Termini</a></li>
                <li><a href="#" className="hover:text-white transition">Cookie</a></li>
                <li><a href="#" className="hover:text-white transition">Licenze</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-purple-500/20 pt-8 text-center text-gray-400 text-sm">
            <p>© 2025 TaskFlow. Tutti i diritti riservati.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}