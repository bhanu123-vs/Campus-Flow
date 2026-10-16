/**
 * CampusFlow AI - Main Application Component
 * "Find the right space. Make every room count."
 */

import React, { useState, useEffect } from 'react';
import { Header, NavTab } from './components/Header';
import { OverviewPage } from './pages/OverviewPage';
import { FindRoomPage } from './pages/FindRoomPage';
import { UtilizationPage } from './pages/UtilizationPage';
import { ForecastPage } from './pages/ForecastPage';
import { ModelInsightsPage } from './pages/ModelInsightsPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { api } from './api/client';
import { Building2, Github, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTab>('find-room');
  const [systemHealth, setSystemHealth] = useState<{
    dbType?: string;
    mlConnected?: boolean;
    dbConnected?: boolean;
  }>({
    dbType: 'SQLite Fallback',
    mlConnected: true,
    dbConnected: true,
  });

  useEffect(() => {
    async function checkHealth() {
      try {
        const h = await api.getHealth();
        setSystemHealth({
          dbType: h.database?.type,
          mlConnected: h.ml_service?.connected,
          dbConnected: h.database?.is_connected,
        });
      } catch (err) {
        console.warn('Initial health check notice:', err);
      }
    }
    checkHealth();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800 font-sans antialiased selection:bg-teal-500 selection:text-white">
      {/* Top Navigation */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        systemHealth={systemHealth}
      />

      {/* Main Content View */}
      <main className="flex-1 pb-16">
        {currentTab === 'overview' && <OverviewPage onNavigate={setCurrentTab} />}
        {currentTab === 'find-room' && <FindRoomPage />}
        {currentTab === 'utilization' && <UtilizationPage />}
        {currentTab === 'forecast' && <ForecastPage />}
        {currentTab === 'insights' && <ModelInsightsPage />}
        {currentTab === 'status' && <SystemStatusPage />}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-400" />
            <span className="font-bold text-slate-200">CampusFlow AI</span>
            <span className="text-slate-600">|</span>
            <span>University Datathon Space Management Solution</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span>ML Service: <strong className="text-teal-400">datathonapi</strong></span>
            <span>•</span>
            <span>Intelligent Room Scheduling</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
