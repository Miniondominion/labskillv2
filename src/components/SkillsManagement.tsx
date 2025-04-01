import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle, UserPlus, Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { FormPreview } from './FormPreview';
import { AddEditSkillForm } from './skills/AddEditSkillForm';
import { AddCategoryForm } from './skills/AddCategoryForm';
import { SkillsTable } from './skills/SkillsTable';
import { Skill, Category } from '../types/skills';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

export function SkillsManagementContent() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'instructor' | null>(null);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSkill, setPreviewSkill] = useState<Skill | null>(null);
  
  const [newSkill, setNewSkill] = useState({
    name: '',
    description: '',
    category_id: '',
    form_schema: {
      questions: []
    }
  });
  
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    subcategories: [] // Initialize empty subcategories array
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      if (!user) return;

      // Get user role first
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();

      setUserRole(profileData?.role || null);

      const [skillsData, categoriesData] = await Promise.all([
        supabase
          .from('skills')
          .select(`
            *,
            skill_categories (
              name
            ),
            skill_subcategories (
              name
            )
          `)
          .order('name'),
        supabase
          .from('skill_categories')
          .select(`
            *,
            skill_subcategories (
              id,
              name,
              description,
              category_id
            )
          `)
          .order('name')
      ]);

      if (skillsData.error) throw skillsData.error;
      if (categoriesData.error) throw categoriesData.error;

      // For instructors, only show template skills
      const filteredSkills = userRole === 'instructor' 
        ? skillsData.data?.filter(skill => skill.is_template) || []
        : skillsData.data || [];

      setSkills(filteredSkills);
      setCategories(categoriesData.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSkill(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      const { error } = await supabase
        .from('skills')
        .insert([{
          ...newSkill,
          is_template: true
        }]);

      if (error) throw error;

      setSuccess('Skill added successfully');
      setShowAddSkill(false);
      setNewSkill({
        name: '',
        description: '',
        category_id: '',
        form_schema: {
          questions: []
        }
      });
      await loadData();
    } catch (err) {
      console.error('Error adding skill:', err);
      setError('Failed to add skill');
    }
  }

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);

      // First insert the category
      const { data: categoryData, error: categoryError } = await supabase
        .from('skill_categories')
        .insert([{
          name: newCategory.name,
          description: newCategory.description
        }])
        .select()
        .single();

      if (categoryError) throw categoryError;

      // Then insert subcategories if any
      if (newCategory.subcategories.length > 0) {
        const subcategories = newCategory.subcategories.map(sub => ({
          ...sub,
          category_id: categoryData.id
        }));

        const { error: subcategoriesError } = await supabase
          .from('skill_subcategories')
          .insert(subcategories);

        if (subcategoriesError) throw subcategoriesError;
      }

      setSuccess('Category added successfully');
      setShowAddCategory(false);
      setNewCategory({
        name: '',
        description: '',
        subcategories: []
      });
      await loadData();
    } catch (err) {
      console.error('Error adding category:', err);
      setError('Failed to add category');
    }
  }

  async function handleUpdateSkill(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSkill) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('skills')
        .update({
          name: editingSkill.name,
          description: editingSkill.description,
          category_id: editingSkill.category_id,
          form_schema: editingSkill.form_schema
        })
        .eq('id', editingSkill.id);

      if (error) throw error;

      setSuccess('Skill updated successfully');
      setEditingSkill(null);
      await loadData();
    } catch (err) {
      console.error('Error updating skill:', err);
      setError('Failed to update skill');
    }
  }

  async function handleDeleteSkill(skillId: string) {
    if (!window.confirm('Are you sure you want to delete this skill?')) return;

    try {
      setError(null);
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId);

      if (error) throw error;

      setSuccess('Skill deleted successfully');
      await loadData();
    } catch (err) {
      console.error('Error deleting skill:', err);
      setError('Failed to delete skill');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Skills Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            {userRole === 'admin' 
              ? 'Manage skill templates and categories'
              : 'View and assign skill templates to students'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          {userRole === 'admin' && (
            <>
              <button
                onClick={() => setShowAddCategory(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </button>
              <button
                onClick={() => setShowAddSkill(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Template
              </button>
            </>
          )}
          {userRole === 'instructor' && (
            <Link
              to={`/skills/${skills[0]?.id}/assign`}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Skills
            </Link>
          )}
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Forms */}
      {showAddCategory && userRole === 'admin' && (
        <AddCategoryForm
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          onSubmit={handleAddCategory}
          onClose={() => setShowAddCategory(false)}
        />
      )}

      {(showAddSkill || editingSkill) && userRole === 'admin' && (
        <AddEditSkillForm
          editingSkill={editingSkill}
          categories={categories}
          onSubmit={editingSkill ? handleUpdateSkill : handleAddSkill}
          onClose={() => {
            setShowAddSkill(false);
            setEditingSkill(null);
          }}
          skill={editingSkill || newSkill}
          onSkillChange={editingSkill ? setEditingSkill : setNewSkill}
          onAddCategory={() => setShowAddCategory(true)}
        />
      )}

      {showPreview && previewSkill && (
        <FormPreview
          questions={previewSkill.form_schema?.questions || []}
          onClose={() => {
            setShowPreview(false);
            setPreviewSkill(null);
          }}
        />
      )}

      {/* Skills Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">
            {userRole === 'admin' ? 'Skill Templates' : 'Available Skills'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <SkillsTable
            skills={skills}
            instructors={[]}
            onEdit={userRole === 'admin' ? setEditingSkill : undefined}
            onDelete={userRole === 'admin' ? handleDeleteSkill : undefined}
            onPreview={(skill) => {
              setPreviewSkill(skill);
              setShowPreview(true);
            }}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}