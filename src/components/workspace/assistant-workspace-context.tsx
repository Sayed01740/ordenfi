"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PaymentChain } from "@/lib/payment-tools";

const AssistantWorkspaceContext = createContext<{
  planChain?: PaymentChain;
  setPlanChain: (chain: PaymentChain | undefined) => void;
  quoteExpired: boolean;
  setQuoteExpired: (expired: boolean) => void;
} | null>(null);

export function AssistantWorkspaceProvider({ children }: { children: ReactNode }) {
  const [planChain, setPlanChain] = useState<PaymentChain>();
  const [quoteExpired, setQuoteExpired] = useState(false);
  return (
    <AssistantWorkspaceContext.Provider value={{ planChain, setPlanChain, quoteExpired, setQuoteExpired }}>
      {children}
    </AssistantWorkspaceContext.Provider>
  );
}

export function useAssistantWorkspace() {
  return useContext(AssistantWorkspaceContext);
}
