"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Transaction,
  updateTransactionClient,
  equalizeTransactionClient,
} from "./ehub.actions";

export interface EnhancedTransaction extends Transaction {
  upgatesPrice?: number | null;
  upgatesCurrency?: string | null;
  adminUrl?: string | null;
  upgatesStatus?: string | null;
}

interface AffiliateOrdersClientProps {
  transactions: EnhancedTransaction[];
  totalPages: number;
  currentPage: number;
}

const tolerance = 0.1;

/** Vrátí částku z eHubu ve stejné měně, jakou má Upgates objednávka. */
function comparableEhubAmount(o: EnhancedTransaction): number {
  return o.originalCurrency === o.upgatesCurrency
    ? o.originalOrderAmount
    : o.orderAmount;
}

export default function AffiliateOrdersClient({
  transactions,
  totalPages,
  currentPage,
}: AffiliateOrdersClientProps) {
  /* ----------------------- lokální stavy ----------------------- */
  const [localTransactions, setLocalTransactions] = useState(transactions);
  const [checkboxStates, setCheckboxStates] = useState<Record<string, { checked: boolean }>>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [equalizingIds, setEqualizingIds] = useState<Record<string, boolean>>({});
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  /* -------- synchronizace při změně stránky -------- */
  useEffect(() => {
    setLocalTransactions(transactions);

    const defaults: Record<string, { checked: boolean }> = {};
    transactions.forEach((o) => {
      const ok =
        o.upgatesStatus === "Dokončeno" &&
        o.upgatesPrice != null &&
        Math.abs(comparableEhubAmount(o) - o.upgatesPrice) <= tolerance;
      defaults[o.id] = { checked: ok };
    });
    setCheckboxStates(defaults);
  }, [transactions]);

  /* ------------------- handlery ------------------- */
  const handleUpdate = async (o: EnhancedTransaction, s: "approved" | "declined") => {
    setLoadingIds((p) => ({ ...p, [o.id]: true }));
    try {
      await updateTransactionClient(o, s);
      setLocalTransactions((p) => p.filter((t) => t.id !== o.id));
    } finally {
      setLoadingIds((p) => ({ ...p, [o.id]: false }));
    }
  };

  const handleEqualize = async (o: EnhancedTransaction) => {
    setEqualizingIds((p) => ({ ...p, [o.id]: true }));
    try {
      const upd = await equalizeTransactionClient(o);
      setLocalTransactions((p) =>
        p.map((t) => (t.id === o.id ? { ...t, orderAmount: upd.orderAmount } : t)),
      );
    } finally {
      setEqualizingIds((p) => ({ ...p, [o.id]: false }));
    }
  };

  async function handleBulkUpdate(s: "approved" | "declined") {
    setIsBulkLoading(true);
    const ids = Object.keys(checkboxStates).filter((id) => checkboxStates[id].checked);
    for (const id of ids) {
      const order = localTransactions.find((t) => t.id === id);
      if (!order) continue;
      setLoadingIds((p) => ({ ...p, [id]: true }));
      try {
        await updateTransactionClient(order, s);
        setLocalTransactions((p) => p.filter((t) => t.id !== id));
      } finally {
        setLoadingIds((p) => ({ ...p, [id]: false }));
      }
    }
    setIsBulkLoading(false);
  }

  /* --------------------- render -------------------- */
  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Objednávky z Ehubu (Pending)</h1>

      {/* hromadné akce */}
      <div className="mb-4">
        <button
          onClick={() => handleBulkUpdate("approved")}
          disabled={isBulkLoading}
          className="mr-2 px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isBulkLoading ? "Načítám…" : "Schválit vybrané"}
        </button>
        <button
          onClick={() => handleBulkUpdate("declined")}
          disabled={isBulkLoading}
          className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
        >
          {isBulkLoading ? "Načítám…" : "Zamítnout vybrané"}
        </button>
      </div>

      {localTransactions.length === 0 ? (
        <p>Žádné objednávky k zobrazení.</p>
      ) : (
        <>
          <table className="w-full mt-4 border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-300 p-2 text-left">Select</th>
                <th className="border-b border-gray-300 p-2 text-left">Order&nbsp;ID</th>
                <th className="border-b border-gray-300 p-2 text-left">Datum&nbsp;a&nbsp;čas</th>
                <th className="border-b border-gray-300 p-2 text-right">Ehub&nbsp;cena</th>
                <th className="border-b border-gray-300 p-2 text-right">Upgates&nbsp;cena</th>
                <th className="border-b border-gray-300 p-2 text-center">Upgates&nbsp;status</th>
                <th className="border-b border-gray-300 p-2 text-center">Admin</th>
                <th className="border-b border-gray-300 p-2 text-left">Akce</th>
              </tr>
            </thead>
            <tbody>
              {localTransactions.map((o) => {
                const checked = checkboxStates[o.id]?.checked ?? false;

                const rowBg =
                  checked
                    ? "bg-green-200"
                    : o.upgatesPrice != null &&
                      comparableEhubAmount(o) > o.upgatesPrice + 1
                    ? "bg-red-200"
                    : "";

                return (
                  <tr key={o.id} className={rowBg}>
                    {/* select */}
                    <td className="border-b border-gray-200 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setCheckboxStates((p) => ({ ...p, [o.id]: { checked: !checked } }))
                        }
                        className="w-6 h-6 accent-blue-500"
                      />
                    </td>

                    {/* order id */}
                    <td className="border-b border-gray-200 p-2">{o.orderId}</td>

                    {/* datum */}
                    <td className="border-b border-gray-200 p-2">
                      {new Date(o.dateTime).toLocaleString("cs-CZ")}
                    </td>

                    {/* ehub cena – ve stejné měně jako Upgates */}
                    <td className="border-b border-gray-200 p-2 text-right">
                      {comparableEhubAmount(o).toFixed(2)} {o.upgatesCurrency ?? o.originalCurrency}
                    </td>

                    {/* upgates cena */}
                    <td className="border-b border-gray-200 p-2 text-right">
                      {o.upgatesPrice != null
                        ? `${o.upgatesPrice.toFixed(2)} ${o.upgatesCurrency ?? ""}`
                        : "-"}
                    </td>

                    {/* status */}
                    <td className="border-b border-gray-200 p-2 text-center">
                      {o.upgatesStatus ?? "-"}
                    </td>

                    {/* admin */}
                    <td className="border-b border-gray-200 p-2 text-center">
                      {o.adminUrl ? (
                        <a
                          href={o.adminUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 bg-green-500 text-white rounded"
                        >
                          Admin
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* akce */}
                    <td className="border-b border-gray-200 p-2">
                      <div className="flex flex-row flex-wrap gap-1">
                        {/* schválit / zamítnout */}
                        {loadingIds[o.id] ? (
                          <span className="px-2">Načítám…</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleUpdate(o, "approved")}
                              className="px-2 py-1 bg-blue-500 text-white rounded"
                            >
                              Schválit
                            </button>
                            <button
                              onClick={() => handleUpdate(o, "declined")}
                              className="px-2 py-1 bg-red-500 text-white rounded"
                            >
                              Zamítnout
                            </button>
                          </>
                        )}

                        {/* dorovnat cenu – poslední */}
                        {o.upgatesPrice != null &&
                          Math.abs(comparableEhubAmount(o) - o.upgatesPrice) > 1 && (
                            <button
                              onClick={() => handleEqualize(o)}
                              disabled={equalizingIds[o.id]}
                              className="px-2 py-1 bg-yellow-500 text-white rounded disabled:opacity-50"
                            >
                              {equalizingIds[o.id] ? "Načítám…" : "Dorovnat cenu"}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* stránkování */}
          <div className="mt-4 flex justify-center space-x-2">
            {Array.from({ length: totalPages }, (_, i) => {
              const p = i + 1;
              return (
                <Link
                  key={p}
                  href={`/?page=${p}`}
                  className={`px-3 py-1 border rounded ${
                    p === currentPage ? "bg-blue-500 text-white" : "bg-white text-blue-500"
                  }`}
                >
                  {p}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
