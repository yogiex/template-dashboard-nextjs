/**
 * Copy user-facing untuk `CommandMenu` (`src/components/custom/command-menu.tsx`).
 *
 * Judul group dan status keyboard disimpan di config supaya komponen tidak
 * menulis string tampil inline.
 */

export interface CommandMenuConfig {
  recentGroupTitle: string;
  recentListLabel: string;
  navigationListLabel: string;
  /** `aria-label` tombol pemicu; shortcut ditampilkan lewat `aria-keyshortcuts`. */
  triggerLabel: string;
  searchPlaceholder: string;
  searchLabel: string;
  dialogTitle: string;
  emptyLabel: string;
  shortcutHint: string;
}

export const COMMAND_MENU_CONFIG: CommandMenuConfig = {
  recentGroupTitle: "Terbaru dikunjungi",
  recentListLabel: "Halaman yang baru dikunjungi",
  navigationListLabel: "Navigasi",
  triggerLabel: "Buka command menu",
  searchPlaceholder: "Cari navigasi...",
  searchLabel: "Cari navigasi",
  dialogTitle: "Command menu",
  emptyLabel: "Tidak ada hasil.",
  shortcutHint: "Esc",
};
