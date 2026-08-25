export default function Dashboard() {
  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-purple-600">
            PURPLE YAM AIMS
          </p>

          <h1 className="mt-1 text-3xl font-bold text-gray-900">
            Owner Dashboard
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Business-wide inventory overview
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Inventory Items"
            value="9"
            description="Across all branches"
          />

          <DashboardCard
            title="Active Branches"
            value="4"
            description="1 commissary + 3 satellite"
          />

          <DashboardCard
            title="Low Stock"
            value="1"
            description="Items at or below threshold"
          />

          <DashboardCard
            title="Out of Stock"
            value="0"
            description="Zero-quantity entries"
          />
        </div>

        {/* Main Content */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900">
                Active Reorder Alerts
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              <AlertItem
                item="Cornstarch"
                branch="Branch 3"
                stock="7 / 5"
              />

              <AlertItem
                item="Ube Powder"
                branch="Branch 3"
                stock="5 / 3"
              />

              <AlertItem
                item="Dry Premix - Ube"
                branch="Branch 2"
                stock="15 / 10"
              />

              <AlertItem
                item="Ube Powder"
                branch="Main Commissary"
                stock="3 / 5"
              />
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white">
            <div className="border-b border-gray-100 p-5">
              <h2 className="font-semibold text-gray-900">
                Recent Transactions
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              <Transaction
                type="Transfer Out"
                description="Ube Powder × 12 kg → Branch 3"
                time="05:08"
              />

              <Transaction
                type="Transfer In"
                description="Ube Powder × 12 kg from Main Commissary"
                time="05:08"
              />

              <Transaction
                type="Sale"
                description="Ube Cake × 2 units"
                time="09:15"
              />

              <Transaction
                type="Stock-In"
                description="Evaporated Milk × 20 cans"
                time="08:00"
              />

              <Transaction
                type="Production"
                description="Ube Cake × 5 units produced"
                time="14:30"
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function DashboardCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold text-purple-700">
        {value}
      </p>

      <p className="mt-2 text-xs text-gray-500">
        {description}
      </p>
    </div>
  );
}

function AlertItem({
  item,
  branch,
  stock,
}: {
  item: string;
  branch: string;
  stock: string;
}) {
  return (
    <div className="flex items-center justify-between p-5">
      <div>
        <p className="font-medium text-gray-900">{item}</p>
        <p className="text-xs text-gray-500">{branch}</p>
      </div>

      <div className="text-right">
        <p className="font-semibold text-red-600">{stock}</p>

        <span className="mt-1 inline-block rounded border border-yellow-300 bg-yellow-50 px-2 py-1 text-[10px] font-semibold text-yellow-700">
          LOW STOCK
        </span>
      </div>
    </div>
  );
}

function Transaction({
  type,
  description,
  time,
}: {
  type: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <span className="mb-1 inline-block rounded border border-purple-200 bg-purple-50 px-2 py-1 text-[10px] font-semibold text-purple-700">
          {type}
        </span>

        <p className="text-sm text-gray-800">{description}</p>
      </div>

      <span className="shrink-0 text-xs text-gray-400">
        {time}
      </span>
    </div>
  );
}