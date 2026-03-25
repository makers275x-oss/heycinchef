import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.cinchef.app",
  appName: "CinChef",
  webDir: ".next",
  server: {
    url: "https://heycinchef.com",
    cleartext: false,
    allowNavigation: ["heycinchef.com", "*.heycinchef.com"],
  },
};

export default config;