import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";

const TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
];

const cancel = () => {
  p.cancel("Dibatalkan.");
  process.exit(1);
};

p.intro("Guided commit (Conventional Commits)");

const type = await p.select({
  message: "Pilih type commit",
  options: TYPES.map((value) => ({ value, label: value })),
  initialValue: "chore",
});
if (p.isCancel(type)) cancel();

const scope = await p.text({
  message: "Scope (opsional, contoh: auth, settings)",
  placeholder: "auth",
  defaultValue: "",
  validate: (value) => {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return undefined;
    return /^[a-z0-9./-]+$/.test(trimmed) ? undefined : "Scope harus lowercase tanpa spasi.";
  },
});
if (p.isCancel(scope)) cancel();

const description = await p.text({
  message: "Deskripsi singkat (imperatif, tanpa titik di akhir)",
  placeholder: "add protected dashboard route",
  validate: (value) => {
    const trimmed = (value ?? "").trim();
    if (trimmed.length === 0) return "Deskripsi wajib diisi.";
    if (trimmed.length > 72) return "Deskripsi maksimal 72 karakter.";
    return undefined;
  },
});
if (p.isCancel(description)) cancel();

const body = await p.text({
  message: "Body (opsional, alasan perubahan; Enter untuk melewati)",
  placeholder: "Mengapa perubahan ini diperlukan.",
  defaultValue: "",
});
if (p.isCancel(body)) cancel();

const breaking = await p.confirm({
  message: "Breaking change?",
  initialValue: false,
});
if (p.isCancel(breaking)) cancel();

const headerParts = [String(type)];
const trimmedScope = (scope ?? "").trim();
if (trimmedScope.length > 0) headerParts.push(`(${trimmedScope})`);
if (breaking) headerParts.push("!");
headerParts.push(`: ${description.trim()}`);

const messageLines = [headerParts.join("")];
const trimmedBody = (body ?? "").trim();
if (trimmedBody.length > 0) messageLines.push("", trimmedBody);
if (breaking) {
  messageLines.push("", "BREAKING CHANGE: jelaskan dampak perubahan di sini.");
}

const message = `${messageLines.join("\n")}\n`;
const messageFile = join(".git", "COMMIT_EDITMSG");
writeFileSync(messageFile, message, "utf8");

p.note(message, "Commit message");
p.outro("Menjalankan git commit. Hook lint-staged dan commitlint tetap berjalan.");

const result = spawnSync("git", ["commit", "--file", messageFile, "--cleanup=verbatim"], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
