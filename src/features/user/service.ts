import "server-only"

import { createUserSchema, deleteUserSchema, updateUserSchema, type User, type UserListResult, type UserQuery } from "@/features/user/schema"
import { AppError } from "@/lib/error"

const MOCK_USERS: User[] = [
  { id: "usr_01", name: "Budi Santoso", email: "budi@acme.co", role: "admin", status: "active", createdAt: new Date("2024-01-12") },
  { id: "usr_02", name: "Sari Wulandari", email: "sari@acme.co", role: "editor", status: "active", createdAt: new Date("2024-02-03") },
  { id: "usr_03", name: "Andi Pratama", email: "andi@acme.co", role: "viewer", status: "pending", createdAt: new Date("2024-03-21") },
  { id: "usr_04", name: "Dewi Lestari", email: "dewi@acme.co", role: "editor", status: "active", createdAt: new Date("2024-04-08") },
  { id: "usr_05", name: "Rizky Hidayat", email: "rizky@acme.co", role: "viewer", status: "suspended", createdAt: new Date("2024-05-17") },
  { id: "usr_06", name: "Maya Sari", email: "maya@acme.co", role: "admin", status: "active", createdAt: new Date("2024-06-02") },
  { id: "usr_07", name: "Fajar Nugroho", email: "fajar@acme.co", role: "viewer", status: "active", createdAt: new Date("2024-07-11") },
  { id: "usr_08", name: "Intan Permata", email: "intan@acme.co", role: "editor", status: "pending", createdAt: new Date("2024-08-25") },
  { id: "usr_09", name: "Agus Salim", email: "agus@acme.co", role: "viewer", status: "active", createdAt: new Date("2024-09-14") },
  { id: "usr_10", name: "Rina Marlina", email: "rina@acme.co", role: "editor", status: "active", createdAt: new Date("2024-10-30") },
  { id: "usr_11", name: "Hendra Wijaya", email: "hendra@acme.co", role: "viewer", status: "suspended", createdAt: new Date("2024-11-19") },
  { id: "usr_12", name: "Putri Ayu", email: "putri@acme.co", role: "admin", status: "active", createdAt: new Date("2024-12-05") },
]

const users: User[] = [...MOCK_USERS]
let nextUserId = MOCK_USERS.length + 1

function validationError(error: { flatten(): { fieldErrors: Record<string, string[] | undefined> } }): AppError {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter(
      (entry): entry is [string, string[]] => entry[1] !== undefined,
    ),
  )

  return new AppError("VALIDATION_ERROR", { fieldErrors })
}

function ensureUniqueEmail(email: string, excludedId?: string): void {
  if (users.some((user) => user.id !== excludedId && user.email.toLowerCase() === email.toLowerCase())) {
    throw new AppError("CONFLICT", {
      message: "Email sudah digunakan.",
      fieldErrors: { email: ["Email sudah digunakan."] },
    })
  }
}

function paginate(data: User[], query: UserQuery): UserListResult {
  const total = data.length
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize))
  const page = Math.min(query.page, totalPages)
  const start = (page - 1) * query.pageSize

  return { data: data.slice(start, start + query.pageSize), total, page, pageSize: query.pageSize, totalPages }
}

export async function getUsers(query: UserQuery): Promise<UserListResult> {
  let result = [...users]
  const needle = query.q.toLowerCase()

  if (needle) {
    result = result.filter((user) => user.name.toLowerCase().includes(needle) || user.email.toLowerCase().includes(needle))
  }
  if (query.role) result = result.filter((user) => user.role === query.role)

  const direction = query.dir === "asc" ? 1 : -1
  result.sort((left, right) => {
    const comparison = query.sort === "name"
      ? left.name.localeCompare(right.name)
      : query.sort === "email"
        ? left.email.localeCompare(right.email)
        : left.createdAt.getTime() - right.createdAt.getTime()
    return comparison * direction
  })

  return paginate(result, query)
}

export async function getUserById(id: string): Promise<User> {
  const user = users.find((candidate) => candidate.id === id)
  if (!user) throw new AppError("NOT_FOUND", { message: "User tidak ditemukan." })
  return user
}

export async function createUser(input: unknown): Promise<User> {
  const parsed = createUserSchema.safeParse(input)
  if (!parsed.success) throw validationError(parsed.error)

  const email = parsed.data.email.toLowerCase()
  ensureUniqueEmail(email)

  const user: User = {
    ...parsed.data,
    id: `usr_${String(nextUserId).padStart(2, "0")}`,
    email,
    createdAt: new Date(),
  }
  nextUserId += 1
  users.push(user)

  return user
}

export async function updateUser(input: unknown): Promise<User> {
  const parsed = updateUserSchema.safeParse(input)
  if (!parsed.success) throw validationError(parsed.error)

  const index = users.findIndex((user) => user.id === parsed.data.id)
  if (index === -1) throw new AppError("NOT_FOUND", { message: "User tidak ditemukan." })

  const email = parsed.data.email.toLowerCase()
  ensureUniqueEmail(email, parsed.data.id)

  const user = users[index]
  Object.assign(user, parsed.data, { email })
  return user
}

export async function deleteUser(input: unknown): Promise<void> {
  const parsed = deleteUserSchema.safeParse(input)
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", { message: "ID user tidak valid." })
  const index = users.findIndex((user) => user.id === parsed.data.id)
  if (index === -1) throw new AppError("NOT_FOUND", { message: "User tidak ditemukan." })
  users.splice(index, 1)
}
