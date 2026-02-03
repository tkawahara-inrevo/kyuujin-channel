// app/_components/Breadcrumbs.tsx
import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({
  items,
  variant = "admin",
}: {
  items: Crumb[];
  variant?: "admin" | "super";
}) {
  const sep = variant === "super" ? "text-white/30" : "text-slate-400";
  const link =
    variant === "super"
      ? "font-medium text-white/80 hover:text-white hover:underline"
      : "font-medium text-blue-700 hover:underline";
  const last = variant === "super" ? "font-semibold text-white" : "font-semibold text-slate-900";
  const base = variant === "super" ? "text-sm text-white/60" : "text-sm text-slate-600";

  return (
    <nav className={base} aria-label="breadcrumbs">
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;

          return (
            <div key={i} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link href={item.href} className={link}>
                  {item.label}
                </Link>
              ) : (
                <span className={last}>{item.label}</span>
              )}

              {!isLast && <span className={sep}>›</span>}
            </div>
          );
        })}
      </div>
    </nav>
  );
}
