import { EnhancedTransaction } from "./AffiliateOrdersClient";

export interface Transaction {
  id: string;
  uuid: string;
  dateTime: string;
  campaignId: string;
  creativeId: string;
  publisherId: string;
  clickDateTime: string;
  orderAmount: number;
  originalOrderAmount: number;
  originalCurrency: string;
  commission: number;
  type: string;
  code: string | null;
  orderId: string;
  orderItems: unknown[]; 
  productId: string | null;
  couponCode: string | null;
  newCustomer: boolean | null;
  status: string;
  canChangeStatus: boolean;
}

export interface EhubResponse {
  transactions: Transaction[];
  totalItems: number;
}

// Používáme parametr page, který předáváme do URL
export async function getTransactions(page = 1): Promise<EhubResponse> {
  const url = `https://api.ehub.cz/v3/advertisers/1006/transactions/?apiKey=7ufjh9mtih33xg1ce97u0dz0fid7f1lz4ypcgfuv&status=pending&page=${page}`;
  const res = await fetch(url, { cache: 'no-store' });
  
  if (!res.ok) {
    throw new Error('Chyba při načítání dat z API Ehubu');
  }
  
  const data: EhubResponse = await res.json();
  return data;
}


export async function updateTransactionClient(
  transaction: Transaction,
  newStatus: "approved" | "declined"
): Promise<Transaction> {
  const res = await fetch("/api/transaction-update", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ transaction, newStatus }),
  });

  if (!res.ok) {
    throw new Error(`Chyba při aktualizaci transakce ${transaction.orderId}`);
  }

  const data = await res.json();
  return data.transaction;
}

export async function equalizeTransactionClient(
  t: EnhancedTransaction
): Promise<Transaction> {
  if (t.upgatesPrice == null) throw new Error("Chybí dopočtená cena z Upgates.");

  const body: Record<string, unknown> = {
    orderAmount: +t.upgatesPrice.toFixed(2),
  };

  if (t.upgatesCurrency && t.upgatesCurrency !== "CZK") {
    body.currency = t.upgatesCurrency;
  }

  const res = await fetch("/api/transaction-update", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transaction: t, ...body }),
  });

  if (!res.ok) {
    const { message } = await res.json();
    throw new Error(message ?? "Chyba při dorovnání ceny.");
  }
  const data = await res.json();
  return data.transaction as Transaction;
}