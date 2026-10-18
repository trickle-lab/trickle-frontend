"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

interface WalletContextValue {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
}

const WalletContext = createContext<WalletContextValue>({
  address: null,
  connect: async () => {},
  disconnect: () => {},
  isConnecting: false,
});

let initialized = false;

// Loaded on demand so the kit (which touches the DOM) never runs during server rendering
async function getKit() {
  const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit/sdk");
  const { defaultModules } = await import("@creit.tech/stellar-wallets-kit/modules/utils");
  const { Networks } = await import("@creit.tech/stellar-wallets-kit/types");

  if (!initialized) {
    StellarWalletsKit.init({
      modules: defaultModules(),
      network: Networks.TESTNET,
    });
    initialized = true;
  }
  return StellarWalletsKit;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const kit = await getKit();
      const { address: addr } = await kit.authModal();
      setAddress(addr);
    } catch (err) {
      console.error("Wallet connect failed:", err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ address, connect, disconnect, isConnecting }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);