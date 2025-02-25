import { Buffer } from 'buffer';

export interface UpgatesCustomer {
  email: string;
  phone: string;
  code: string;
  customer_id: number;
  customer_pricelist_id: number;
  [key: string]: unknown;
}

export interface UpgatesPayment {
  id: number;
  code: string | null;
  name: string;
  price: number;
  vat: number;
  [key: string]: unknown;
}

export interface UpgatesShipment {
  id: number;
  code: string | null;
  name: string;
  price: number;
  vat: number;
  [key: string]: unknown;
}

export interface UpgatesOrder {
  order_number: string;
  order_id: number;
  case_number: string;
  external_order_number: string | null;
  uuid: string;
  language_id: string;
  currency_id: string;
  default_currency_rate: number;
  prices_with_vat_yn: boolean;
  status_id: number | null;
  status: string | null;
  paid_date: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  resolved_yn: boolean;
  oss_yn: boolean;
  internal_note: string | null;
  last_update_time: string;
  creation_time: string;
  variable_symbol: string;
  total_weight: number;
  order_total: number;
  order_total_before_round: number | null;
  order_total_rest: number | null;
  invoice_number: string | null;
  origin: string;
  admin_url: string;
  customer: UpgatesCustomer;
  products: unknown[];
  discount_voucher?: {discounts: {
    vat: number, price: number
}[]}
  quantity_discount?: unknown;
  loyalty_points?: {discounts: {
    vat: number, price: number
}[]}
  shipment: UpgatesShipment;
  payment: UpgatesPayment;
  attachments: unknown[];
  metas: unknown[];
}

export interface UpgatesResponse {
  current_page: number;
  current_page_items: number;
  number_of_pages: number;
  number_of_items: number;
  orders: UpgatesOrder[];
}

// Stávající funkce – voláme bez filtrace
export async function getUpgatesOrders(): Promise<UpgatesResponse> {
  const username = process.env.TOPDENT_USERNAME || "97605683";
  const apiKey = process.env.TOPDENT_API_KEY || "zXBsIcg5Vep1j/HUqLhG";

  if (!username || !apiKey) {
    throw new Error("Přihlašovací údaje pro Upgates API nejsou nastavené.");
  }

  const basicAuth = Buffer.from(`${username}:${apiKey}`).toString("base64");

  const res = await fetch("https://topdent.admin.s5.upgates.com/api/v2/orders/", {
    headers: {
      "Authorization": `Basic ${basicAuth}`,
      "Content-Type": "application/json",
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Chyba při načítání Upgates objednávek: ${res.status}`);
  }

  const data: UpgatesResponse = await res.json();
  return data;
}



// Nová funkce pro načtení Upgates objednávek dle časového intervalu
export async function getUpgatesOrdersByDate(
  creationTimeFrom: string,
  creationTimeTo: string
): Promise<UpgatesOrder[]> {
  const username = "97605683";
  const apiKey = "zXBsIcg5Vep1j/HUqLhG";

  if (!username || !apiKey) {
    throw new Error("Přihlašovací údaje pro Upgates API nejsou nastavené.");
  }

  const basicAuth = Buffer.from(`${username}:${apiKey}`).toString("base64");

  const allOrders: UpgatesOrder[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const url = `https://topdent.admin.s5.upgates.com/api/v2/orders/?creation_time_from=${encodeURIComponent(
      creationTimeFrom
    )}&creation_time_to=${encodeURIComponent(creationTimeTo)}&page=${page}`;

    const res = await fetch(url, {
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/json",
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Chyba při načítání Upgates objednávek: ${res.status}`);
    }

    const data: UpgatesResponse = await res.json();
    allOrders.push(...data.orders);
    totalPages = data.number_of_pages;
    page++;
  } while (page <= totalPages);

  return allOrders;
}
