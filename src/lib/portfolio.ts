import { supabase } from './supabase';

type DataSource = 'skills' | 'clinical' | 'user';
type AggregationType = 'count' | 'sum' | 'average' | 'latest';

type FilterCondition = {
  field: string;
  operator: string;
  value: string;
};

type FieldConfig = {
  dataSource: DataSource;
  dataField: string;
  aggregation: AggregationType;
  filterConditions: FilterCondition[];
};

export async function getPortfolioData(studentId: string, config: FieldConfig) {
  try {
    let query;

    switch (config.dataSource) {
      case 'skills':
        query = supabase
          .from('skill_submissions')
          .select(`
            skill_id,
            skill_name,
            skill_category_name,
            submitted_at,
            status,
            responses
          `)
          .eq('student_id', studentId);
        break;

      case 'clinical':
        query = supabase
          .from('form_submissions')
          .select(`
            form_id,
            clinical_type_name,
            form_name,
            submitted_at,
            form_data
          `)
          .eq('student_id', studentId);
        break;

      case 'user':
        // For user data, we just need to fetch the profile
        const { data: userData, error: userError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', studentId)
          .single();
        
        if (userError) throw userError;
        
        // Return the requested field directly
        return userData[config.dataField];

      default:
        throw new Error('Invalid data source');
    }

    // Apply filter conditions
    config.filterConditions.forEach(condition => {
      switch (condition.operator) {
        case 'equals':
          query = query.eq(condition.field, condition.value);
          break;
        case 'not_equals':
          query = query.neq(condition.field, condition.value);
          break;
        case 'greater_than':
          query = query.gt(condition.field, condition.value);
          break;
        case 'less_than':
          query = query.lt(condition.field, condition.value);
          break;
        case 'contains':
          query = query.ilike(condition.field, `%${condition.value}%`);
          break;
      }
    });

    const { data, error } = await query;
    if (error) throw error;

    // Apply aggregation
    switch (config.aggregation) {
      case 'count':
        return data.length;

      case 'sum':
        return data.reduce((sum, item) => {
          const value = config.dataSource === 'skills'
            ? item.responses[config.dataField]
            : item.form_data[config.dataField];
          return sum + (parseFloat(value) || 0);
        }, 0);

      case 'average':
        const sum = data.reduce((acc, item) => {
          const value = config.dataSource === 'skills'
            ? item.responses[config.dataField]
            : item.form_data[config.dataField];
          return acc + (parseFloat(value) || 0);
        }, 0);
        return data.length ? sum / data.length : 0;

      case 'latest':
        if (!data.length) return null;
        const latest = data.sort((a, b) => 
          new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
        )[0];
        return config.dataSource === 'skills'
          ? latest.responses[config.dataField]
          : latest.form_data[config.dataField];

      default:
        throw new Error('Invalid aggregation type');
    }
  } catch (err) {
    console.error('Error fetching portfolio data:', err);
    throw err;
  }
}