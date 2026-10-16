import React from 'react';
import { 
  Building2, 
  Search, 
  BarChart3, 
  TrendingUp, 
  Cpu, 
  Server, 
  AlertCircle,
  Menu,
  X
} from 'lucide-react';

export type NavTab = 'overview' | 'find-room' | 'utilization' | 'forecast' | 'insights' | 'status';

interface HeaderProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  systemHealth?: {
    dbType?: string;
    mlConnected?: boolean;
    dbConnected?: boolean;
  };
}

export const Header: React.FC<HeaderProps> = ({ currentTab, onSelectTab, systemHealth }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: Building2 },
    { id: 'find-room' as NavTab, label: 'Find a Room', icon: Search, highlight: true },
    { id: 'utilization' as NavTab, label: 'Space Utilization', icon: BarChart3 },
    { id: 'forecast' as NavTab, label: 'Demand Forecast', icon: TrendingUp },
    { id: 'insights' as NavTab, label: 'Model Insights', icon: Cpu },
    { id: 'status' as NavTab, label: 'System Status', icon: Server },
  ];

  const handleNavClick = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50 shadow-md">
      {/* Top Banner: Synthetic Data Disclosure */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            Datathon Benchmark
          </span>
          <span className="hidden sm:inline">
            Notice: Operating on synthetic campus-space data. Space availability & forecasts are estimated from provided datasets.
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${systemHealth?.dbConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-slate-300">DB: {systemHealth?.dbType?.includes('PostgreSQL') ? 'PostgreSQL' : 'SQLite Fallback'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${systemHealth?.mlConnected ? 'bg-teal-400' : 'bg-rose-400'}`} />
            <span className="text-slate-300">ML: datathonapi</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('overview')}>
            <div className="w-10 h-10 rounded-lg bg-gradient-to-tr from-teal-600 to-teal-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Building2 className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">CampusFlow AI</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-medium border border-teal-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">Find the right space. Make every room count.</p>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-sm'
                      : item.highlight
                      ? 'bg-slate-800 text-teal-300 hover:bg-slate-700/80 hover:text-white border border-teal-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-colors ${
                  isActive
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </header>
  );
};
