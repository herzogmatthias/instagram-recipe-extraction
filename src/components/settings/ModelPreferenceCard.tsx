/**
 * Model Preference Card Component
 * Form for configuring default Gemini model
 */

"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ModelPreferenceCardProps } from "./settings.types";
import { validateGeminiModel, formatLastValidated } from "./settings.utils";

const SUGGESTED_MODELS = [
  { name: "gemini-2.5-pro", description: "Best for complex tasks" },
  { name: "gemini-2.5-flash", description: "Fast and efficient" },
  { name: "gemini-2.5-flash-exp", description: "Experimental features" },
];

export function ModelPreferenceCard({
  initialPreference,
  onPreferenceSaved,
}: ModelPreferenceCardProps) {
  const [modelName, setModelName] = useState(
    initialPreference?.geminiDefaultModel || "gemini-1.5-flash"
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      if (!validateGeminiModel(modelName)) {
        setError("Invalid model name. Must start with 'gemini-'");
        setIsSaving(false);
        return;
      }

      const response = await fetch("/api/preferences/modelPreference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiDefaultModel: modelName }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess("Model preference saved successfully!");
        if (onPreferenceSaved) {
          onPreferenceSaved(result.modelPreference);
        }
      } else {
        setError(result.error || "Failed to save model preference");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save model preference"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const isConfigured = !!initialPreference?.geminiDefaultModel;
  const lastValidated = formatLastValidated(initialPreference?.lastValidatedAt);

  return (
    <Card className="border-[#EAEAEA] bg-white p-6">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#333333]">
            Model Preference
          </h2>
          <p className="mt-1 text-sm text-[#333333]/60">
            Choose your default Gemini AI model for recipe extraction
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

      {/* Suggested models */}
      <div className="mb-4 space-y-2">
        <label className="block text-sm font-medium text-[#333333]">
          Quick Select
        </label>
        <div className="grid gap-2">
          {SUGGESTED_MODELS.map((model) => (
            <button
              key={model.name}
              onClick={() => {
                setModelName(model.name);
                setError(null);
                setSuccess(null);
              }}
              className={`flex items-center justify-between rounded-md border p-3 text-left transition-colors ${
                modelName === model.name
                  ? "border-[#D6E2C3] bg-[#D6E2C3]/20"
                  : "border-[#EAEAEA] bg-white hover:bg-[#FDFDFB]"
              }`}
            >
              <div>
                <p className="font-medium text-[#333333]">{model.name}</p>
                <p className="text-xs text-[#333333]/60">{model.description}</p>
              </div>
              {modelName === model.name && (
                <div className="h-4 w-4 rounded-full bg-[#D6E2C3]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Custom model input */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-[#333333]">
          Model Name <span className="text-red-500">*</span>
        </label>
        <Input
          type="text"
          placeholder="gemini-1.5-flash"
          value={modelName}
          onChange={(e) => {
            setModelName(e.target.value);
            setError(null);
            setSuccess(null);
          }}
          className="border-[#EAEAEA]"
        />
        <p className="mt-1 text-xs text-[#333333]/40">
          Enter a custom Gemini model name or select from suggestions above
        </p>
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
          {isSaving ? "Saving..." : "Save Preference"}
        </Button>
      </div>
    </Card>
  );
}
