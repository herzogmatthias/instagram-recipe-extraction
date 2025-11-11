/**
 * Firebase Client Card Component
 * Form for configuring Firebase Client SDK credentials
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { FirebaseClientCardProps } from "./settings.types";
import { validateFirebaseConfig, formatLastValidated } from "./settings.utils";

export function FirebaseClientCard({
  initialConfig,
  onConfigSaved,
}: FirebaseClientCardProps) {
  const [formData, setFormData] = useState({
    apiKey: initialConfig?.apiKey || "",
    authDomain: initialConfig?.authDomain || "",
    projectId: initialConfig?.projectId || "",
    storageBucket: initialConfig?.storageBucket || "",
    messagingSenderId: initialConfig?.messagingSenderId || "",
    appId: initialConfig?.appId || "",
    measurementId: initialConfig?.measurementId || "",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setSuccess(null);
  };

  const handleTest = async () => {
    setIsTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const validation = validateFirebaseConfig(formData);
      if (!validation.valid) {
        setError(`Missing required fields: ${validation.missing.join(", ")}`);
        setIsTesting(false);
        return;
      }

      const response = await fetch("/api/setup/testClientConfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setSuccess("Firebase configuration is valid!");
      } else {
        setError(result.error || "Configuration test failed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to test configuration"
      );
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const validation = validateFirebaseConfig(formData);
      if (!validation.valid) {
        setError(`Missing required fields: ${validation.missing.join(", ")}`);
        setIsSaving(false);
        return;
      }

      const response = await fetch("/api/preferences/clientConfig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Firebase configuration saved successfully!");
        if (onConfigSaved) {
          onConfigSaved(result.clientConfig);
        }
      } else {
        setError(result.error || "Failed to save configuration");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = !!initialConfig?.apiKey;
  const lastValidated = formatLastValidated(initialConfig?.lastValidatedAt);

  return (
    <Card className="border-[#EAEAEA] bg-white p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#333333]">
            Firebase Client SDK
          </h2>
          <p className="mt-1 text-sm text-[#333333]/60">
            Configure your Firebase project for client-side authentication
          </p>
        </div>
        {isConfigured && (
          <Badge variant="default" className="bg-[#D6E2C3] text-[#333333]">
            Configured
          </Badge>
        )}
      </div>

      {isConfigured && (
        <div className="mb-4 rounded-md border border-[#EAEAEA] bg-[#FDFDFB] p-3">
          <p className="text-xs text-[#333333]/60">
            Last validated:{" "}
            <span className="font-medium text-[#333333]">{lastValidated}</span>
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* API Key */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            API Key <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="AIza..."
            value={formData.apiKey}
            onChange={(e) => handleChange("apiKey", e.target.value)}
            className="border-[#EAEAEA]"
          />
        </div>

        {/* Auth Domain */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            Auth Domain <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="your-project.firebaseapp.com"
            value={formData.authDomain}
            onChange={(e) => handleChange("authDomain", e.target.value)}
            className="border-[#EAEAEA]"
          />
        </div>

        {/* Project ID */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            Project ID <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="your-project-id"
            value={formData.projectId}
            onChange={(e) => handleChange("projectId", e.target.value)}
            className="border-[#EAEAEA]"
          />
        </div>

        {/* Storage Bucket */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            Storage Bucket <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="your-project.firebasestorage.app"
            value={formData.storageBucket}
            onChange={(e) => handleChange("storageBucket", e.target.value)}
            className="border-[#EAEAEA]"
          />
        </div>

        {/* Messaging Sender ID */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            Messaging Sender ID <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="123456789012"
            value={formData.messagingSenderId}
            onChange={(e) => handleChange("messagingSenderId", e.target.value)}
            className="border-[#EAEAEA]"
          />
        </div>

        {/* App ID */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            App ID <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="1:123456789012:web:abc123..."
            value={formData.appId}
            onChange={(e) => handleChange("appId", e.target.value)}
            className="border-[#EAEAEA]"
          />
        </div>

        {/* Measurement ID (optional) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#333333]">
            Measurement ID <span className="text-[#333333]/40">(optional)</span>
          </label>
          <Input
            type="text"
            placeholder="G-XXXXXXXXXX"
            value={formData.measurementId}
            onChange={(e) => handleChange("measurementId", e.target.value)}
            className="border-[#EAEAEA]"
          />
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
      <div className="mt-6 flex gap-3">
        <Button
          onClick={handleTest}
          disabled={isTesting || isSaving}
          variant="outline"
          className="border-[#EAEAEA]"
        >
          {isTesting ? "Testing..." : "Test Configuration"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving || isTesting}
          className="bg-[#D6E2C3] text-[#333333] hover:bg-[#D6E2C3]/90"
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </Button>
      </div>
    </Card>
  );
}
