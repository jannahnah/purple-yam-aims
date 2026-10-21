type StatCardProps = {
  label: string;
  value: string | number;
  valueClassName?: string;
  description?: string;
};

export function StatCard({
  label,
  value,
  valueClassName = "text-gray-900",
  description,
}: StatCardProps) {
  return (
    <div className="dashboard-kpi rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-2xl sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 sm:text-xs">
          {label}
        </p>
      </div>

      <p className={`mt-1.5 text-2xl font-bold sm:mt-3 sm:text-3xl ${valueClassName}`}>
        {value}
      </p>

      {description && (
        <p className="mt-0.5 text-[11px] leading-4 text-gray-500 sm:mt-1 sm:text-xs">
          {description}
        </p>
      )}
    </div>
  );
}
