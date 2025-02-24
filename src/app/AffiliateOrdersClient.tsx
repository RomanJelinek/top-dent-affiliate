"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Transaction, updateTransactionClient } from "./ehub.actions";

interface EnhancedTransaction extends Transaction {
  upgatesPrice?: number | null;
  upgatesCurrency?: string | null;
  adminUrl?: string | null;
  upgatesStatus?: string | null;
}

interface CheckboxState {
  checked: boolean;
}

interface AffiliateOrdersClientProps {
  transactions: EnhancedTransaction[];
  totalPages: number;
  currentPage: number;
}

export default function AffiliateOrdersClient({
  transactions,
  totalPages,
  currentPage,
}: AffiliateOrdersClientProps) {
  const tolerance = 0.01;

  // Lokální stav objednávek
  const [localTransactions, setLocalTransactions] = useState<EnhancedTransaction[]>(transactions);
  // Lokální stav checkboxů
  const [checkboxStates, setCheckboxStates] = useState<Record<string, CheckboxState>>({});

  // Stav načítání pro jednotlivé objednávky
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  // Stav pro hromadnou akci
  const [isBulkLoading, setIsBulkLoading] = useState(false);

  // Synchronizace lokálního stavu s novými props při změně stránky
  useEffect(() => {
    setLocalTransactions(transactions);
    const newCheckboxStates: Record<string, CheckboxState> = {};
    transactions.forEach((order) => {
      const defaultChecked =
        order.upgatesStatus === "Dokončeno" &&
        order.upgatesPrice !== null &&
        order.upgatesPrice !== undefined &&
        order.upgatesPrice - order.orderAmount >= -tolerance;
      newCheckboxStates[order.id] = { checked: defaultChecked };
    });
    setCheckboxStates(newCheckboxStates);
  }, [transactions]);

  const handleCheckboxChange = (orderId: string) => {
    setCheckboxStates((prev) => ({
      ...prev,
      [orderId]: { checked: !prev[orderId].checked },
    }));
  };

  const handleUpdate = async (order: EnhancedTransaction, newStatus: "approved" | "declined") => {
    setLoadingIds((prev) => ({ ...prev, [order.id]: true }));
    try {
       await updateTransactionClient(order, newStatus);
      // Odstraníme objednávku z listu, jelikož již není pending
      setLocalTransactions((prev) => prev.filter((t) => t.id !== order.id));
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingIds((prev) => ({ ...prev, [order.id]: false }));
    }
  };

  const handleBulkUpdate = async (newStatus: "approved" | "declined") => {
    setIsBulkLoading(true);
    const selectedOrderIds = Object.keys(checkboxStates).filter((id) => checkboxStates[id].checked);
    for (const orderId of selectedOrderIds) {
      const order = localTransactions.find((o) => o.id === orderId);
      if (order) {
        setLoadingIds((prev) => ({ ...prev, [order.id]: true }));
        try {
          await updateTransactionClient(order, newStatus);
          setLocalTransactions((prev) => prev.filter((t) => t.id !== order.id));
        } catch (error) {
          console.error(`Chyba u objednávky ${order.orderId}:`, error);
        } finally {
          setLoadingIds((prev) => ({ ...prev, [order.id]: false }));
        }
      }
    }
    setIsBulkLoading(false);
  };

  return (
    <div className="p-8 font-sans">
      <h1 className="text-2xl font-bold mb-4">Objednávky z Ehubu (Pending)</h1>
      
      {/* Hromadné akce */}
      <div className="mb-4">
        <button
          onClick={() => handleBulkUpdate("approved")}
          disabled={isBulkLoading}
          className="mr-2 px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
        >
          {isBulkLoading ? "Načítám..." : "Schválit vybrané"}
        </button>
        <button
          onClick={() => handleBulkUpdate("declined")}
          disabled={isBulkLoading}
          className="px-3 py-1 bg-red-600 text-white rounded disabled:opacity-50"
        >
          {isBulkLoading ? "Načítám..." : "Zamítnout vybrané"}
        </button>
      </div>
      
      {localTransactions.length === 0 ? (
        <p>Žádné objednávky k zobrazení.</p>
      ) : (
        <>
          <table className="w-full mt-4 border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-300 text-left p-2">Select</th>
                <th className="border-b border-gray-300 text-left p-2">Order ID</th>
                <th className="border-b border-gray-300 text-left p-2">Datum a čas</th>
                <th className="border-b border-gray-300 text-right p-2">Ehub Cena</th>
                <th className="border-b border-gray-300 text-right p-2">Upgates Cena</th>
                <th className="border-b border-gray-300 text-center p-2">Upgates Status</th>
                <th className="border-b border-gray-300 text-center p-2">Admin</th>
                <th className="border-b border-gray-300 text-center p-2">Akce</th>
              </tr>
            </thead>
            <tbody>
              {localTransactions.map((order) => {
                const state = checkboxStates[order.id] || { checked: false };
                const rowBg = state.checked
                  ? "bg-green-200"
                  : order.upgatesPrice !== null &&
                    order.upgatesPrice !== undefined &&
                    order.orderAmount > order.upgatesPrice + 1
                  ? "bg-red-200"
                  : "";
                return (
                  <tr key={order.id} className={rowBg}>
                    <td className="border-b border-gray-200 p-2 text-center">
                      <input
                        type="checkbox"
                        checked={state.checked}
                        onChange={() => handleCheckboxChange(order.id)}
                        className="w-6 h-6 accent-blue-500"
                      />
                    </td>
                    <td className="border-b border-gray-200 p-2">{order.orderId}</td>
                    <td className="border-b border-gray-200 p-2">
                      {new Date(order.dateTime).toLocaleString("cs-CZ")}
                    </td>
                    <td className="border-b border-gray-200 p-2 text-right">
                      {order.orderAmount.toFixed(2)} {order.originalCurrency}
                    </td>
                    <td className="border-b border-gray-200 p-2 text-right">
                      {order.upgatesPrice !== null && order.upgatesPrice !== undefined
                        ? `${order.upgatesPrice.toFixed(2)} ${order.upgatesCurrency || ""}`
                        : "-"}
                    </td>
                    <td className="border-b border-gray-200 p-2 text-center">
                      {order.upgatesStatus ? order.upgatesStatus : "-"}
                    </td>
                    <td className="border-b border-gray-200 p-2 text-center">
                      {order.adminUrl ? (
                        <a
                          href={order.adminUrl}
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
                    <td className="border-b border-gray-200 p-2 text-center">
                      {loadingIds[order.id] ? (
                        <span>Načítám...</span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleUpdate(order, "approved")}
                            className="mr-2 px-2 py-1 bg-blue-500 text-white rounded"
                          >
                            Schválit
                          </button>
                          <button
                            onClick={() => handleUpdate(order, "declined")}
                            className="px-2 py-1 bg-red-500 text-white rounded"
                          >
                            Zamítnout
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="mt-4 flex justify-center space-x-2">
            {Array.from({ length: totalPages }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <Link
                  key={pageNumber}
                  href={`/?page=${pageNumber}`}
                  className={`px-3 py-1 border rounded ${
                    pageNumber === currentPage
                      ? "bg-blue-500 text-white"
                      : "bg-white text-blue-500"
                  }`}
                >
                  {pageNumber}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
