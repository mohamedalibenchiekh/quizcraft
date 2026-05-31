import React from 'react';

const StatusPill = ({ ready }) => (
  <span
    className={`inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${
      ready
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300'
    }`}
  >
    {ready ? 'Ready' : 'Blocked'}
  </span>
);

const ReadinessPath = ({ title, tone, data }) => {
  const colors =
    tone === 'hard'
      ? {
          border: 'border-emerald-500/20',
          bg: 'bg-emerald-50/70 dark:bg-emerald-950/15',
          text: 'text-emerald-700 dark:text-emerald-300',
        }
      : {
          border: 'border-amber-500/20',
          bg: 'bg-amber-50/70 dark:bg-amber-950/15',
          text: 'text-amber-700 dark:text-amber-300',
        };

  return (
    <div className={`min-w-0 rounded-xl border ${colors.border} ${colors.bg} p-4`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h4 className={`min-w-0 text-sm font-black leading-tight ${colors.text}`}>{title}</h4>
        <StatusPill ready={data?.ready} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-950/35">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Eligible</p>
          <p className="mt-1 text-2xl font-black leading-none text-slate-800 dark:text-white">{data?.eligibleCount ?? 0}</p>
        </div>
        <div className="min-w-0 rounded-lg bg-white/70 px-3 py-2 dark:bg-slate-950/35">
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Matched</p>
          <p className="mt-1 text-2xl font-black leading-none text-slate-800 dark:text-white">{data?.matchingCount ?? 0}</p>
        </div>
      </div>
      {data?.warning && (
        <p className="mt-3 rounded-lg border border-slate-300/60 bg-white/70 px-3 py-2 text-xs font-semibold leading-relaxed text-slate-700 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-300">
          {data.warning}
        </p>
      )}
    </div>
  );
};

const AdaptiveReadinessPanel = ({ readiness, loading = false, error = '' }) => {
  if (loading) {
    return (
      <div className="glass-card border border-slate-300 p-5 shadow-md dark:border-slate-700">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adaptive Readiness</p>
        <div className="mt-4 h-24 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-900" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card border border-rose-500/30 bg-rose-50/40 p-5 shadow-md dark:bg-rose-950/10">
        <p className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-300">Adaptive Readiness</p>
        <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-200">{error}</p>
      </div>
    );
  }

  if (!readiness) return null;

  const canGenerate = readiness.enrichment?.ready && readiness.remediation?.ready;

  return (
    <div className="glass-card min-w-0 border border-slate-300 p-5 shadow-md dark:border-slate-700">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Adaptive Readiness</p>
          <h3 className="mt-1 text-lg font-black leading-snug text-slate-800 dark:text-white">Question Bank Coverage</h3>
        </div>
        <StatusPill ready={canGenerate} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg bg-slate-100/70 p-3 dark:bg-slate-900/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Target Deck</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">{readiness.dynamicSetSize}</p>
        </div>
        <div className="rounded-lg bg-slate-100/70 p-3 dark:bg-slate-900/30">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Matching Tags</p>
          <p className="text-xl font-black text-slate-800 dark:text-white">{readiness.matchingTags?.length || 0}</p>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <ReadinessPath title="Enrichment Pool" tone="hard" data={readiness.enrichment} />
        <ReadinessPath title="Remediation Pool" tone="easy" data={readiness.remediation} />
      </div>

      <div className="mt-4 border-t border-slate-200 pt-4 dark:border-slate-800">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Matched Concepts</p>
        {readiness.matchingTags?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {readiness.matchingTags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-cyan-50 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            No external questions share this quiz's tags yet.
          </p>
        )}
      </div>
    </div>
  );
};

export default AdaptiveReadinessPanel;
