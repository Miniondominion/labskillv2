import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface ReportConfig {
  dataPoints?: string[];
  dateRange?: string;
  cohort?: string;
  submissionTypes?: string[];
  evaluationCriteria?: string[];
  questions?: string[];
  weights?: Record<string, number>;
  countIfConditions?: QueryCondition[];
  selectedFields?: string[];
  formSpecificCount?: string | null;
}

interface QueryCondition {
  field: string;
  operator: string;
  value: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Invalid authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    const { config } = await req.json() as { config: ReportConfig };

    // Ensure config has default values
    const safeConfig = {
      dataPoints: config.dataPoints || [],
      selectedFields: config.selectedFields || [],
      countIfConditions: config.countIfConditions || [],
      formSpecificCount: config.formSpecificCount || null
    };

    // Get all students affiliated with the instructor
    const { data: studentsData, error: studentsError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('affiliated_instructor', user.id)
      .eq('role', 'student');

    if (studentsError) throw studentsError;
    const studentIds = studentsData.map(s => s.id);

    let results = [];
    let submissionCounts: Record<string, number> = {};
    let conditionalCounts: Record<string, number> = {};

    // Fetch skill logs if needed
    if (safeConfig.dataPoints.includes('skills')) {
      const { data: skillLogs, error: skillLogsError } = await supabase
        .from('skill_submissions')
        .select(`
          id,
          student:profiles!skill_submissions_student_id_fkey (
            id,
            full_name,
            email
          ),
          skill_name,
          skill_category_name,
          submitted_at,
          evaluator_name,
          evaluator_type,
          status,
          responses
        `)
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false });

      if (skillLogsError) throw skillLogsError;
      
