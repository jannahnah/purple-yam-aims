export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
          <p className="text-sm text-gray-600">Purple Yam AIMS Overview</p>
        </div>
        <a href="/" className="text-sm font-medium text-purple-700 hover:underline">
          Sign Out
        </a>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        <Card title="Low Stock Items" value="9" color="bg-red-50 border-red-200 text-red-700" />
        <Card title="Pending Sales" value="4" color="bg-amber-50 border-amber-200 text-amber-700" />
        <Card title="Batches in Production" value="1" color="bg-purple-50 border-purple-200 text-purple-700" />
      </div>

      {/* Activity Section */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        </div>
        <div className="divide-y divide-gray-100">
          <Transaction type="Inventory" description="Yam Flour restocked (50kg)" time="10 mins ago" />
          <Transaction type="Sales" description="Order #1042 completed" time="1 hour ago" />
          <Transaction type="Production" description="Batch #88 completed" time="3 hours ago" />
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, color }: { title: string; value: string; color: string }) {
  return (
    <div className={`rounded-xl border p-6 shadow-sm ${color}`}>
      <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}

function Transaction({ type, description, time }: { type: string; description: string; time: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <span className="mb-1 inline-block rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700">
          {type}
        </span>
        <p className="text-sm text-gray-800">{description}</p>
      </div>
      <span className="shrink-0 text-xs text-gray-400">{time}</span>
    </div>
  );
}