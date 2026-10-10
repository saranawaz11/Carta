// app/(app)/archive/page.tsx
import { VaultList } from "@/components/vault-list";

export default function ArchivePage() {
  return <VaultList status="archived" />;
}