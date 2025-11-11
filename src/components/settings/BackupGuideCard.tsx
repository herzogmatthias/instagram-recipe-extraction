/**
 * Backup Guide Card Component
 * Information about backing up configuration
 */

import { Card } from "@/components/ui/card";

export function BackupGuideCard() {
  return (
    <Card className="border-[#EAEAEA] bg-white p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[#333333]">💾 Backup</h3>
      </div>
      <div className="space-y-2 text-sm text-[#333333]/70">
        <p>Your configuration is stored in Firestore:</p>
        <ul className="ml-4 list-disc space-y-1 text-xs">
          <li>
            Collection:{" "}
            <code className="rounded bg-[#FDFDFB] px-1 py-0.5">
              userpreferences
            </code>
          </li>
          <li>
            Document ID:{" "}
            <code className="rounded bg-[#FDFDFB] px-1 py-0.5">singleton</code>
          </li>
          <li>Automatic Firestore backups apply</li>
        </ul>
        <p className="pt-2 text-xs text-[#333333]/50">
          Consider exporting your Firebase Client SDK config separately for
          disaster recovery.
        </p>
      </div>
    </Card>
  );
}
