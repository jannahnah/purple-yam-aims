import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">
          Access Denied
        </h1>

        <p className="mt-3 text-sm text-gray-500">
          You do not have permission to access this page.
        </p>

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-purple-800"
        >
          Return to Login
        </Link>
      </div>
    </main>
  );
}