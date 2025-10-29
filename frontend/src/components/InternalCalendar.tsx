import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar as CalendarIcon, Plus, X, Edit, Trash2, Clock, MapPin, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import ContactMentionInput from './ContactMentionInput';
import API_URL from '../config/api';

interface CalendarEvent {
  id: string;
  titolo: string;
  descrizione?: string;
  tipo: string;
  dataInizio: string;
  dataFine: string;
  luogo?: string;
  linkMeeting?: string;
  allDay: boolean;
  colore?: string;
  organizerId: string;
  organizer: {
    nome: string;
    cognome: string;
    avatar?: string;
  };
  partecipanti: any[];
  taskId?: string;
  reminderMinutes?: number;
}

type ViewMode = 'month' | 'week' | 'day';

const InternalCalendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [formData, setFormData] = useState({
    titolo: '',
    descrizione: '',
    tipo: 'meeting',
    dataInizio: '',
    dataFine: '',
    luogo: '',
    linkMeeting: '',
    allDay: false,
    colore: '#3B82F6',
    reminderMinutes: 15,
    contactIds: [] as string[],
  });

  const token = localStorage.getItem('token');

  useEffect(() => {
    loadEvents();
  }, [currentDate, viewMode]);

  const loadEvents = async () => {
    try {
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();

      const response = await axios.get(`${API_URL}/calendar/events`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
      setEvents(response.data);
    } catch (error) {
      console.error('Errore caricamento eventi:', error);
    }
  };

  const getViewStartDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'month') {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      return date;
    } else if (viewMode === 'week') {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
      return date;
    } else {
      date.setHours(0, 0, 0, 0);
      return date;
    }
  };

  const getViewEndDate = () => {
    const date = new Date(currentDate);
    if (viewMode === 'month') {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
      return date;
    } else if (viewMode === 'week') {
      const day = date.getDay();
      date.setDate(date.getDate() - day + 6);
      date.setHours(23, 59, 59, 999);
      return date;
    } else {
      date.setHours(23, 59, 59, 999);
      return date;
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedEvent) {
        await axios.put(
          `${API_URL}/calendar/events/${selectedEvent.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${API_URL}/calendar/events`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      setShowEventModal(false);
      resetForm();
      loadEvents();
    } catch (error) {
      console.error('Errore salvataggio evento:', error);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo evento?')) return;

    try {
      await axios.delete(`${API_URL}/calendar/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      loadEvents();
    } catch (error) {
      console.error('Errore eliminazione evento:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      titolo: '',
      descrizione: '',
      tipo: 'meeting',
      dataInizio: '',
      dataFine: '',
      luogo: '',
      linkMeeting: '',
      allDay: false,
      colore: '#3B82F6',
      reminderMinutes: 15,
      contactIds: [],
    });
    setSelectedEvent(null);
  };

  const openEventModal = (event?: CalendarEvent) => {
    if (event) {
      setSelectedEvent(event);
      // Parse contactIds if stored as JSON string in the event
      let contactIds: string[] = [];
      try {
        contactIds = typeof (event as any).contactIds === 'string'
          ? JSON.parse((event as any).contactIds)
          : (event as any).contactIds || [];
      } catch {
        contactIds = [];
      }

      setFormData({
        titolo: event.titolo,
        descrizione: event.descrizione || '',
        tipo: event.tipo,
        dataInizio: new Date(event.dataInizio).toISOString().slice(0, 16),
        dataFine: new Date(event.dataFine).toISOString().slice(0, 16),
        luogo: event.luogo || '',
        linkMeeting: event.linkMeeting || '',
        allDay: event.allDay,
        colore: event.colore || '#3B82F6',
        reminderMinutes: event.reminderMinutes || 15,
        contactIds: contactIds,
      });
    } else {
      resetForm();
    }
    setShowEventModal(true);
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDay = (date: Date | null) => {
    if (!date) return [];
    return events.filter((event) => {
      const eventStart = new Date(event.dataInizio);
      return (
        eventStart.getDate() === date.getDate() &&
        eventStart.getMonth() === date.getMonth() &&
        eventStart.getFullYear() === date.getFullYear()
      );
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const getDateString = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    } else if (viewMode === 'week') {
      const start = getViewStartDate();
      const end = getViewEndDate();
      return `${start.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Calendario Interno</h2>
          <p className="text-gray-400">Gestisci eventi e scadenze</p>
        </div>
        <button
          onClick={() => openEventModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Nuovo Evento
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
          >
            Oggi
          </button>
          <button
            onClick={() => navigateDate('next')}
            className="p-2 hover:bg-slate-700 rounded-lg"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold ml-4 capitalize">{getDateString()}</span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('day')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'day' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            Giorno
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            Settimana
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}`}
          >
            Mese
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      {viewMode === 'month' && (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-indigo-500/20">
            {['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'].map((day) => (
              <div key={day} className="p-3 text-center text-gray-400 font-semibold">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7">
            {getDaysInMonth().map((date, index) => {
              const dayEvents = date ? getEventsForDay(date) : [];
              const isToday = date && date.toDateString() === new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`min-h-[120px] p-2 border-r border-b border-indigo-500/20 ${
                    !date ? 'bg-slate-900/50' : 'hover:bg-slate-700/30'
                  }`}
                >
                  {date && (
                    <>
                      <div className={`text-right mb-2 ${isToday ? 'text-blue-400 font-bold' : 'text-gray-300'}`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            onClick={() => openEventModal(event)}
                            className="text-xs p-1 rounded cursor-pointer truncate"
                            style={{ backgroundColor: event.colore + '40', color: event.colore }}
                          >
                            {event.titolo}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-xs text-gray-400">+{dayEvents.length - 3} altri</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View for Week/Day */}
      {(viewMode === 'week' || viewMode === 'day') && (
        <div className="space-y-3">
          {events.length > 0 ? (
            events.map((event) => (
              <div
                key={event.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-4 hover:border-indigo-500/40"
                style={{ borderLeftColor: event.colore, borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-2">{event.titolo}</h3>
                    {event.descrizione && (
                      <p className="text-gray-400 text-sm mb-3">{event.descrizione}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {new Date(event.dataInizio).toLocaleString('it-IT', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {event.luogo && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.luogo}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {event.organizer.nome} {event.organizer.cognome}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEventModal(event)}
                      className="p-2 hover:bg-slate-700 rounded-lg"
                    >
                      <Edit className="w-4 h-4 text-blue-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id)}
                      className="p-2 hover:bg-slate-700 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-lg p-12 text-center">
              <CalendarIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Nessun evento</h3>
              <p className="text-gray-400">Non ci sono eventi per questo periodo</p>
            </div>
          )}
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-indigo-500/20 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-indigo-500/20">
              <h2 className="text-xl font-bold text-white">
                {selectedEvent ? 'Modifica Evento' : 'Nuovo Evento'}
              </h2>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Titolo *</label>
                <input
                  type="text"
                  value={formData.titolo}
                  onChange={(e) => setFormData({ ...formData, titolo: e.target.value })}
                  required
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrizione</label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                  >
                    <option value="meeting">Riunione</option>
                    <option value="task">Task</option>
                    <option value="reminder">Promemoria</option>
                    <option value="holiday">Festività</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Colore</label>
                  <input
                    type="color"
                    value={formData.colore}
                    onChange={(e) => setFormData({ ...formData, colore: e.target.value })}
                    className="w-full h-10 bg-slate-700 rounded-lg border border-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data Inizio *</label>
                  <input
                    type="datetime-local"
                    value={formData.dataInizio}
                    onChange={(e) => setFormData({ ...formData, dataInizio: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data Fine *</label>
                  <input
                    type="datetime-local"
                    value={formData.dataFine}
                    onChange={(e) => setFormData({ ...formData, dataFine: e.target.value })}
                    required
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                    className="rounded"
                  />
                  Tutto il giorno
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Luogo</label>
                <input
                  type="text"
                  value={formData.luogo}
                  onChange={(e) => setFormData({ ...formData, luogo: e.target.value })}
                  placeholder="Es: Sala Riunioni A"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Link Meeting</label>
                <input
                  type="url"
                  value={formData.linkMeeting}
                  onChange={(e) => setFormData({ ...formData, linkMeeting: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Promemoria (minuti prima)
                </label>
                <input
                  type="number"
                  value={formData.reminderMinutes}
                  onChange={(e) => setFormData({ ...formData, reminderMinutes: parseInt(e.target.value) })}
                  min="0"
                  className="w-full px-3 py-2 bg-slate-700 text-white rounded-lg border border-indigo-500/20"
                />
              </div>

              {/* Contatti */}
              <div>
                <ContactMentionInput
                  selectedContacts={formData.contactIds}
                  onChange={(contactIds) => setFormData({ ...formData, contactIds })}
                  label="Contatti associati"
                  placeholder="Cerca contatti da associare all'evento..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {selectedEvent ? 'Salva Modifiche' : 'Crea Evento'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEventModal(false);
                    resetForm();
                  }}
                  className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternalCalendar;
