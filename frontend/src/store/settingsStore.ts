import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "earthy" | "light" | "cyber" | "system";

interface SettingsState {
  lowPowerMode: boolean;
  theme: Theme;
  googleClientId: string;
  googleClientSecret: string;
  liveFeedNotificationsEnabled: boolean;
  setLowPowerMode: (value: boolean) => void;
  setTheme: (theme: Theme) => void;
  setGoogleClientId: (value: string) => void;
  setGoogleClientSecret: (value: string) => void;
  setLiveFeedNotificationsEnabled: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      lowPowerMode: false,
      theme: "light", // Default to light mode for Corporate Trust design
      googleClientId: "",
      googleClientSecret: "",
      liveFeedNotificationsEnabled: true,
      setLowPowerMode: (value) => set({ lowPowerMode: value }),
      setTheme: (theme) => set({ theme }),
      setGoogleClientId: (value) => set({ googleClientId: value }),
      setGoogleClientSecret: (value) => set({ googleClientSecret: value }),
      setLiveFeedNotificationsEnabled: (value) => set({ liveFeedNotificationsEnabled: value }),
    }),
    {
      name: "soc-settings",
    }
  )
);

