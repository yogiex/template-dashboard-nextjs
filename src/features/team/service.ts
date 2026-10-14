import "server-only";

import {
  teamMemberSchema,
  teamQuerySchema,
  deleteTeamMemberSchema,
  createTeamMemberSchema,
  updateTeamMemberSchema,
  type TeamMember,
  type TeamQuery,
  type TeamListResult,
} from "@/features/team/schema";

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  { id: "tmb_01", name: "Budi Santoso", email: "budi@acme.co", role: "admin", status: "active", createdAt: new Date("2024-01-12") },
  { id: "tmb_02", name: "Sari Wulandari", email: "sari@acme.co", role: "editor", status: "active", createdAt: new Date("2024-02-03") },
  { id: "tmb_03", name: "Andi Pratama", email: "andi@acme.co", role: "viewer", status: "pending", createdAt: new Date("2024-03-21") },
  { id: "tmb_04", name: "Dewi Lestari", email: "dewi@acme.co", role: "editor", status: "active", createdAt: new Date("2024-04-08") },
  { id: "tmb_05", name: "Rizky Hidayat", email: "rizky@acme.co", role: "viewer", status: "suspended", createdAt: new Date("2024-05-17") },
  { id: "tmb_06", name: "Maya Sari", email: "maya@acme.co", role: "admin", status: "active", createdAt: new Date("2024-06-02") },
  { id: "tmb_07", name: "Fajar Nugroho", email: "fajar@acme.co", role: "viewer", status: "active", createdAt: new Date("2024-07-11") },
  { id: "tmb_08", name: "Intan Permata", email: "intan@acme.co", role: "editor", status: "pending", createdAt: new Date("2024-08-25") },
  { id: "tmb_09", name: "Agus Salim", email: "agus@acme.co", role: "viewer", status: "active", createdAt: new Date("2024-09-14") },
  { id: "tmb_10", name: "Rina Marlina", email: "rina@acme.co", role: "editor", status: "active", createdAt: new Date("2024-10-30") },
  { id: "tmb_11", name: "Hendra Wijaya", email: "hendra@acme.co", role: "viewer", status: "suspended", createdAt: new Date("2024-11-19") },
  { id: "tmb_12", name: "Putri Ayu", email: "putri@acme.co", role: "admin", status: "active", createdAt: new Date("2024-12-05") },
].map((m) => teamMemberSchema.parse(m));

const members: TeamMember[] = [...MOCK_TEAM_MEMBERS];
const nextMemberId = MOCK_TEAM_MEMBERS.length + 1;

function applySort(
  data: TeamMember[],
  sort: TeamQuery["sort"],
  dir: TeamQuery["dir"],
): TeamMember[] {
  const key = sort ?? "createdAt";
  const dirMul = (dir ?? "desc") === "desc" ? -1 : 1;
  return [...data].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (va instanceof Date && vb instanceof Date) {
      return (va.getTime() - vb.getTime()) * dirMul;
    }
    return String(va).localeCompare(String(vb)) * dirMul;
  });
}

export async function getTeamMembers(
  query: TeamQuery,
): Promise<TeamListResult> {
  let result = [...members];

  if (query.q) {
    const q = query.q.toLowerCase();
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }

  if (query.role) {
    result = result.filter((m) => m.role === query.role);
  }

  result = applySort(result, query.sort, query.dir);

  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const total = result.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const data = result.slice(start, start + pageSize);

  return { data, total, page, pageSize, totalPages };
}
