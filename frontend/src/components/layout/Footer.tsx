/* Server Component: footer sederhana */
import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pb-10 pt-6 text-[11px] text-neutral-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p className="mikro">ARnatomy, prototipe front-end SKPL v1.0</p>
      <p>
        Model 3D:{" "}
        <a
          href="https://humanatlas.io/3d-reference-library"
          className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
        >
          HuBMAP Human Reference Atlas
        </a>
        , CC BY 4.0 &middot; Mode AR: WebXR (ARCore/ARKit) atau kamera perangkat &middot; D3 Teknik Informatika &middot;{" "}
        <Link
          href="/kebijakan-privasi"
          className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900"
        >
          Privasi
        </Link>{" "}
        &middot;{" "}
        <Link href="/syarat" className="underline decoration-neutral-300 underline-offset-2 hover:text-neutral-900">
          Syarat
        </Link>
      </p>
    </footer>
  );
}
