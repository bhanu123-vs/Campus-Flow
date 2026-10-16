import React, { useState, useEffect } from 'react';
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  Clock, 
  Users, 
  Monitor, 
  Projector, 
  Accessibility, 
  Zap, 
  Building, 
  Info, 
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles
} from 'lucide-react';
import { api, RecommendationsResponse, RoomRecommendation } from '../api/client';

export const FindRoomPage: React.FC = () => {
  // Simple form state
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState('2026-10-20');
  const [startHour, setStartHour] = useState<number>(14);
  const [durationHours, setDurationHours] = useState<number>(2);
  const [requiredCapacity, setRequiredCapacity] = useState<number>(25);
  const [purpose, setPurpose] = useState('Study & Project Collaboration');
  const [projectorRequired, setProjectorRequired] = useState(true);
  const [computersRequired, setComputersRequired] = useState(false);
  const [accessibleRequired, setAccessibleRequired] = useState(false);
  const [preferredBuilding, setPreferredBuilding] = useState<string>('All Buildings');

  // Search results state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendationsResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'available' | 'conflicts'>('available');

  // Request modal state
  const [selectedRoom, setSelectedRoom] = useState<RoomRecommendation | null>(null);
  const [requestNotes, setRequestNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<{ id: number; message: string } | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    setRequestSuccess(null);

    try {
      const data = await api.getRecommendations({
        date,
        start_hour: Number(startHour),
        duration_hours: Number(durationHours),
        required_capacity: Number(requiredCapacity),
        purpose,
        projector_required: projectorRequired,
        computers_required: computersRequired,
        accessible_required: accessibleRequired,
        preferred_building: preferredBuilding === 'All Buildings' ? undefined : preferredBuilding,
      });
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Failed to search rooms. Verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  // Run initial search on mount
  useEffect(() => {
    handleSearch();
  }, []);

  const handleOpenRequestModal = (room: RoomRecommendation) => {
    setSelectedRoom(room);
    setRequestNotes(`Requested space for ${purpose} (${requiredCapacity} attendees)`);
  };

  const handleSubmitBooking = async () => {
    if (!selectedRoom) return;
    setSubmitting(true);
    setError(null);

    try {
      const resp = await api.submitRequest({
        request_date: date,
        start_hour: Number(startHour),
        duration_hours: Number(durationHours),
        required_capacity: Number(requiredCapacity),
        purpose: `${purpose}${requestNotes ? ` - ${requestNotes}` : ''}`,
        requested_room_id: selectedRoom.room_id,
        projector_required: projectorRequired,
        computers_required: computersRequired,
      });

      setRequestSuccess({
        id: resp.request_id,
        message: resp.message,
      });
      setSelectedRoom(null);
    } catch (err: any) {
      setError(err.message || 'Failed to submit room request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Tagline */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/60 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-teal-500/5 blur-3xl pointer-events-none" />
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 text-teal-300 text-xs font-semibold border border-teal-500/20">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            Intelligent Space Matcher
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Find the right space. Make every room count.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Enter your booking requirements below. CampusFlow checks real classroom schedules and event timetables to find conflict-free rooms with transparent qualifications.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {requestSuccess && (
        <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-5 flex items-start gap-4 text-emerald-200">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-emerald-100">Room Request #{requestSuccess.id} Successfully Recorded</h3>
            <p className="text-sm text-emerald-300/90">{requestSuccess.message}</p>
            <p className="text-xs text-emerald-400 font-mono mt-1">
              Persisted in database. Track status on Overview and System Status pages.
            </p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="bg-rose-950/60 border border-rose-500/40 rounded-xl p-4 flex items-center gap-3 text-rose-200">
          <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Search Criteria Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Search className="w-5 h-5 text-teal-600" />
          Specify Your Space Requirements
        </h2>

        <form onSubmit={handleSearch} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Date */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Booking Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 font-medium"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Start Time
              </label>
              <div className="relative">
                <select
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 font-medium"
                >
                  <option value={8}>08:00 AM</option>
                  <option value={9}>09:00 AM</option>
                  <option value={10}>10:00 AM</option>
                  <option value={11}>11:00 AM</option>
                  <option value={12}>12:00 PM (Noon)</option>
                  <option value={13}>01:00 PM</option>
                  <option value={14}>02:00 PM</option>
                  <option value={15}>03:00 PM</option>
                  <option value={16}>04:00 PM</option>
                  <option value={17}>05:00 PM</option>
                  <option value={18}>06:00 PM</option>
                  <option value={19}>07:00 PM</option>
                </select>
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Duration
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 font-medium"
              >
                <option value={1}>1 Hour</option>
                <option value={2}>2 Hours</option>
                <option value={3}>3 Hours</option>
                <option value={4}>4 Hours</option>
                <option value={6}>6 Hours (Half Day)</option>
              </select>
            </div>

            {/* Required Capacity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Min. Capacity
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={requiredCapacity}
                  onChange={(e) => setRequiredCapacity(Number(e.target.value))}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800 font-medium"
                  placeholder="e.g. 25"
                  required
                />
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
            {/* Purpose */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Purpose of Reservation
              </label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g. Study Group, Coding Session, TA Review"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800"
                required
              />
            </div>

            {/* Preferred Building */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">
                Preferred Campus Building (Optional)
              </label>
              <div className="relative">
                <select
                  value={preferredBuilding}
                  onChange={(e) => setPreferredBuilding(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 text-sm text-slate-800"
                >
                  <option value="All Buildings">All Buildings (No Preference)</option>
                  <option value="Science Complex">Science Complex</option>
                  <option value="Engineering Hall">Engineering Hall</option>
                  <option value="Humanities Center">Humanities Center</option>
                  <option value="Student Commons">Student Commons</option>
                  <option value="Innovation Hub">Innovation Hub</option>
                </select>
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Facility Checkboxes */}
          <div className="pt-2">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
              Required Facilities & Equipment
            </span>
            <div className="flex flex-wrap gap-4 sm:gap-6">
              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={projectorRequired}
                  onChange={(e) => setProjectorRequired(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <Projector className="w-4 h-4 text-slate-600" />
                <span>Projector Required</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={computersRequired}
                  onChange={(e) => setComputersRequired(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <Monitor className="w-4 h-4 text-slate-600" />
                <span>Computer Workstations</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 bg-slate-50 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                <input
                  type="checkbox"
                  checked={accessibleRequired}
                  onChange={(e) => setAccessibleRequired(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <Accessibility className="w-4 h-4 text-slate-600" />
                <span>Wheelchair Accessible</span>
              </label>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100 flex-wrap gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-teal-600" />
              <span>Interval logic: checks class schedules & events between {startHour}:00 - {startHour + durationHours}:00.</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking Schedules...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Find Available Rooms</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Results Section */}
      {results && (
        <div className="space-y-6">
          {/* Results Summary Banner */}
          <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-sm font-bold text-slate-900">
                Found {results.available_count} Available Room{results.available_count !== 1 ? 's' : ''} on {results.search_parameters.weekday}, {results.search_parameters.target_date}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated {results.total_rooms_evaluated} total campus rooms • Time window: {results.search_parameters.start_hour}:00 - {results.search_parameters.end_hour}:00 • {results.unavailable_count} occupied or conflicting
              </p>
            </div>

            {/* Results Tab Toggles */}
            <div className="flex rounded-lg bg-white p-1 border border-slate-300 shadow-xs self-stretch sm:self-auto">
              <button
                onClick={() => setActiveTab('available')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'available'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Available ({results.available_count})</span>
              </button>
              <button
                onClick={() => setActiveTab('conflicts')}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  activeTab === 'conflicts'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Conflicts & Occupied ({results.unavailable_count})</span>
              </button>
            </div>
          </div>

          {/* Available Rooms List */}
          {activeTab === 'available' && (
            <div className="space-y-4">
              {results.recommendations.length === 0 ? (
                <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
                    <Search className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800">No conflict-free rooms found matching all criteria</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto">
                    Try adjusting your requested time, choosing a different hour, or relaxing equipment constraints to discover available spaces.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {results.recommendations.map((room) => (
                    <div
                      key={room.room_id}
                      className="bg-white rounded-xl border border-slate-200 hover:border-teal-500/50 hover:shadow-md transition-all p-5 flex flex-col justify-between space-y-4"
                    >
                      <div>
                        {/* Top Bar: Room ID, Building, Match Score */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-slate-900">{room.room_id}</span>
                              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                {room.room_type}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {room.building} • Floor {room.floor}
                            </p>
                          </div>

                          {room.fit_score && (
                            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              {room.fit_score}% Fit
                            </span>
                          )}
                        </div>

                        {/* Room Specifications & Equipment */}
                        <div className="flex flex-wrap gap-2 mt-3 text-xs">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-50 text-slate-700 border border-slate-200 font-medium">
                            <Users className="w-3.5 h-3.5 text-slate-500" />
                            {room.capacity} Seats
                          </span>
                          {room.projector && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                              <Projector className="w-3.5 h-3.5 text-teal-600" />
                              Projector
                            </span>
                          )}
                          {room.computers && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                              <Monitor className="w-3.5 h-3.5 text-blue-600" />
                              Computers
                            </span>
                          )}
                          {room.accessible && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                              <Accessibility className="w-3.5 h-3.5 text-indigo-600" />
                              Accessible
                            </span>
                          )}
                          {room.power_outlets && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                              <Zap className="w-3.5 h-3.5 text-amber-600" />
                              Outlets
                            </span>
                          )}
                        </div>

                        {/* Transparent Qualification Explanations */}
                        <div className="mt-4 bg-slate-50/80 rounded-lg p-3 border border-slate-200/80 space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Qualification Reasons:
                          </span>
                          {room.qualifications.map((q, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-slate-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                              <span>{q}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Request Room Action */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          Estimated available from dataset
                        </span>
                        <button
                          onClick={() => handleOpenRequestModal(room)}
                          className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <span>Request Space</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Conflicting / Unavailable Rooms Tab */}
          {activeTab === 'conflicts' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  These rooms are either occupied by recorded recurring class lectures, scheduled university events, or do not meet your required capacity or facilities. Detailed conflict reasons are extracted directly from the dataset.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.unavailable_sample.map((room) => (
                  <div
                    key={room.room_id}
                    className="bg-white rounded-xl border border-rose-200/80 p-5 space-y-3 opacity-90"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-slate-800">{room.room_id}</span>
                          <span className="text-xs px-2 py-0.5 rounded bg-rose-50 text-rose-700 font-semibold border border-rose-200">
                            Unavailable
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{room.building} • {room.room_type} (Capacity: {room.capacity})</p>
                      </div>
                    </div>

                    {/* Conflict Items */}
                    <div className="space-y-2">
                      {room.conflicts.length > 0 ? (
                        room.conflicts.map((c, cIdx) => (
                          <div key={cIdx} className="bg-rose-50/70 border border-rose-200 rounded-lg p-2.5 text-xs text-rose-900">
                            <div className="font-semibold flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>{c.type}: {c.details}</span>
                            </div>
                            <div className="mt-1 text-[11px] text-rose-700">
                              Occupied Window: {c.time} (Overlap: {c.overlap_window})
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700">
                          {room.qualifications.filter(q => q.includes('Insufficient') || q.includes('Lacks')).map((reason, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5 text-amber-800">
                              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Room Request Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                  Submit Space Allocation Request
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  Request {selectedRoom.room_id}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedRoom.building} • {selectedRoom.room_type} ({selectedRoom.capacity} seats)
                </p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Date:</span>
                  <span className="font-semibold text-slate-800">{date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Time Window:</span>
                  <span className="font-semibold text-slate-800">{startHour}:00 - {startHour + durationHours}:00 ({durationHours} hours)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Required Capacity:</span>
                  <span className="font-semibold text-slate-800">{requiredCapacity} people</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Intended Purpose:</span>
                  <span className="font-semibold text-slate-800">{purpose}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Additional Request Notes
                </label>
                <textarea
                  rows={3}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Specify setup preferences, special requirements, or organizer contact details..."
                />
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-lg p-3 text-amber-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-700" />
                  <span>Important Reservation Notice</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Submitting this form records a formal space request into the database. Because this prototype runs on synthetic university datathon data, requests are marked "Pending Review" rather than confirmed physical room keys.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRoom(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitBooking}
                className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Recording in Database...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm & Submit Request</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
