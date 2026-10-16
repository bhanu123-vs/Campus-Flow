import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  Info, 
  Clock, 
  Users, 
  Calendar, 
  Building2, 
  CheckCircle2, 
  Layers 
} from 'lucide-react';
import { api } from '../api/client';

export const UtilizationPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUtilization() {
      try {
        const resp = await api.getUtilizationAnalytics();
        setData(resp);
      } catch (err: any) {
        setError(err.message || 'Failed to load utilization data.');
      } finally {
        setLoading(false);
      }
    }
    loadUtilization();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Computing campus space utilization metrics from database...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-rose-600 font-semibold">{error || 'Unable to retrieve analytics.'}</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Observation Window Disclosure */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider">
          <BarChart3 className="w-4 h-4" />
          <span>Space Analytics & Capacity Analysis</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Campus Space Utilization
        </h1>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-start gap-3">
          <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-slate-800">Observation Window & Denominator Formulation:</span>
            <p>
              Metrics are calculated using the <strong>Standard Academic Week (Monday - Friday, 08:00 to 18:00)</strong>, providing 50 available operating daytime room-hours per room per week.
              Overlapping schedules within single rooms are deduplicated.
            </p>
          </div>
        </div>
      </div>

      {/* Top Utilization KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Overall Utilization</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {data.metrics.overall_scheduled_utilization_pct}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {data.metrics.total_weekly_scheduled_hours} of {data.metrics.total_available_operating_hours} daytime hours
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Scheduled Hours</span>
          <div className="text-3xl font-extrabold text-teal-600 mt-2">
            {data.metrics.total_weekly_scheduled_hours} hrs
          </div>
          <p className="text-xs text-slate-500 mt-1">Committed class lecture blocks</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Campus Inventory</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {data.metrics.total_rooms} Rooms
          </div>
          <p className="text-xs text-slate-500 mt-1">Across 5 distinct faculty buildings</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Recorded Special Events</span>
          <div className="text-3xl font-extrabold text-indigo-600 mt-2">
            {data.event_attendance_comparison?.length || 15}+
          </div>
          <p className="text-xs text-slate-500 mt-1">With attendance tracking</p>
        </div>
      </div>

      {/* Charts Section: Building Utilization & Hourly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Building Utilization */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Scheduled Room Hours by Building</h3>
            <p className="text-xs text-slate-500">Scheduled classroom hours vs. total daytime available capacity</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.building_utilization} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="building" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="scheduled_hours" name="Scheduled Class Hours" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available_operating_hours" name="Total Available Hours (50h/room)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Hourly Activity Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Peak Academic Demand by Hour of Day</h3>
            <p className="text-xs text-slate-500">Number of concurrent active courses scheduled across campus</p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.hourly_demand} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="hourGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="active_classes" name="Concurrent Active Classes" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#hourGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart 3: Event Attendance Analysis */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm">Event Attendance: Expected vs. Actual Turnout</h3>
          <p className="text-xs text-slate-500">Comparing organizer RSVP projections with actual campus attendance</p>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.event_attendance_comparison} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="event_type" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="expected" name="Expected Attendance" fill="#64748b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="actual" name="Actual Attendance" fill="#0d9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Utilized Rooms Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Layers className="w-4 h-4 text-teal-600" />
          Most Heavily Scheduled Campus Rooms
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider font-semibold">
                <th className="py-2.5 px-3">Room ID</th>
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Room Type</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Weekly Hours</th>
                <th className="py-2.5 px-3">Utilization Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.top_utilized_rooms?.map((rm: any) => (
                <tr key={rm.room_id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{rm.room_id}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rm.building}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rm.room_type}</td>
                  <td className="py-2.5 px-3 text-slate-600">{rm.capacity} seats</td>
                  <td className="py-2.5 px-3 font-semibold text-teal-700">{rm.scheduled_hours_week} hrs/wk</td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-bold text-slate-800">{rm.weekly_utilization_pct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
