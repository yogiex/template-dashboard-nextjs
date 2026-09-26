/**
 * Copy user-facing untuk primitive `CopyButton` (`src/components/custom/copy-button.tsx`).
 *
 * Nilai yang disalin (hash, id aktor, id log) tidak pernah dicatat di log dan tidak
 * ikut di `aria-label`; label di bawah hanya menjelaskan aksi, bukan isi nilai.
 */

export interface CopyButtonConfig {
  /** Label default saat tombol masih dalam keadaan idle. */
  label: string;
  /** `aria-label` yang dipakai setelah nilai berhasil disalin. */
  copiedLabel: string;
  /** Pesan `aria-live` setelah nilai berhasil disalin. */
  copiedStatus: string;
  /** Pesan `aria-live` saat clipboard tidak tersedia atau menolak. */
  failedStatus: string;
}

export const COPY_BUTTON_CONFIG: CopyButtonConfig = {
  label: "Salin nilai",
  copiedLabel: "Tersalin",
  copiedStatus: "Nilai disalin ke papan klip.",
  failedStatus: "Nilai gagal disalin ke papan klip.",
};
