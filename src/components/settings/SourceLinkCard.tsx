/**
 * Source Link Card Component
 * Links to documentation and source code
 */

import { Card } from "@/components/ui/card";

export function SourceLinkCard() {
  return (
    <Card className="border-[#EAEAEA] bg-white p-5">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-[#333333]">📚 Resources</h3>
      </div>
      <div className="space-y-2 text-sm text-[#333333]/70">
        <p className="text-xs">Get your credentials from:</p>
        <ul className="ml-4 list-disc space-y-1.5 text-xs">
          <li>
            <a
              href="https://console.firebase.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#333333] underline hover:text-[#333333]/70"
            >
              Firebase Console
            </a>
          </li>
          <li>
            <a
              href="https://console.apify.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#333333] underline hover:text-[#333333]/70"
            >
              Apify Console
            </a>
          </li>
          <li>
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#333333] underline hover:text-[#333333]/70"
            >
              Google AI Studio (Gemini)
            </a>
          </li>
        </ul>
      </div>
    </Card>
  );
}
