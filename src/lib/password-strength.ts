export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
}

const LABELS: Record<PasswordStrength["score"], string> = {
  0: "Sangat lemah",
  1: "Lemah",
  2: "Cukup",
  3: "Kuat",
  4: "Sangat kuat",
};

export function getPasswordStrength(password: string): PasswordStrength {
  if (typeof password !== "string" || password.length === 0) {
    return { score: 0, label: LABELS[0] };
  }

  let score = 1;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (/^(.)\1+$/.test(password)) {
    score = Math.min(score, 1);
  }
  if (/^(?:password|qwerty|123456|admin|letmein)/i.test(password)) {
    score = Math.min(score, 1);
  }

  const clamped = Math.max(0, Math.min(4, score)) as PasswordStrength["score"];
  return { score: clamped, label: LABELS[clamped] };
}
