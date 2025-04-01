// User roles
export const UserRole = {
  STUDENT: 'student',
  INSTRUCTOR: 'instructor',
  ADMIN: 'admin'
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

// Skill statuses
export const SkillStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
} as const;
export type SkillStatus = typeof SkillStatus[keyof typeof SkillStatus];

// Assignment statuses
export const AssignmentStatus = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  EXPIRED: 'expired'
} as const;
export type AssignmentStatus = typeof AssignmentStatus[keyof typeof AssignmentStatus];

// Log statuses
export const LogStatus = {
  SUBMITTED: 'submitted',
  REJECTED: 'rejected'
} as const;
export type LogStatus = typeof LogStatus[keyof typeof LogStatus];

// Form field types
export const FieldType = {
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  TIME: 'time',
  SELECT: 'select',
  MULTISELECT: 'multiselect',
  CHECKBOX: 'checkbox'
} as const;
export type FieldType = typeof FieldType[keyof typeof FieldType];

// Verification types
export const VerificationType = {
  PEER: 'peer',
  INSTRUCTOR: 'instructor'
} as const;
export type VerificationType = typeof VerificationType[keyof typeof VerificationType];

// Request statuses
export const RequestStatus = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;
export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];