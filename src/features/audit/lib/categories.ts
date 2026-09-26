/**
 * Satu-satunya sumber kebenaran untuk nama `action` audit. Nilai string tidak
 * boleh diubah: log lama dan query filter `action` memakai nilai persis ini.
 */
export const AUDIT_ACTIONS = {
  // auth
  LOGIN_SUCCESS: "login_success",
  LOGIN_REJECTED: "login_rejected",
  REGISTER_SUCCESS: "register_success",
  REGISTER_REJECTED: "register_rejected",
  PASSWORD_RESET_REQUESTED: "password_reset_requested",
  PASSWORD_RESET_REQUEST_REJECTED: "password_reset_request_rejected",
  PASSWORD_RESET_COMPLETED: "password_reset_completed",
  PASSWORD_RESET_REJECTED: "password_reset_rejected",
  MFA_VERIFY_SUCCESS: "mfa_verify_success",
  MFA_VERIFY_REJECTED: "mfa_verify_rejected",
  MFA_BACKUP_VERIFY_SUCCESS: "mfa_backup_verify_success",
  MFA_BACKUP_VERIFY_REJECTED: "mfa_backup_verify_rejected",
  MFA_CODE_RESENT: "mfa_code_resent",
  MFA_RESEND_REJECTED: "mfa_resend_rejected",

  // authz
  USER_CREATE_REJECTED: "user_create_rejected",
  USER_UPDATE_REJECTED: "user_update_rejected",
  USER_DELETE_REJECTED: "user_delete_rejected",

  // data
  CONTACT_MESSAGE_RECEIVED: "contact_message_received",
  USER_CREATED: "user_created",
  USER_UPDATED: "user_updated",
  USER_DELETED: "user_deleted",
  DATA_EMPLOYEE_VIEW: "data.employee.view",

  // config
  SETTINGS_UPDATE: "settings_update",
  APPEARANCE_UPDATE: "appearance_update",

  // security
  RATE_LIMIT_HIT: "rate_limit_hit",

  // log
  LOG_DISPOSAL_SCHEDULED: "log.disposal.scheduled",
  LOG_DISPOSAL_APPROVED: "log.disposal.approved",
  LOG_DISPOSAL_REJECTED: "log.disposal.rejected",
  LOG_DISPOSAL_COMPLETED: "log.disposal.completed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
