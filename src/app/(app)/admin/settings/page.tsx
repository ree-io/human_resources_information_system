import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  await requireAdmin();
  const settings = getSettings();

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Office-wide configuration for the DTR.
        </p>
      </div>
      <SettingsForm
        officeName={settings.officeName}
        officeTimezone={settings.officeTimezone}
      />
    </div>
  );
}
