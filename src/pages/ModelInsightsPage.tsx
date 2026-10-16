import React, { useEffect, useState } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  BarChart, 
  Bar 
} from 'recharts';
import { 
  Cpu, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Layers, 
  Info, 
  Calendar, 
  TrendingUp, 
  Award,
  AlertTriangle
} from 'lucide-react';
import { api } from '../api/client';

export const ModelInsightsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getModelMetrics();
      setMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch model metrics. Ensure datathonapi is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const resp = await api.retrainModel();
      setRetrainResult(resp.message || 'Retraining finished.');
      await loadMetrics();
    } catch (err: any) {
      setRetrainResult(`Retrain error: ${err.message}`);
    } finally {
      setRetraining(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-slate-500 font-medium">Loading ML evaluation metrics from datathonapi...</p>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-rose-600 font-semibold">{error || 'ML Service unavailable'}</p>
        <button
          onClick={loadMetrics}
          className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-700"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Feature importances transformed for bar chart
  const featureData = Object.entries(metrics.feature_importances || {}).map(([key, val]) => ({
    feature: key,
    importance: Math.round(Number(val) * 1000) / 10,
  })).sort((a, b) => b.importance - a.importance);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Title & Status Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-600 text-xs font-bold uppercase tracking-wider">
            <Cpu className="w-4 h-4" />
            <span>Machine Learning Architecture & Validation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Demand Model Insights
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Trained artifact: <span className="font-mono text-slate-700">{metrics.model_name}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Artifact Status: {metrics.training_status}
          </span>

          <button
            onClick={handleRetrain}
            disabled={retraining}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${retraining ? 'animate-spin' : ''}`} />
            <span>{retraining ? 'Retraining...' : 'Retrain Model'}</span>
          </button>
        </div>
      </div>

      {retrainResult && (
        <div className="bg-slate-900 text-teal-300 p-4 rounded-xl text-xs font-mono border border-slate-800">
          {retrainResult}
        </div>
      )}

      {/* Model Performance Comparison Scorecard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Model MAE</span>
          <div className="text-3xl font-extrabold text-slate-900">
            {metrics.model_mae}
          </div>
          <p className="text-xs text-slate-500">Mean Absolute Error (Test Set)</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Baseline MAE</span>
          <div className="text-3xl font-extrabold text-slate-600">
            {metrics.baseline_mae}
          </div>
          <p className="text-xs text-slate-500">Day-of-Week Historical Average</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Model RMSE</span>
          <div className="text-3xl font-extrabold text-teal-600">
            {metrics.model_rmse}
          </div>
          <p className="text-xs text-slate-500">Root Mean Squared Error</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Baseline Comparison</span>
          <div className="flex items-center gap-2 mt-1">
            {metrics.beat_baseline ? (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                <Award className="w-4 h-4 text-emerald-600" />
                Beat Baseline (+{metrics.improvement_pct}%)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                Comparable to Baseline ({metrics.improvement_pct}%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Transparent evaluation without inflation</p>
        </div>
      </div>

      {/* Held-out Test Set Evaluation Comparison Chart */}
      {metrics.test_eval_series?.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Held-Out Test Set Performance (Actual vs. Predicted vs. Baseline)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Evaluated on {metrics.test_observations} held-out test dates using strictly chronological splitting (no future leakage).
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-slate-900">
                <span className="w-3 h-1 bg-slate-900 rounded-full" />
                Actual Demand
              </span>
              <span className="flex items-center gap-1.5 text-teal-600">
                <span className="w-3 h-1 bg-teal-600 rounded-full" />
                Random Forest
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-slate-400 border border-dashed rounded-full" />
                Baseline (Day-of-Week Mean)
              </span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.test_eval_series} margin={{ top: 15, right: 15, left: -10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="actual" name="Actual Requests" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="predicted" name="RandomForest Prediction" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="baseline" name="Day-of-Week Baseline" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Feature Importance & Methodology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Engineered Feature Importances</h3>
            <p className="text-xs text-slate-500">Relative contribution of temporal and lagged features in Random Forest</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" />
                <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={90} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  formatter={(val: any) => [`${val}%`, 'Importance']}
                />
                <Bar dataKey="importance" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Methodology & Limitations Explanations */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Info className="w-4 h-4 text-teal-600" />
            ML Methodology & Disclosure
          </h3>

          <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">Chronological Validation:</span>
              <p>
                To avoid future-data leakage in time series forecasting, the dataset was split chronologically rather than randomly shuffled. The earliest 80% of days trained the model, and the subsequent 20% served as the held-out test horizon.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="font-semibold text-slate-800 block">Lag Feature Discipline:</span>
              <p>
                All lag features (<code className="font-mono text-slate-700">lag_1</code>, <code className="font-mono text-slate-700">lag_7</code>, and 7-day rolling mean) are constructed strictly from historical observations that precede the forecast period.
              </p>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-900 space-y-1">
              <span className="font-semibold text-amber-950 block">Synthetic Datathon Data Notice:</span>
              <p>
                {metrics.synthetic_data_warning || 'The model learns distributions from synthetic university campus data. Predictions should be interpreted as proof-of-concept demand signals.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
