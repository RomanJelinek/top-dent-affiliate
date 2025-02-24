import { Transaction } from "@/app/ehub.actions";
import { NextResponse } from "next/server";

const advertiserId = "1006";
const apiKey = "7ufjh9mtih33xg1ce97u0dz0fid7f1lz4ypcgfuv";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { transaction, newStatus } = body as {
      transaction: Transaction;
      newStatus: "approved" | "declined";
    };

    const url = `https://api.ehub.cz/v3/advertisers/${advertiserId}/transactions/${transaction.id}/?apiKey=${apiKey}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Chyba při aktualizaci transakce ${transaction.orderId}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    return NextResponse.json({ message: error }, { status: 500 });
  }
}
