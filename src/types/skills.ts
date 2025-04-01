export type Question = {
  id: string;
  question_text: string;
  response_type: 'checkbox' | 'text' | 'number' | 'multiple_choice' | 'select_multiple';
  is_required: boolean;
  order_index: number;
  options?: string[];
};

export type Category = {
  id: string;
  name: string;
  description: string;
  subcategories?: Subcategory[];
};

export type Subcategory = {
  id: string;
  name: string;
  description: string;
  category_id: string;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  category_id: string;
  subcategory_id?: string;
  verification_type: 'peer' | 'instructor';
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

export type Instructor = {
  id: string;
  full_name: string;
  email: string;
};