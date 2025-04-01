import { Database } from '../lib/database.types';
import { UserRole, SkillStatus, AssignmentStatus, LogStatus, FieldType, VerificationType } from './enums';

// User model types
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

// Skill model types
export type Skill = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  subcategory_id?: string;
  verification_type: VerificationType;
  form_schema: {
    questions: Question[];
  } | null;
  created_at: string;
  is_template: boolean;
  template_id?: string;
  skill_categories: {
    name: string;
  };
  skill_subcategories?: {
    name: string;
  };
};

export type Question = {
  id: string;
  question_text: string;
  response_type: FieldType;
  is_required: boolean;
  order_index: number;
  options?: string[];
};

// Assignment model types
export type SkillAssignment = {
  id: string;
  skill_id: string;
  student_id: string;
  required_submissions: number;
  due_date: string | null;
  completed_submissions: number;
  status: AssignmentStatus;
  created_at: string;
  updated_at: string;
  class_id: string | null;
};

// Log model types
export type SkillLog = {
  id: string;
  student_id: string;
  skill_id: string;
  class_id: string | null;
  attempt_number: number;
  notes: string | null;
  media_urls: string[] | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  responses: Record<string, any> | null;
  evaluator_name: string;
  evaluator_type: VerificationType;
  instructor_signature: string | null;
  status: LogStatus;
  evaluated_student_id: string | null;
};

// Class model types
export type Class = {
  id: string;
  name: string;
  description: string | null;
  instructor_id: string;
  start_date: string;
  end_date: string;
  created_at: string;
  updated_at: string;
  archived: boolean;
};

export type ClassEnrollment = {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: string;
};

// Clinical model types
export type ClinicalType = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type ClinicalForm = {
  id: string;
  clinical_type_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type ClinicalFormField = {
  id: string;
  form_id: string;
  field_name: string;
  field_type: FieldType;
  field_label: string;
  field_options: string[] | null;
  required: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
};

export type ClinicalEntry = {
  id: string;
  student_id: string;
  clinical_type_id: string;
  form_id: string;
  shift_start: string;
  shift_end: string;
  preceptor_name: string;
  preceptor_credentials?: string;
  preceptor_email?: string;
  form_data: Record<string, any>;
  submitted_at: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
};