      if (skillLogs) {
        results.push(...skillLogs.map(log => ({
          id: log.id,
          type: 'skill',
          date: log.submitted_at,
          title: log.skill_name,
          category: log.skill_category_name,
          student: log.student,
          evaluator_name: log.evaluator_name,
          evaluator_type: log.evaluator_type,
          status: log.status,
          responses: log.responses
        })));
      }
    }

    // Fetch clinical entries if needed
    if (safeConfig.dataPoints.includes('clinical')) {
      const { data: clinicalEntries, error: clinicalError } = await supabase
        .from('form_submissions')
        .select(`
          id,
          student:profiles!form_submissions_student_id_fkey (
            id,
            full_name,
            email
          ),
          clinical_type_name,
          form_name,
          submitted_at,
          location,
          department,
          preceptor_name,
          preceptor_credentials,
          preceptor_email,
          form_data
        `)
        .in('student_id', studentIds)
        .order('submitted_at', { ascending: false });

      if (clinicalError) throw clinicalError;
      
      if (clinicalEntries) {
        results.push(...clinicalEntries.map(entry => ({
          id: entry.id,
          type: 'clinical',
          date: entry.submitted_at,
          title: entry.form_name,
          category: entry.clinical_type_name,
          student: entry.student,
          location: entry.location,
          department: entry.department,
          preceptor_name: entry.preceptor_name,
          preceptor_credentials: entry.preceptor_credentials,
          preceptor_email: entry.preceptor_email,
          form_data: entry.form_data
        })));
      }
    }

    // Apply count if conditions first
    if (safeConfig.countIfConditions?.length > 0) {
      console.log('Processing conditions:', safeConfig.countIfConditions);
      
      for (const condition of safeConfig.countIfConditions) {
        console.log('Processing condition:', condition);
        
        conditionalCounts[condition.field] = results.filter(result => {
          let value;
          
          // Handle nested form_data and responses
          if (result.form_data && result.form_data[condition.field] !== undefined) {
            value = result.form_data[condition.field];
          } else if (result.responses && result.responses[condition.field] !== undefined) {
            value = result.responses[condition.field];
          } else {
            value = result[condition.field];
          }

          console.log('Comparing values:', { value, operator: condition.operator, compareValue: condition.value });

          // Convert value to number for numeric comparisons
          const numericValue = condition.operator.includes('than') ? parseFloat(value) : value;
          const compareValue = condition.operator.includes('than') ? parseFloat(condition.value) : condition.value;

          switch (condition.operator) {
            case 'equals':
              return value === compareValue;
            case 'not_equals':
              return value !== compareValue;
            case 'greater_than':
              return numericValue > compareValue;
            case 'less_than':
              return numericValue < compareValue;
            case 'greater_equal':
              return numericValue >= compareValue;
            case 'less_equal':
              return numericValue <= compareValue;
            case 'contains':
              return String(value).toLowerCase().includes(String(compareValue).toLowerCase());
            case 'not_contains':
              return !String(value).toLowerCase().includes(String(compareValue).toLowerCase());
            case 'contains_all':
              const requiredValues = String(compareValue).split(',').map(v => v.trim().toLowerCase());
              const actualValues = Array.isArray(value) 
                ? value.map(v => String(v).toLowerCase())
                : String(value).toLowerCase().split(',').map(v => v.trim());
              return requiredValues.every(v => actualValues.includes(v));
            default:
              return true;
          }
        }).length;

        console.log('Condition count:', conditionalCounts[condition.field]);
      }

      // Filter results based on conditions
      results = results.filter(result => {
        return safeConfig.countIfConditions!.every(condition => {
          let value;
          
          if (result.form_data && result.form_data[condition.field] !== undefined) {
            value = result.form_data[condition.field];
          } else if (result.responses && result.responses[condition.field] !== undefined) {
            value = result.responses[condition.field];
          } else {
            value = result[condition.field];
          }

          const numericValue = condition.operator.includes('than') ? parseFloat(value) : value;
          const compareValue = condition.operator.includes('than') ? parseFloat(condition.value) : condition.value;

          switch (condition.operator) {
            case 'equals':
              return value === compareValue;
            case 'not_equals':
              return value !== compareValue;
            case 'greater_than':
              return numericValue > compareValue;
            case 'less_than':
              return numericValue < compareValue;
            case 'greater_equal':
              return numericValue >= compareValue;
            case 'less_equal':
              return numericValue <= compareValue;
            case 'contains':
              return String(value).toLowerCase().includes(String(compareValue).toLowerCase());
            case 'not_contains':
              return !String(value).toLowerCase().includes(String(compareValue).toLowerCase());
            case 'contains_all':
              const requiredValues = String(compareValue).split(',').map(v => v.trim().toLowerCase());
              const actualValues = Array.isArray(value) 
                ? value.map(v => String(v).toLowerCase())
                : String(value).toLowerCase().split(',').map(v => v.trim());
              return requiredValues.every(v => actualValues.includes(v));
            default:
              return true;
          }
        });
      });
    }

    // Calculate submission counts if requested
    if (safeConfig.selectedFields.includes('submission_count')) {
      for (const result of results) {
        const studentId = result.student?.id;
        if (studentId) {
          submissionCounts[studentId] = (submissionCounts[studentId] || 0) + 1;
        }
      }

      // Add submission counts to results
      results = results.map(result => ({
        ...result,
        submission_count: submissionCounts[result.student?.id] || 0
      }));
    }

    console.log('Final results:', {
      resultCount: results.length,
      submissionCounts,
      conditionalCounts
    });

    return new Response(
      JSON.stringify({
        results,
        metrics: {
          submissionCounts,
          totalSubmissions: Object.values(submissionCounts).reduce((a, b) => a + b, 0),
          averageSubmissions: Object.values(submissionCounts).length > 0
            ? Object.values(submissionCounts).reduce((a, b) => a + b, 0) / Object.values(submissionCounts).length
            : 0,
          formSpecificCount: safeConfig.formSpecificCount || null,
          conditionalCounts
        }
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    );
  }
});