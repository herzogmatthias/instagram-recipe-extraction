/**
 * Security Info Card Component
 * Displays security information about encryption
 */

import { Card } from "@/components/ui/card";

export function SecurityInfoCard() {
  return (
    <Card className="border-[#EAEAEA] bg-white p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[#333333]">🔒 Security</h3>
      </div>
      <div className="space-y-2 text-sm text-[#333333]/70">
        <p>Your backend secrets use two-layer encryption:</p>
        <ul className="ml-4 list-disc space-y-1 text-xs">
          <li>
            <strong>Transit:</strong> AES-256-GCM in browser before sending
          </li>
          <li>
            <strong>Storage:</strong> Re-encrypted with DEK + Master Key
          </li>
          <li>256-bit keys with authentication tags</li>
          <li>Defense-in-depth protection</li>
        </ul>
        <p className="pt-2 text-xs text-[#333333]/50">
          Transit key is exposed (public), but adds protection even if HTTPS is
          compromised. Master key is server-only.
        </p>
      </div>
    </Card>
  );
}
