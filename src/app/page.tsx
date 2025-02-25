import React from "react";
import { getTransactions, Transaction } from "./ehub.actions";
import AffiliateOrdersClient from "./AffiliateOrdersClient";
import { getUpgatesOrdersByDate, UpgatesOrder } from "./upgates.actions";


// Pomocná funkce pro formátování dat bez milisekund (např. "2023-03-20T14:30:00Z")
function formatDateForUpgates(date: Date): string {
  return date.toISOString().split('.')[0] + "Z";
}

interface EnhancedTransaction extends Transaction {
  upgatesPrice?: number | null;
  upgatesCurrency?: string | null;
  adminUrl?: string | null;
  upgatesStatus?: string | null;
}

export default async function AffiliateOrdersPage({
  searchParams,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
}: any) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // Řešení chyby: await searchParams před použitím jeho vlastností
  const sp = await Promise.resolve(searchParams);
  const currentPage = parseInt(sp.page ?? "1", 10);
  const limit = 50;

  let transactions: Transaction[] = [];
  let totalItems = 0;

  try {
    const data = await getTransactions(currentPage);
    transactions = data.transactions || [];
    totalItems = data.totalItems || 0;
  } catch (error) {
    console.error(error);
  }

  // Obohacení Ehub objednávek o data z Upgates
  let enrichedTransactions: EnhancedTransaction[] = transactions;
  if (transactions.length > 0) {
    // Vypočítáme minimální a maximální datum z objednávek (pro filtrování Upgates API)
    const dates = transactions.map((t) => new Date(t.dateTime).getTime());
    const minDate = formatDateForUpgates(new Date(Math.min(...dates)));
    const originalMaxDate = new Date(Math.max(...dates));
    const adjustedMaxDate = new Date(originalMaxDate);
    adjustedMaxDate.setHours(adjustedMaxDate.getHours() + 1);
    const maxDate = formatDateForUpgates(adjustedMaxDate);
    try {
      const upgatesOrders: UpgatesOrder[] = await getUpgatesOrdersByDate(minDate, maxDate);
      // Vytvoříme mapu: key = order_number (předpokládáme shodu s Ehub orderId)
      const upgatesMap = new Map<string, UpgatesOrder>();
      upgatesOrders.forEach((order) => {
        upgatesMap.set(order.order_number, order);
      });
      enrichedTransactions = transactions.map((t) => {
        const matchingOrder = upgatesMap.get(t.orderId);
        let computedPrice: number | null = null;
        let computedStatus: string | null = null;
        let adminUrl: string | null = null;
        let upgatesCurrency: string | null = null;
        if (matchingOrder) {
          // Součet cen produktů bez DPH (price_without_vat) násobených množstvím
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const productSum = (matchingOrder.products as any[]).reduce((sum, product) => {
            const quantity = product.quantity || 1;
            return sum + (product.price_without_vat * quantity);
          }, 0);  

          const loyaltyDiscountWithoutVAT = matchingOrder.loyalty_points && matchingOrder.loyalty_points.discounts
  ? matchingOrder.loyalty_points.discounts.reduce((total, discount) => {
      return total + discount.price / (1 + discount.vat / 100);
    }, 0)
  : 0;

  const discountVoucherWithoutVAT = matchingOrder.discount_voucher && matchingOrder.discount_voucher.discounts
  ? matchingOrder.discount_voucher.discounts.reduce(
      (total, discount) => total + discount.price / (1 + discount.vat / 100),
      0
    )
  : 0;
         
          computedPrice = productSum - loyaltyDiscountWithoutVAT - discountVoucherWithoutVAT
          computedStatus = matchingOrder.status;
          adminUrl = matchingOrder.admin_url;
          upgatesCurrency = matchingOrder.currency_id;
        }
        return {
          ...t,
          upgatesPrice: computedPrice,
          upgatesCurrency,
          adminUrl,
          upgatesStatus: computedStatus,
        };
      });
    } catch (error) {
      console.error("Chyba při načítání Upgates objednávek:", error);
    }
  }

  const totalPages = Math.ceil(totalItems / limit);

  return (
    <AffiliateOrdersClient
      transactions={enrichedTransactions}
      totalPages={totalPages}
      currentPage={currentPage}
    />
  );
}
