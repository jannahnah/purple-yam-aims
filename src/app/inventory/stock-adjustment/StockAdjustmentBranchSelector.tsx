"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Branch = { id: string; name: string };

export default function StockAdjustmentBranchSelector({ branches }: { branches: Branch[] }) {
  const [branchId, setBranchId] = useState("");
  const router = useRouter();

  return (
    <form className="mt-6 space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (!branchId) return;
      router.push("/inventory/stock-adjustment/entry?branchId=" + encodeURIComponent(branchId));
    }}>
      <label htmlFor="stock-adjustment-branch" className="block text-sm font-semibold text-gray-700">Target branch <span className="text-red-600">*</span></label>
      <select id="stock-adjustment-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)} required className="aims-control w-full px-3 text-sm">
        <option value="">Select a branch</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
      </select>
      <button type="submit" disabled={!branchId} className="w-full rounded-lg bg-purple-700 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">Continue to item entry →</button>
    </form>
  );
}