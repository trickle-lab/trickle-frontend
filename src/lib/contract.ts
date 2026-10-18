import {
  Address,
  BASE_FEE,
  Contract,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org";
const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015";

// Native XLM token contract on testnet
export const NATIVE_TOKEN_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

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
  if (!CONTRACT_ID) throw new Error("NEXT_PUBLIC_CONTRACT_ID is not set in .env.local");

  const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit/sdk");

  const server = new rpc.Server(RPC_URL);
  const account = await server.getAccount(params.sender);
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "create_stream",
        new Address(params.sender).toScVal(),
        new Address(params.recipient).toScVal(),
        new Address(params.token ?? NATIVE_TOKEN_ID).toScVal(),
        nativeToScVal(params.amount, { type: "i128" }),
        nativeToScVal(params.duration, { type: "u64" })
      )
    )
    .setTimeout(60)
    .build();

  // Simulates the call and attaches the Soroban resource data
  const prepared = await server.prepareTransaction(tx);

  const { signedTxXdr } = await StellarWalletsKit.signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
    address: params.sender,
  });

  const signed = TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
  const sent = await server.sendTransaction(signed);
  if (sent.status === "ERROR" || sent.status === "TRY_AGAIN_LATER") {
    throw new Error(`Network rejected the transaction (${sent.status}). Try again.`);
  }

  for (let i = 0; i < 30; i++) {
    const res = await server.getTransaction(sent.hash);
    if (res.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      let streamId: string | null = null;
      try {
        if (res.returnValue) streamId = String(scValToNative(res.returnValue));
      } catch {}
      return { hash: sent.hash, streamId };
    }
    if (res.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error("The transaction failed on-chain.");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for confirmation. Check the transaction on stellar.expert.");
}
