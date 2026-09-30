import type { Config } from "tailwindcss";
import agere from "./tailwind.preset";

export default {
  presets: [agere],
  content: ["./src/**/*.{ts,tsx}"],
} satisfies Config;
