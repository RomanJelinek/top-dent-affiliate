import { Transaction } from "@/app/ehub.actions";
import { NextResponse } from "next/server";

const advertiserId = "1006";
const apiKey = "7ufjh9mtih33xg1ce97u0dz0fid7f1lz4ypcgfuv";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      transaction,
      newStatus,              // "approved" | "declined" | undefined
      orderAmount,            // number | undefined
      currency,               // string | undefined
    } = body as {
      transaction: Transaction;
      newStatus?: "approved" | "declined";
      orderAmount?: number;
      currency?: string;
    };

    if (!newStatus && orderAmount == null) {
      return NextResponse.json(
        { message: "Nezadali jste nic, co by se na eHubu mělo změnit." },
        { status: 400 }
      );
    }

    const payload: Record<string, unknown> = {};
    if (newStatus)      payload.status      = newStatus;
    if (orderAmount != null) {
      payload.orderAmount = orderAmount;
      if (currency) payload.currency = currency;
    }

    const url = `https://api.ehub.cz/v3/advertisers/${advertiserId}/transactions/${transaction.id}/?apiKey=${apiKey}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const { message } = await response.json();
      return NextResponse.json(
        { message: message ?? `Chyba při PATCHu transakce ${transaction.orderId}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message ?? "Neznámá chyba." },
      { status: 500 }
    );
  }
}