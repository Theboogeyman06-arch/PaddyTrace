import { defineRouting } from "next-intl/routing";
import { createNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["kn", "en"],
  defaultLocale: "kn", // Kannada is primary for Karnataka farmers
  localePrefix: "always",
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);

