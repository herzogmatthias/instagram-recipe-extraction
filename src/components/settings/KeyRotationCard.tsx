/**
 * Key Rotation Card Component
 * Information about key rotation
 */

import { Card } from "@/components/ui/card";

export function KeyRotationCard() {
  return (
    <Card className="border-[#EAEAEA] bg-white p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[#333333]">
          🔄 Key Rotation
        </h3>
      </div>
      <div className="space-y-2 text-sm text-[#333333]/70">
        <p>To rotate your encryption keys:</p>
        <ol className="ml-4 list-decimal space-y-1 text-xs">
          <li>Generate a new master key</li>
          <li>
            Update{" "}
            <code className="rounded bg-[#FDFDFB] px-1 py-0.5">
              ENCRYPTION_MASTER_KEY
            </code>{" "}
            in your environment
          </li>
          <li>Re-save all secrets (they will be re-encrypted)</li>
          <li>Old DEK is automatically replaced</li>
        </ol>
        <p className="pt-2 text-xs text-[#333333]/50">
          Rotation is recommended every 90 days for maximum security.
        </p>
      </div>
    </Card>
  );
}
