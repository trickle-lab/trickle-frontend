const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export interface StreamEvent {
  id: string;
  type: string;
  streamId: string;
  amount?: string;
  duration?: string;
  ledger: number;
  ledgerClosedAt: string;
  txHash: string;
}

export async function fetchStreamEvents(): Promise<StreamEvent[]> {
  const res = await fetch(`${API_URL}/events`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch stream events");
  return res.json();
}
