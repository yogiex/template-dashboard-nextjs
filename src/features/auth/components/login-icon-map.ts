import type { LucideIcon } from "lucide-react";
import { BarChart3, Lock, Shield, Sparkles, Users, Zap } from "lucide-react";

import type { LoginIconName } from "@/features/auth/schema";

const loginIconMap: Record<LoginIconName, LucideIcon> = {
  shield: Shield,
  zap: Zap,
  "bar-chart": BarChart3,
  users: Users,
  lock: Lock,
  sparkles: Sparkles,
};

export function getLoginIcon(name: LoginIconName): LucideIcon {
  return loginIconMap[name];
}
