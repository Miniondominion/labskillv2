import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { retryOperation } from '../lib/utils';

type ClinicalType = {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
};

type ClinicalForm = {
  id: string;
  name: string;
  description: string | null;
  clinical_type_id: string;
};

type FormField = {
  id: string;
  field_name: string;
  field_type: 'text' | 'number' | 'date' | 'time' | 'select' | 'multiselect' | 'checkbox';
  field_label: string;
  field_options: string[] | null;
  required: boolean;
  order_index: number;
  parent_field_id?: string | null;
};

type ClinicalEntry = {
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
};

type FormAssignment = {
  id: string;
  form_id: string;
  instructor_id: string;
  student_id: string | null;
  status: 'active' | 'inactive';
};

type ClinicalContextType = {
  clinicalTypes: ClinicalType[];
  forms: ClinicalForm[];
  formFields: Record<string, FormField[]>;
  entries: ClinicalEntry[];
  assignments: FormAssignment[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  addClinicalType: (name: string, description?: string) => Promise<void>;
  updateClinicalType: (id: string, updates: Partial<ClinicalType>) => Promise<void>;
  addFormField: (formId: string, field: Omit<FormField, 'id'>) => Promise<void>;
  updateFormField: (fieldId: string, updates: Partial<FormField>) => Promise<void>;
  deleteFormField: (fieldId: string) => Promise<void>;
  submitEntry: (entry: Omit<ClinicalEntry, 'id' | 'submitted_at'>) => Promise<void>;
  assignForm: (formId: string, instructorId: string, studentId?: string) => Promise<void>;
};

const ClinicalContext = createContext<ClinicalContextType | undefined>(undefined);

export function ClinicalProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { error, setError, handleApiError, handleDatabaseError, clearError } = useErrorHandler();
  const [clinicalTypes, setClinicalTypes] = useState<ClinicalType[]>([]);
  const [forms, setForms] = useState<ClinicalForm[]>([]);
  const [formFields, setFormFields] = useState<Record<string, FormField[]>>({});
  const [entries, setEntries] = useState<ClinicalEntry[]>([]);
  const [assignments, setAssignments] = useState<FormAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      refreshData();
    }
  }, [user]);

  const refreshData = async () => {
    try {
      setLoading(true);
      clearError();

      // Load clinical types with retry
      const { data: typesData, error: typesError } = await retryOperation(() =>
        supabase
          .from('clinical_types')
          .select('*')
          .order('name')
      );

      if (typesError) throw typesError;
      setClinicalTypes(typesData || []);

      // Load forms with retry
      const { data: formsData, error: formsError } = await retryOperation(() =>
        supabase
          .from('clinical_forms')
          .select('*')
      );

      if (formsError) throw formsError;
      setForms(formsData || []);

      // Load form assignments
      const { data: assignmentsData, error: assignmentsError } = await retryOperation(() =>
        supabase
          .from('clinical_form_assignments')
          .select('*')
          .eq('status', 'active')
      );

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

      // Load form fields for each form with retry
      const fieldsMap: Record<string, FormField[]> = {};
      for (const form of formsData || []) {
        const { data: fieldsData, error: fieldsError } = await retryOperation(() =>
          supabase
            .from('clinical_form_fields')
            .select('*')
            .eq('form_id', form.id)
            .order('order_index')
        );

        if (fieldsError) throw fieldsError;
        fieldsMap[form.id] = fieldsData || [];
      }
      setFormFields(fieldsMap);

      // Load entries with retry
      const { data: entriesData, error: entriesError } = await retryOperation(() =>
        supabase
          .from('clinical_entries')
          .select('*')
          .order('submitted_at', { ascending: false })
      );

      if (entriesError) throw entriesError;
      setEntries(entriesData || []);
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const addClinicalType = async (name: string, description?: string) => {
    try {
      clearError();

      // First create the clinical type
      const { data: typeData, error: typeError } = await retryOperation(() =>
        supabase
          .from('clinical_types')
          .insert([{ name, description }])
          .select()
          .single()
      );

      if (typeError) throw typeError;

      // Then automatically create a form for this type
      const { error: formError } = await retryOperation(() =>
        supabase
          .from('clinical_forms')
          .insert([{
            clinical_type_id: typeData.id,
            name: `${name} Form`,
            description: `Documentation form for ${name}`
          }])
      );

      if (formError) throw formError;

      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  const updateClinicalType = async (id: string, updates: Partial<ClinicalType>) => {
    try {
      clearError();
      const { error: updateError } = await retryOperation(() =>
        supabase
          .from('clinical_types')
          .update(updates)
          .eq('id', id)
      );

      if (updateError) throw updateError;
      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  const addFormField = async (formId: string, field: Omit<FormField, 'id'>) => {
    try {
      clearError();

      // Validate field name (no spaces, special characters)
      const fieldNameRegex = /^[a-zA-Z0-9_]+$/;
      if (!fieldNameRegex.test(field.field_name)) {
        throw new Error('Field name can only contain letters, numbers, and underscores');
      }

      // Validate options for select/multiselect
      if (['select', 'multiselect'].includes(field.field_type) && (!field.field_options || field.field_options.length === 0)) {
        throw new Error('At least one option is required for select fields');
      }

      const { error: insertError } = await retryOperation(() =>
        supabase
          .from('clinical_form_fields')
          .insert([{ ...field, form_id: formId }])
      );

      if (insertError) throw insertError;
      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  const updateFormField = async (fieldId: string, updates: Partial<FormField>) => {
    try {
      clearError();
      const { error: updateError } = await retryOperation(() =>
        supabase
          .from('clinical_form_fields')
          .update(updates)
          .eq('id', fieldId)
      );

      if (updateError) throw updateError;
      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  const deleteFormField = async (fieldId: string) => {
    try {
      clearError();
      const { error: deleteError } = await retryOperation(() =>
        supabase
          .from('clinical_form_fields')
          .delete()
          .eq('id', fieldId)
      );

      if (deleteError) throw deleteError;
      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  const submitEntry = async (entry: Omit<ClinicalEntry, 'id' | 'submitted_at'>) => {
    try {
      clearError();

      // Check if the form is assigned to the student
      const isAssigned = assignments.some(assignment => 
        assignment.form_id === entry.form_id && 
        (assignment.student_id === entry.student_id || assignment.student_id === null)
      );

      if (!isAssigned) {
        throw new Error('This form has not been assigned to you');
      }

      const { error: submitError } = await retryOperation(() =>
        supabase
          .from('clinical_entries')
          .insert([entry])
      );

      if (submitError) throw submitError;
      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  const assignForm = async (formId: string, instructorId: string, studentId?: string) => {
    try {
      clearError();
      const { error: assignError } = await retryOperation(() =>
        supabase
          .from('clinical_form_assignments')
          .insert([{
            form_id: formId,
            instructor_id: instructorId,
            student_id: studentId || null,
            status: 'active'
          }])
      );

      if (assignError) throw assignError;
      await refreshData();
    } catch (err) {
      handleDatabaseError(err);
      throw err;
    }
  };

  return (
    <ClinicalContext.Provider value={{
      clinicalTypes,
      forms,
      formFields,
      entries,
      assignments,
      loading,
      error,
      refreshData,
      addClinicalType,
      updateClinicalType,
      addFormField,
      updateFormField,
      deleteFormField,
      submitEntry,
      assignForm
    }}>
      {children}
    </ClinicalContext.Provider>
  );
}

export function useClinical() {
  const context = useContext(ClinicalContext);
  if (context === undefined) {
    throw new Error('useClinical must be used within a ClinicalProvider');
  }
  return context;
}