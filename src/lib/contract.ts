import {
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  xdr,
  rpc,
} from "@stellar/stellar-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

// Native XLM token contract on testnet
export const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const short = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`;

// Builds, simulates, signs (via the connected wallet), submits and confirms one contract call
async function invoke(
  sender: string,
  method: string,
  args: xdr.ScVal[]
): Promise<{ hash: string; returnValue: unknown }> {
  if (!CONTRACT_ID) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not set in .env.local");

  const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit/sdk");

  const server = new rpc.Server(RPC_URL);
  const account = await server.getAccount(sender);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(new Contract(CONTRACT_ID).call(method, ...args))
    .setTimeout(60)
    .build();

  // Simulates the call and attaches the Soroban resource data
  const prepared = await server.prepareTransaction(tx);

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: sender,
  });

  const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const sent = await server.sendTransaction(signed);
  if (sent.status === "ERROR" || sent.status === "TRY_AGAIN_LATER") {
    throw new Error(`Network rejected the transaction (${sent.status}). Try again.`);
  }

  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(sent.hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      let returnValue: unknown = null;
      try {
        if (res.returnValue) returnValue = scValToNative(res.returnValue);
      } catch {}
      return { hash: sent.hash, returnValue };
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("The transaction failed on-chain.");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for confirmation. Check the transaction on stellar.expert.");
}

export interface CreateStreamParams {
  sender: string;
  recipient: string;
  token?: string;
  amount: bigint; // in stroops (1 XLM = 10,000,000)
  duration: bigint; // in seconds
}

export async function createStream(
  params: CreateStreamParams
): Promise<{ hash: string; streamId: string | null }> {
  const { hash, returnValue } = await invoke(params.sender, "create_stream", [
    new Address(params.sender).toScVal(),
    new Address(params.recipient).toScVal(),
    new Address(params.token ?? NATIVE_TOKEN_ID).toScVal(),
    nativeToScVal(params.amount, { type: "i128" }),
    nativeToScVal(params.duration, { type: "u64" }),
  ]);
  return { hash, streamId: returnValue === null ? null : String(returnValue) };
}

// Reads a stream's sender and recipient straight from contract storage (DataKey::Stream(id)).
// Returns null if it can't be read (for example, the stream was cancelled or its entry expired).
export async function getStreamParties(
  streamId: string
): Promise<{ sender: string; recipient: string } | null> {
  try {
    const server = new rpc.Server(RPC_URL);
    const key = xdr.ScVal.scvVec([
      xdr.ScVal.scvSymbol("Stream"),
      nativeToScVal(BigInt(streamId), { type: "u64" }),
    ]);
    const entry = await server.getContractData(CONTRACT_ID, key, rpc.Durability.Persistent);
    const stream = scValToNative(entry.val.contractData().val()) as {
      sender?: string;
      recipient?: string;
    };
    if (!stream.sender || !stream.recipient) return null;
    return { sender: stream.sender, recipient: stream.recipient };
  } catch {
    return null;
  }
}

// Recipient claims whatever has vested so far. `wallet` must be the stream's recipient.
export async function withdrawStream(
  streamId: string,
  wallet: string
): Promise<{ hash: string; amount: bigint }> {
  const parties = await getStreamParties(streamId);
  if (parties && parties.recipient !== wallet) {
    throw new Error(
      `Only the stream's recipient can withdraw. Connect wallet ${short(parties.recipient)}.`
    );
  }

  const { hash, returnValue } = await invoke(wallet, "withdraw", [
    nativeToScVal(BigInt(streamId), { type: "u64" }),
  ]);
  return { hash, amount: BigInt(String(returnValue ?? 0)) };
}

// Sender cancels: the recipient keeps what has vested, the sender gets the rest back.
// `wallet` must be the stream's sender.
export async function cancelStream(
  streamId: string,
  wallet: string
): Promise<{ hash: string }> {
  const parties = await getStreamParties(streamId);
  if (parties && parties.sender !== wallet) {
    throw new Error(
      `Only the stream's sender can cancel. Connect wallet ${short(parties.sender)}.`
    );
  }

  const { hash } = await invoke(wallet, "cancel", [
    nativeToScVal(BigInt(streamId), { type: "u64" }),
  ]);
  return { hash };
}
