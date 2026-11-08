import { cn } from "@/lib/utils";

/** FontAwesome 6 icon (stylesheet loaded in the root head). */
export function Icon({
  name,
  className,
  variant = "solid",
}: {
  name: string;
  className?: string;
  variant?: "solid" | "regular" | "brands";
}) {
  return <i aria-hidden className={cn(`fa-${variant}`, `fa-${name}`, className)} />;
}
