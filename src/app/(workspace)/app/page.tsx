import type { Metadata } from "next";
import { OperationsWorkspace } from "@/components/workspace/operations-workspace";

export const metadata: Metadata = { title: "Workspace | Ordenfi" };

export default function WorkspacePage() {
  return <OperationsWorkspace />;
}
