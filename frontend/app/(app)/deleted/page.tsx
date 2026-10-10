// app/(app)/deleted/page.tsx
import { VaultList } from "@/components/vault-list";

export default function DeletedPage() {
  return <VaultList status="deleted" />;
}