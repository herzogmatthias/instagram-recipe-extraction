/**
 * Settings Page
 * Allows users to configure Firebase Client SDK, Backend Secrets, and Model Preferences
 */

"use client";

import { useState, useEffect } from "react";
import { FirebaseClientCard } from "@/components/settings/FirebaseClientCard";
import { BackendSecretsCard } from "@/components/settings/BackendSecretsCard";
import { ModelPreferenceCard } from "@/components/settings/ModelPreferenceCard";
import { SecurityInfoCard } from "@/components/settings/SecurityInfoCard";
import { KeyRotationCard } from "@/components/settings/KeyRotationCard";
import { BackupGuideCard } from "@/components/settings/BackupGuideCard";
import { SourceLinkCard } from "@/components/settings/SourceLinkCard";
import type {
  FirebaseClientConfig,
  ModelPreference,
  UserPreferencesDocument,
} from "@/models/UserPreferences";
import type {
  SecretMetadata,
  ConfigStatus,
} from "@/components/settings/settings.types";
import { getOverallStatus } from "@/components/settings/settings.utils";

export default function SettingsPage() {
  const [clientConfig, setClientConfig] = useState<
    FirebaseClientConfig | undefined
  >();
  const [modelPreference, setModelPreference] = useState<
    ModelPreference | undefined
  >();
  const [existingSecrets, setExistingSecrets] = useState<SecretMetadata[]>([]);
  const [clientConfigStatus, setClientConfigStatus] =
    useState<ConfigStatus>("not-configured");
  const [secretsStatus, setSecretsStatus] =
    useState<ConfigStatus>("not-configured");
  const [modelPreferenceStatus, setModelPreferenceStatus] =
    useState<ConfigStatus>("not-configured");
  const [isLoading, setIsLoading] = useState(true);

  // Load existing preferences on mount
  useEffect(() => {
    async function loadPreferences() {
      try {
        const response = await fetch("/api/preferences");
        if (response.ok) {
          const data: UserPreferencesDocument = await response.json();

          // Load client config
          if (data.clientConfig) {
            setClientConfig(data.clientConfig);
            setClientConfigStatus("ready");
          }

          // Load model preference
          if (data.modelPreference) {
            setModelPreference(data.modelPreference);
            setModelPreferenceStatus("ready");
          }

          // Load secrets metadata
          if (data.secrets?.items) {
            const secretsList: SecretMetadata[] = Object.entries(
              data.secrets.items
            ).map(([name, secret]) => ({
              name,
              last4: secret.last4,
              lastValidatedAt: secret.lastValidatedAt,
              isConfigured: true,
            }));
            setExistingSecrets(secretsList);
            setSecretsStatus(
              secretsList.length > 0 ? "ready" : "not-configured"
            );
          }
        }
      } catch (error) {
        console.error("Failed to load preferences:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadPreferences();
  }, []);

  const overallStatus = getOverallStatus(
    clientConfigStatus,
    secretsStatus,
    modelPreferenceStatus
  );

  const handleClientConfigSaved = (config: FirebaseClientConfig) => {
    setClientConfig(config);
    setClientConfigStatus("ready");
  };

  const handleSecretsSaved = () => {
    // Reload secrets metadata
    fetch("/api/preferences")
      .then((res) => res.json())
      .then((data: UserPreferencesDocument) => {
        if (data.secrets?.items) {
          const secretsList: SecretMetadata[] = Object.entries(
            data.secrets.items
          ).map(([name, secret]) => ({
            name,
            last4: secret.last4,
            lastValidatedAt: secret.lastValidatedAt,
            isConfigured: true,
          }));
          setExistingSecrets(secretsList);
          setSecretsStatus(secretsList.length > 0 ? "ready" : "not-configured");
        }
      })
      .catch(console.error);
  };

  const handleModelPreferenceSaved = (preference: ModelPreference) => {
    setModelPreference(preference);
    setModelPreferenceStatus("ready");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFB] p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-[#333333]">Settings</h1>
            <p className="mt-2 text-sm text-[#333333]/60">
              Loading your preferences...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#333333]">Settings</h1>
          <p className="mt-2 text-sm text-[#333333]/60">
            Configure your Firebase Client SDK, Backend API Keys, and AI Model
            preferences.
          </p>
        </div>

        {/* Main layout: 2/3 content + 1/3 sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main content area (2/3) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Firebase Client Card */}
            <FirebaseClientCard
              initialConfig={clientConfig}
              onConfigSaved={handleClientConfigSaved}
            />

            {/* Backend Secrets Card */}
            <BackendSecretsCard
              existingSecrets={existingSecrets}
              onSecretsSaved={handleSecretsSaved}
            />

            {/* Model Preference Card */}
            <ModelPreferenceCard
              initialPreference={modelPreference}
              onPreferenceSaved={handleModelPreferenceSaved}
            />
          </div>

          {/* Sidebar (1/3) */}
          <div className="space-y-6 lg:col-span-1">
            <SecurityInfoCard />
            <KeyRotationCard />
            <BackupGuideCard />
            <SourceLinkCard />
          </div>
        </div>
      </div>
    </div>
  );
}
