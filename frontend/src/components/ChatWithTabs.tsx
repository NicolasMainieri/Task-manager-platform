import React, { useState } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import CompanyChat from './CompanyChat';
import DirectMessages from './DirectMessages';

const ChatWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'company' | 'direct'>('company');

  return (
    <div className="h-full flex flex-col">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-lg">
        <button
          onClick={() => setActiveTab('company')}
          className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'company'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          Chat di Gruppo
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`flex-1 px-6 py-4 font-semibold transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'direct'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Send className="w-5 h-5" />
          Messaggi Diretti
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'company' ? (
          <CompanyChat />
        ) : (
          <div className="h-full">
            <DirectMessages />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatWithTabs;
