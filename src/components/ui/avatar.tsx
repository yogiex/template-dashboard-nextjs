import type { ReactElement } from "react";
import { cn } from "cn";

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const avatarSizeClass = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
} as const;

/**
 * Inisial dari maksimal dua kata pertama. Nama kosong menghasilkan string
 * kosong supaya elemen fallback tetap dekoratif dan tidak clutter.
 */
function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

/**
 * Avatar presentasional: bulat dengan inisial atau gambar, tanpa logika bisnis.
 *
 * Aksesibilitas: bila `src` terisi, `<img>` memakai `alt={name}` sehingga nama
 * terbaca sekali oleh screen reader. Bila hanya inisial, inisial ditandai
 * `aria-hidden` karena pemanggil selalu merender nama sebagai teks di sebelah
 * avatar; inisial bukan pengganti nama.
 */
export function Avatar({
  name,
  src,
  size = "md",
  className,
}: AvatarProps): ReactElement {
  return (
    <span
      data-slot="avatar"
      data-size={size}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-medium text-muted-foreground select-none",
        avatarSizeClass[size],
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- host gambar berasal dari data eksternal yang tidak bisa didaftarkan di `next.config.ts`; `next/image` akan menolak host itu.
        <img
          src={src}
          alt={name}
          className="size-full object-cover"
          loading="lazy"
          decoding="async"
        />
      ) : (
        <span aria-hidden="true">{initialsFromName(name)}</span>
      )}
    </span>
  );
}
