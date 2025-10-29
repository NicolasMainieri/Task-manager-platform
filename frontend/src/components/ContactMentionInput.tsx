import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { X, User } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

interface Contact {
  id: string;
  nome: string;
  cognome?: string;
  email?: string;
  azienda?: string;
  avatar?: string;
}

interface ContactMentionInputProps {
  selectedContacts: string[]; // Array di contact IDs
  onChange: (contactIds: string[]) => void;
  label?: string;
  placeholder?: string;
}

const ContactMentionInput: React.FC<ContactMentionInputProps> = ({
  selectedContacts,
  onChange,
  label = 'Contatti',
  placeholder = 'Cerca e aggiungi contatti...'
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedContactsData, setSelectedContactsData] = useState<Contact[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  useEffect(() => {
    // Carica i dati completi dei contatti selezionati
    if (selectedContacts.length > 0 && contacts.length > 0) {
      const contactsData = contacts.filter(c => selectedContacts.includes(c.id));
      setSelectedContactsData(contactsData);
    } else {
      setSelectedContactsData([]);
    }
  }, [selectedContacts, contacts]);

  useEffect(() => {
    // Filtra i contatti in base alla ricerca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = contacts.filter(contact =>
        !selectedContacts.includes(contact.id) && (
          contact.nome.toLowerCase().includes(query) ||
          contact.cognome?.toLowerCase().includes(query) ||
          contact.email?.toLowerCase().includes(query) ||
          contact.azienda?.toLowerCase().includes(query)
        )
      );
      setFilteredContacts(filtered);
    } else {
      setFilteredContacts(contacts.filter(c => !selectedContacts.includes(c.id)));
    }
  }, [searchQuery, contacts, selectedContacts]);

  useEffect(() => {
    // Chiudi dropdown quando si clicca fuori
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchContacts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data.contacts || response.data);
    } catch (error) {
      console.error('Error fetching contacts:', error);
    }
  };

  const addContact = (contactId: string) => {
    onChange([...selectedContacts, contactId]);
    setSearchQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeContact = (contactId: string) => {
    onChange(selectedContacts.filter(id => id !== contactId));
  };

  const getInitials = (contact: Contact) => {
    const first = contact.nome[0] || '';
    const last = contact.cognome?.[0] || '';
    return (first + last).toUpperCase();
  };

  const getDisplayName = (contact: Contact) => {
    return `${contact.nome} ${contact.cognome || ''}`.trim();
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-400">
          {label}
        </label>
      )}

      {/* Selected Contacts */}
      {selectedContactsData.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedContactsData.map(contact => (
            <div
              key={contact.id}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200"
            >
              {contact.avatar ? (
                <img
                  src={contact.avatar}
                  alt={getDisplayName(contact)}
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                  {getInitials(contact)}
                </div>
              )}
              <span className="text-sm font-medium">{getDisplayName(contact)}</span>
              {contact.azienda && (
                <span className="text-xs text-indigo-500">({contact.azienda})</span>
              )}
              <button
                type="button"
                onClick={() => removeContact(contact.id)}
                className="text-indigo-500 hover:text-indigo-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-slate-900 border border-indigo-500/30 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* Dropdown */}
        {showDropdown && filteredContacts.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-indigo-500/30 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {filteredContacts.slice(0, 10).map(contact => (
              <button
                key={contact.id}
                type="button"
                onClick={() => addContact(contact.id)}
                className="w-full px-3 py-2 flex items-center gap-3 hover:bg-slate-700 text-left"
              >
                {contact.avatar ? (
                  <img
                    src={contact.avatar}
                    alt={getDisplayName(contact)}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                    {getInitials(contact)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white truncate">
                    {getDisplayName(contact)}
                  </div>
                  <div className="text-sm text-gray-400 truncate">
                    {contact.azienda && <span>{contact.azienda}</span>}
                    {contact.azienda && contact.email && <span> • </span>}
                    {contact.email && <span>{contact.email}</span>}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showDropdown && filteredContacts.length === 0 && searchQuery && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-slate-800 border border-indigo-500/30 rounded-lg shadow-lg p-3 text-center text-gray-400 text-sm"
          >
            Nessun contatto trovato
          </div>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-gray-500">
        Digita @ seguito dal nome per cercare un contatto
      </p>
    </div>
  );
};

export default ContactMentionInput;
