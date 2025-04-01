// Generated types from Supabase schema
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      skill_logs: {
        Row: {
          id: string
          student_id: string
          skill_id: string
          class_id: string | null
          attempt_number: number
          notes: string | null
          media_urls: string[] | null
          verified_by: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
          responses: Json | null
          evaluator_name: string
          evaluator_type: 'peer' | 'instructor'
          instructor_signature: string | null
          status: 'submitted' | 'rejected'
          evaluated_student_id: string | null
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Row, 'id'>>
      }
      skill_assignments: {
        Row: {
          id: string
          skill_id: string
          student_id: string
          required_submissions: number
          due_date: string | null
          completed_submissions: number
          status: 'pending' | 'completed' | 'expired'
          created_at: string
          updated_at: string
          class_id: string | null
        }
        Insert: Omit<Row, 'id' | 'created_at' | 'updated_at' | 'completed_submissions'>
        Update: Partial<Omit<Row, 'id'>>
      }
      profiles: {
        Row: {
          id: string
          role: 'student' | 'instructor' | 'admin'
          full_name: string
          email: string
          created_at: string
          updated_at: string
          affiliated_instructor: string | null
          instructor_code: string | null
        }
        Insert: Omit<Row, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Row, 'id'>>
      }
    }
    Functions: {
      get_student_classmates: {
        Args: {
          p_student_id: string
        }
        Returns: {
          student_id: string
          full_name: string
          email: string
          class_id: string
          class_name: string
        }[]
      }
    }
    Enums: {
      user_role: 'student' | 'instructor' | 'admin'
      skill_status: 'pending' | 'verified' | 'rejected'
      skill_assignment_status: 'pending' | 'completed' | 'expired'
      skill_log_status: 'submitted' | 'rejected'
    }
  }
}

// Type-safe query helpers
export type TableName = keyof Database['public']['Tables']
export type Row<T extends TableName> = Database['public']['Tables'][T]['Row']
export type Insert<T extends TableName> = Database['public']['Tables'][T]['Insert']
export type Update<T extends TableName> = Database['public']['Tables'][T]['Update']

// Type-safe function helpers
export type FunctionName = keyof Database['public']['Functions']
export type FunctionArgs<T extends FunctionName> = Database['public']['Functions'][T]['Args']
export type FunctionReturns<T extends FunctionName> = Database['public']['Functions'][T]['Returns']