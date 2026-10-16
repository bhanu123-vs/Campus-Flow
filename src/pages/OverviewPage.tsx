import React, { useEffect, useState } from 'react';
import { 
  Building2, 
  Users, 
  BookOpen, 
  CalendarDays, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ShieldAlert, 
  Activity,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../api/client';
import { NavTab } from '../components/Header';

interface OverviewPageProps {
  onNavigate: (tab: NavTab) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ onNavigate }) => {
  const [summary, setSummary] = useState<any>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [sumData, reqData] = await Promise.all([
          api.getDashboardSummary(),
          api.getRecentRequests(8)
        ]);
        setSummary(sumData);
        setRecentRequests(reqData);
      } catch (err) {
        console.error('Failed to load overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-teal-500/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-semibold border border-teal-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            Campus Space Intelligence
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Find the right space. <br />
            <span className="text-teal-400">Make every room count.</span>
          </h1>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            CampusFlow AI addresses university space discovery by coupling interval-overlap schedule conflict detection with an independently trained machine learning demand forecasting engine.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            <button
              onClick={() => onNavigate('find-room')}
              className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Find a Room Now</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('forecast')}
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm border border-slate-700 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Activity className="w-4 h-4 text-teal-400" />
              <span>Explore ML Demand Forecast</span>
            </button>
          </div>
        </div>
      </div>

      {/* Synthetic Dataset Disclosure Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-slate-900">Synthetic Datathon Dataset Disclosure</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            The data powering this application was provided as part of the University Datathon (<code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-800">02_education_campus_space</code>).
            All class schedules, rooms, and historical room requests are synthetic benchmark observations. Availability calculations reflect schedule records rather than physical IoT sensor occupancy.
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Campus Rooms</span>
            <Building2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {loading ? '...' : summary?.total_rooms || 45}
          </div>
          <p className="text-xs text-slate-500">Across {summary?.total_buildings || 5} academic buildings</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Seating Capacity</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {loading ? '...' : summary?.total_campus_capacity?.toLocaleString() || '2,450'}
          </div>
          <p className="text-xs text-slate-500">{summary?.accessible_rooms || 34} wheelchair accessible rooms</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Weekly Classes</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {loading ? '...' : summary?.total_scheduled_classes || 95}
          </div>
          <p className="text-xs text-slate-500">Recurring lectures & laboratories</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">Intake Room Requests</span>
            <CalendarDays className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {loading ? '...' : summary?.total_room_requests || 868}
          </div>
          <p className="text-xs text-slate-500">Persisted in PostgreSQL/SQLite</p>
        </div>
      </div>

      {/* Buildings & Quick Space Finder split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buildings Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Buildings in Inventory
            </h3>
            <span className="text-xs text-slate-400">5 Buildings</span>
          </div>

          <div className="space-y-3">
            {summary?.buildings_breakdown?.map((b: any) => (
              <div key={b.building} className="space-y-1">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-700">{b.building}</span>
                  <span className="text-slate-500 font-semibold">{b.count} Rooms</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-teal-600 h-2 rounded-full"
                    style={{ width: `${(b.count / 15) * 100}%` }}
                  />
                </div>
              </div>
            )) || (
              <p className="text-xs text-slate-400">Loading building inventory...</p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigate('utilization')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <span>View deep utilization metrics</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Recent Room Requests Feed */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-teal-600" />
                Recent Room Allocation Requests
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time request records stored in database
              </p>
            </div>
            <button
              onClick={() => onNavigate('find-room')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Submit New</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3">Req ID</th>
                  <th className="py-2.5 px-3">Date & Time</th>
                  <th className="py-2.5 px-3">Purpose</th>
                  <th className="py-2.5 px-3">Capacity</th>
                  <th className="py-2.5 px-3">Target Room</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentRequests.map((req) => (
                  <tr key={req.request_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                      #{req.request_id}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 font-medium">
                      {req.request_date} @ {req.start_hour}:00
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[160px] truncate">
                      {req.purpose}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {req.required_capacity} seats
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-teal-700">
                      {req.requested_room_id || 'Unspecified'}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        req.status === 'Approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : req.status === 'Rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
