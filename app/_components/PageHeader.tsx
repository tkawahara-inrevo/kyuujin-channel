// app/_components/PageHeader.tsx
import Breadcrumbs, { type Crumb } from "./Breadcrumbs";
import BackButton from "./BackButton";

type Variant = "admin" | "super";

export default function PageHeader({
  variant = "admin",
  title,
  subtitle,
  crumbs,
  backFallbackHref,
  backLabel,
  actions,
}: {
  variant?: Variant;
  title: string;
  subtitle?: string;
  crumbs: Crumb[];
  backFallbackHref: string;
  backLabel?: string;
  actions?: React.ReactNode;
}) {
  const styles =
    variant === "super"
      ? {
          wrap: "rounded-2xl border border-white/10 bg-white/5 p-6",
          title: "text-2xl font-extrabold tracking-tight text-white",
          subtitle: "mt-1 text-sm text-white/70",
          row: "mt-3 flex flex-wrap items-start justify-between gap-3",
        }
      : {
          wrap: "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
          title: "text-2xl font-extrabold tracking-tight text-slate-900",
          subtitle: "mt-1 text-sm text-slate-600",
          row: "mt-3 flex flex-wrap items-start justify-between gap-3",
        };

  return (
    <header className={styles.wrap}>
      <Breadcrumbs items={crumbs} variant={variant} />

      <div className={styles.row}>
        <div>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          <BackButton variant={variant} fallbackHref={backFallbackHref} label={backLabel} />
        </div>
      </div>
    </header>
  );
}
