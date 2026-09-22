"use client";

import { ChangeEvent, useState } from "react";

type PreviewRow = {
  itemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  unit: string;
  currentQuantity: number;
  importedQuantity: number;
  change: number;
};

type Props = {
  role: "OWNER" | "BRANCH_MANAGER" | "CASHIER";
};

function formatQuantity(
  value: number,
  unit: string
) {
  return `${value.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  })} ${unit}`;
}

export default function InventoryImportSection({
  role,
}: Props) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(
    null
  );

  const [preview, setPreview] = useState<
    PreviewRow[] | null
  >(null);

  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  if (role === "CASHIER") {
    return null;
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const selectedFile =
      event.target.files?.[0] ?? null;

    setFile(selectedFile);
    setPreview(null);
    setError("");
    setSuccess("");
  }

  async function handlePreview() {
    if (!file) {
      setError(
        "Please select an Excel or CSV file first."
      );
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");
    setPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/inventory/import",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to validate the inventory file."
        );
      }

      setPreview(data.preview);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to process the file."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview || preview.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Import ${preview.length} inventory row(s)? This will update the current inventory and create adjustment history for changed quantities.`
    );

    if (!confirmed) {
      return;
    }

    setConfirming(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(
        "/api/inventory/import",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            rows: preview.map((row) => ({
              itemId: row.itemId,
              branchId: row.branchId,
              quantity: row.importedQuantity,
            })),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Unable to import inventory."
        );
      }

      setSuccess(
        `Import completed. ${data.updatedCount} item(s) updated and ${data.unchangedCount} item(s) unchanged.`
      );

      setPreview(null);
      setFile(null);

      const input =
        document.getElementById(
          "inventory-import-file"
        ) as HTMLInputElement | null;

      if (input) {
        input.value = "";
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to import inventory."
      );
    } finally {
      setConfirming(false);
    }
  }

  const changedCount =
    preview?.filter(
      (row) => row.change !== 0
    ).length ?? 0;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => {
          setOpen((current) => !current);
          setError("");
          setSuccess("");
        }}
        className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-gray-50"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-semibold text-gray-900">
            Import Inventory Data
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            Import physical inventory counts from an
            Excel or CSV file.
          </p>
        </div>

        <span
          className={`ml-4 text-lg text-gray-400 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5">
          <div className="space-y-5">
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-4">
              <p className="text-sm font-medium text-purple-900">
                How inventory import works
              </p>

              <p className="mt-1 text-xs leading-5 text-purple-700">
                The quantity in your file is treated as
                the actual current physical count. The
                system compares it with the existing
                inventory and records the difference as
                an adjustment.
              </p>

              <div className="mt-3 rounded-md bg-white p-3 text-xs text-gray-600">
                Example: Current stock = 20 kg,
                imported count = 17.5 kg → Change =
                -2.5 kg → New stock = 17.5 kg.
              </div>
            </div>

            <div>
              <label
                htmlFor="inventory-import-file"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Inventory File
              </label>

              <input
                id="inventory-import-file"
                type="file"
                accept=".xlsx,.xlsm,.xls,.csv"
                onChange={handleFileChange}
                disabled={
                  loading || confirming
                }
                className="block w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 file:mr-4 file:rounded-md file:border-0 file:bg-purple-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-purple-800 hover:file:bg-purple-200"
              />

              <p className="mt-1.5 text-xs text-gray-400">
                Supported: Excel (.xlsx, .xlsm, .xls) and CSV
                (.csv), maximum 10 MB.
              </p>
            </div>

            {file && (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Selected file:{" "}
                <span className="font-medium text-gray-800">
                  {file.name}
                </span>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <button
              type="button"
              onClick={handlePreview}
              disabled={
                !file || loading || confirming
              }
              className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading
                ? "Validating..."
                : "Preview Import"}
            </button>

            {preview && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Import Preview
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    {preview.length} row(s) validated,
                    with {changedCount} change(s).
                    Nothing has been updated yet.
                  </p>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">
                          Item
                        </th>

                        <th className="px-4 py-3">
                          Branch
                        </th>

                        <th className="px-4 py-3 text-right">
                          Current
                        </th>

                        <th className="px-4 py-3 text-right">
                          Imported
                        </th>

                        <th className="px-4 py-3 text-right">
                          Change
                        </th>

                        <th className="px-4 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {preview.map(
                        (row) => (
                          <tr
                            key={`${row.branchId}-${row.itemId}`}
                          >
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {row.itemName}
                            </td>

                            <td className="px-4 py-3 text-gray-600">
                              {row.branchName}
                            </td>

                            <td className="px-4 py-3 text-right text-gray-600">
                              {formatQuantity(
                                row.currentQuantity,
                                row.unit
                              )}
                            </td>

                            <td className="px-4 py-3 text-right text-gray-800">
                              {formatQuantity(
                                row.importedQuantity,
                                row.unit
                              )}
                            </td>

                            <td
                              className={`px-4 py-3 text-right font-medium ${
                                row.change > 0
                                  ? "text-emerald-600"
                                  : row.change <
                                      0
                                    ? "text-red-600"
                                    : "text-gray-400"
                              }`}
                            >
                              {row.change > 0
                                ? "+"
                                : ""}
                              {formatQuantity(
                                row.change,
                                row.unit
                              )}
                            </td>

                            <td className="px-4 py-3">
                              {row.change === 0 ? (
                                <span className="text-xs text-gray-400">
                                  No change
                                </span>
                              ) : (
                                <span className="text-xs font-medium text-purple-700">
                                  Will update
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={
                      confirming ||
                      preview.length === 0
                    }
                    className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {confirming
                      ? "Importing..."
                      : "Confirm Import"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setError("");
                    }}
                    disabled={confirming}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Cancel Preview
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
