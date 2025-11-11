/**
 * Backend Secrets Card Component
 * Form for configuring backend API keys (APIFY, Gemini, Firebase SA)
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type {
  BackendSecretsCardProps,
  BackendSecretsFormData,
} from "./settings.types";
import { parseServiceAccountJSON, formatLastValidated } from "./settings.utils";
import { encryptSecretsClient } from "@/lib/shared/utils/clientEncryption";

export function BackendSecretsCard({
  existingSecrets = [],
  onSecretsSaved,
}: BackendSecretsCardProps) {
  const [formData, setFormData] = useState<BackendSecretsFormData>({
    APIFY_API_KEY: "",
    GEMINI_API_KEY: "",
    FIREBASE_SA_JSON: "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [serviceAccountFile, setServiceAccountFile] = useState<File | null>(
    null
  );

  const handleChange = (field: keyof BackendSecretsFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setServiceAccountFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData((prev) => ({ ...prev, FIREBASE_SA_JSON: content }));
    };
    reader.readAsText(file);
    setError(null);
    setSuccess(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate service account JSON if provided
      if (formData.FIREBASE_SA_JSON) {
        const validation = parseServiceAccountJSON(formData.FIREBASE_SA_JSON);
        if (!validation.valid) {
          setError(`Invalid service account JSON: ${validation.error}`);
          setIsSaving(false);
          return;
        }
      }

      // Filter out empty values
      const secretsToSave = Object.entries(formData)
        .filter(([_, value]) => value && value.trim().length > 0)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});

      if (Object.keys(secretsToSave).length === 0) {
        setError("Please provide at least one secret to save");
        setIsSaving(false);
        return;
      }

      // Encrypt secrets client-side before sending
      const encryptedSecrets = await encryptSecretsClient(secretsToSave);

      const response = await fetch("/api/secrets/testAndSave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(encryptedSecrets),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(
          `Successfully saved ${Object.keys(secretsToSave).length} secret(s)!`
        );
        // Clear form
        setFormData({
          APIFY_API_KEY: "",
          GEMINI_API_KEY: "",
          FIREBASE_SA_JSON: "",
        });
        setServiceAccountFile(null);
        if (onSecretsSaved) {
          onSecretsSaved();
        }
      } else {
        setError(result.error || "Failed to save secrets");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save secrets");
    } finally {
      setIsSaving(false);
    }
  };

  const apifySecret = existingSecrets.find((s) => s.name === "APIFY_API_KEY");
  const geminiSecret = existingSecrets.find((s) => s.name === "GEMINI_API_KEY");
  const firebaseSecret = existingSecrets.find(
    (s) => s.name === "FIREBASE_SA_JSON"
  );

  return (
    <Card className="border-[#EAEAEA] bg-white p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#333333]">
            Backend Secrets
          </h2>
          <p className="mt-1 text-sm text-[#333333]/60">
            Configure API keys for Apify, Gemini, and Firebase Admin SDK
          </p>
        </div>
        {existingSecrets.length > 0 && (
          <Badge variant="default" className="bg-[#D6E2C3] text-[#333333]">
            {existingSecrets.length} Secret
            {existingSecrets.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Existing secrets summary */}
      {existingSecrets.length > 0 && (
        <div className="mb-6 space-y-2 rounded-md border border-[#EAEAEA] bg-[#FDFDFB] p-4">
          <p className="mb-2 text-xs font-medium text-[#333333]/60">
            Currently configured:
          </p>
          {existingSecrets.map((secret) => (
            <div
              key={secret.name}
              className="flex items-center justify-between text-sm"
            >
              <span className="font-medium text-[#333333]">{secret.name}</span>
              <div className="flex items-center gap-2 text-xs text-[#333333]/60">
                {secret.last4 && <span>...{secret.last4}</span>}
                <span>•</span>
                <span>{formatLastValidated(secret.lastValidatedAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {/* APIFY API Key */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-[#333333]">
              APIFY API Key{" "}
              {apifySecret && (
                <span className="text-[#333333]/40">(configured)</span>
              )}
            </label>
          </div>
          <Input
            type="password"
            placeholder="apify_api_..."
            value={formData.APIFY_API_KEY}
            onChange={(e) => handleChange("APIFY_API_KEY", e.target.value)}
            className="border-[#EAEAEA]"
          />
          <p className="mt-1 text-xs text-[#333333]/40">
            Used for scraping Instagram posts via Apify
          </p>
        </div>

        {/* Gemini API Key */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-[#333333]">
              Gemini API Key{" "}
              {geminiSecret && (
                <span className="text-[#333333]/40">(configured)</span>
              )}
            </label>
          </div>
          <Input
            type="password"
            placeholder="AIza..."
            value={formData.GEMINI_API_KEY}
            onChange={(e) => handleChange("GEMINI_API_KEY", e.target.value)}
            className="border-[#EAEAEA]"
          />
          <p className="mt-1 text-xs text-[#333333]/40">
            Used for recipe extraction and chat functionality
          </p>
        </div>

        {/* Firebase Service Account JSON */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-[#333333]">
              Firebase Service Account JSON{" "}
              {firebaseSecret && (
                <span className="text-[#333333]/40">(configured)</span>
              )}
            </label>
          </div>
          <div className="space-y-2">
            <Input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="border-[#EAEAEA]"
            />
            {serviceAccountFile && (
              <div className="rounded-md border border-[#D6E2C3] bg-[#D6E2C3]/20 p-2">
                <p className="text-xs text-[#333333]">
                  📄 {serviceAccountFile.name} (
                  {Math.round(serviceAccountFile.size / 1024)} KB)
                </p>
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-[#333333]/40">
            Upload your Firebase Admin SDK service account JSON file
          </p>
        </div>
      </div>

      {/* Error/Success messages */}
      {error && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-md border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-6">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#D6E2C3] text-[#333333] hover:bg-[#D6E2C3]/90"
        >
          {isSaving ? "Saving..." : "Test & Save Secrets"}
        </Button>
        <p className="mt-2 text-xs text-[#333333]/40">
          Secrets will be encrypted with AES-256-GCM before storage
        </p>
      </div>
    </Card>
  );
}
