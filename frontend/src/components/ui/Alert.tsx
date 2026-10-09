import { alert, type TipeAlert } from "@/lib/variants";

/* Server-safe: kotak pesan dengan role="alert" (galat) atau status */
export function Alert({
  tipe = "info",
  children,
  kelas = "",
  sebagaiStatus = false,
}: {
  tipe?: TipeAlert;
  children: React.ReactNode;
  kelas?: string;
  sebagaiStatus?: boolean;
}) {
  return (
    <div
      role={sebagaiStatus ? "status" : "alert"}
      aria-live={sebagaiStatus ? "polite" : "assertive"}
      className={`${alert({ tipe })} ${kelas}`}
    >
      {children}
    </div>
  );
}
