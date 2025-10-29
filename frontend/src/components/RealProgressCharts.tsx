import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Users, BarChart3, Calendar } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

interface ProgressData {
  tasksLast7Days: Array<{
    date: string;
    count: number;
  }>;
  teamPerformance: Array<{
    id: string;
    nome: string;
    colore?: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  }>;
}

const RealProgressCharts: React.FC = () => {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analytics/real-progress-data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(response.data);
    } catch (error) {
      console.error('Errore nel caricamento dati progressi:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 h-64 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6 h-64 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/50 backdrop-blur-sm border border-red-500/20 rounded-2xl p-6">
        <p className="text-red-400">Errore nel caricamento dei dati</p>
      </div>
    );
  }

  // Prepara dati per il grafico task ultimi 7 giorni
  const days = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split('T')[0];
  });

  const tasksChartData = last7Days.map((date, index) => {
    const dayData = data.tasksLast7Days.find(d => d.date?.toString().startsWith(date));
    return {
      day: days[index],
      count: dayData ? dayData.count : 0
    };
  });

  const maxTasks = Math.max(...tasksChartData.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-indigo-600 rounded-xl">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Grafici Progressi Aziendali</h2>
          <p className="text-gray-400 text-sm">Dati in tempo reale basati sulle performance del team</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico Task Completati Ultimi 7 Giorni */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-400" />
              <h3 className="text-white font-bold">Task Completati (Ultimi 7 Giorni)</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-indigo-400">
                {tasksChartData.reduce((sum, d) => sum + d.count, 0)}
              </p>
              <p className="text-xs text-gray-500">Totale</p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-48 flex items-end justify-between gap-2">
            {tasksChartData.map((item, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative group">
                  {/* Bar */}
                  <div
                    className="w-full bg-gradient-to-t from-indigo-600 to-purple-500 rounded-t transition-all duration-300 hover:from-indigo-500 hover:to-purple-400 cursor-pointer"
                    style={{
                      height: item.count > 0 ? `${(item.count / maxTasks) * 100}%` : '4px',
                      minHeight: '4px'
                    }}
                  />
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 border border-indigo-500/50 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {item.count} task
                  </div>
                </div>
                {/* Value on top */}
                {item.count > 0 && (
                  <span className="text-xs font-bold text-indigo-400">{item.count}</span>
                )}
              </div>
            ))}
          </div>

          {/* Days Labels */}
          <div className="flex justify-between text-gray-400 text-xs mt-3 pt-3 border-t border-slate-700">
            {tasksChartData.map((item, i) => (
              <span key={i} className="flex-1 text-center">{item.day}</span>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-400">
            <div className="w-3 h-3 bg-gradient-to-t from-indigo-600 to-purple-500 rounded"></div>
            <span>Task completate</span>
          </div>
        </div>

        {/* Grafico Performance Team */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-indigo-500/20 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-bold">Performance Team</h3>
          </div>

          {data.teamPerformance.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              <p>Nessun team disponibile</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.teamPerformance.slice(0, 5).map((team) => (
                <div key={team.id}>
                  <div className="flex justify-between items-center text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: team.colore || '#6366f1' }}
                      />
                      <span className="text-gray-300 font-medium">{team.nome}</span>
                      <span className="text-gray-500 text-xs">
                        ({team.completedTasks}/{team.totalTasks})
                      </span>
                    </div>
                    <span className="text-white font-bold">{team.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${team.completionRate}%`,
                        background: team.colore
                          ? `linear-gradient(to right, ${team.colore}, ${team.colore}dd)`
                          : 'linear-gradient(to right, #6366f1, #8b5cf6)'
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-white">
                      {data.teamPerformance.length}
                    </p>
                    <p className="text-xs text-gray-400">Team Attivi</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-400">
                      {data.teamPerformance.reduce((sum, t) => sum + t.completedTasks, 0)}
                    </p>
                    <p className="text-xs text-gray-400">Task Completate</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-400">
                      {Math.round(
                        data.teamPerformance.reduce((sum, t) => sum + t.completionRate, 0) /
                          Math.max(data.teamPerformance.length, 1)
                      )}%
                    </p>
                    <p className="text-xs text-gray-400">Media Completamento</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Statistiche Aggiuntive */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <p className="text-gray-400 text-sm font-semibold">Trend Settimanale</p>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {tasksChartData.length >= 2
              ? tasksChartData[tasksChartData.length - 1].count > tasksChartData[0].count
                ? '+' +
                  Math.round(
                    ((tasksChartData[tasksChartData.length - 1].count - tasksChartData[0].count) /
                      Math.max(tasksChartData[0].count, 1)) *
                      100
                  ) +
                  '%'
                : Math.round(
                    ((tasksChartData[tasksChartData.length - 1].count - tasksChartData[0].count) /
                      Math.max(tasksChartData[0].count, 1)) *
                      100
                  ) + '%'
              : 'N/A'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Rispetto all'inizio settimana</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <p className="text-gray-400 text-sm font-semibold">Media Giornaliera</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {Math.round(tasksChartData.reduce((sum, d) => sum + d.count, 0) / 7)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Task completate al giorno</p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-purple-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-5 h-5 text-purple-400" />
            <p className="text-gray-400 text-sm font-semibold">Team più Performante</p>
          </div>
          {data.teamPerformance.length > 0 ? (
            <>
              <p className="text-2xl font-bold text-purple-400">
                {data.teamPerformance.reduce((best, team) =>
                  team.completionRate > best.completionRate ? team : best
                ).nome}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {data.teamPerformance.reduce((best, team) =>
                  team.completionRate > best.completionRate ? team : best
                ).completionRate}% completamento
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-400">N/A</p>
              <p className="text-xs text-gray-500 mt-1">Nessun team disponibile</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealProgressCharts;
