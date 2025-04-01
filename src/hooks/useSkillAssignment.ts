import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { retryOperation } from '../lib/utils';
import { Student, Skill, Class } from '../types/skills';
import debounce from 'lodash/debounce';

type AssignmentStatus = {
  status: 'pending' | 'completed' | 'expired';
  required_submissions: number;
  completed_submissions: number;
  due_date?: string | null;
};

type StudentAssignment = {
  requiredSubmissions: number;
  dueDate: string;
};

export function useSkillAssignment(userId: string | undefined, initialSkillId?: string) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [assignedStudents, setAssignedStudents] = useState<Student[]>([]);
  const [unassignedStudents, setUnassignedStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentAssignments, setStudentAssignments] = useState<{[key: string]: StudentAssignment}>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    loadInitialData();
  }, [userId, initialSkillId]);

  useEffect(() => {
    if (selectedSkill) {
      loadStudents();
    }
  }, [selectedSkill]);

  async function loadInitialData() {
    try {
      setLoading(true);
      setError(null);

      const [skillsResponse, classesResponse] = await Promise.all([
        retryOperation(() =>
          supabase
            .from('skills')
            .select(`
              *,
              skill_categories (
                name
              )
            `)
            .eq('is_template', false)
            .order('name')
        ),
        retryOperation(() =>
          supabase
            .from('classes')
            .select('id, name')
            .eq('instructor_id', userId)
            .eq('archived', false)
            .order('name')
        )
      ]);

      if (skillsResponse.error) throw skillsResponse.error;
      if (classesResponse.error) throw classesResponse.error;

      setSkills(skillsResponse.data || []);
      setClasses(classesResponse.data || []);

      if (initialSkillId) {
        const skill = skillsResponse.data?.find(s => s.id === initialSkillId);
        if (skill) {
          setSelectedSkill(skill);
        }
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function loadStudents(resetPage = true) {
    try {
      if (!selectedSkill || !userId) return;

      const currentPage = resetPage ? 1 : page;
      const start = (currentPage - 1) * ITEMS_PER_PAGE;

      let query = supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email
        `)
        .eq('role', 'student')
        .eq('affiliated_instructor', userId)
        .range(start, start + ITEMS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.ilike('full_name', `%${searchTerm}%`);
      }

      const [studentsResponse, assignmentsResponse] = await Promise.all([
        retryOperation(() => query),
        retryOperation(() =>
          supabase
            .from('skill_assignments')
            .select('*')
            .eq('skill_id', selectedSkill.id)
        )
      ]);

      if (studentsResponse.error) throw studentsResponse.error;
      if (assignmentsResponse.error) throw assignmentsResponse.error;

      const assignmentsMap = new Map(assignmentsResponse.data?.map(a => [a.student_id, a]));
      const assigned: Student[] = [];
      const unassigned: Student[] = [];

      studentsResponse.data?.forEach(student => {
        const assignment = assignmentsMap.get(student.id);
        const processedStudent = {
          ...student,
          class_id: null,
          assignment: assignment ? {
            status: assignment.status,
            required_submissions: assignment.required_submissions,
            completed_submissions: 0,
            due_date: assignment.due_date
          } : undefined
        };

        if (assignment) {
          assigned.push(processedStudent);
        } else {
          unassigned.push(processedStudent);
        }
      });

      setAssignedStudents(resetPage ? assigned : [...assignedStudents, ...assigned]);
      setUnassignedStudents(resetPage ? unassigned : [...unassignedStudents, ...unassigned]);
      setHasMore((assigned.length + unassigned.length) === ITEMS_PER_PAGE);
      if (!resetPage) setPage(currentPage);
    } catch (err) {
      console.error('Error loading students:', err);
      setError('Failed to load students');
    }
  }

  const debouncedSearch = debounce((term: string) => {
    setSearchTerm(term);
    loadStudents();
  }, 300);

  return {
    // State
    skills,
    selectedSkill,
    assignedStudents,
    unassignedStudents,
    classes,
    selectedStudents,
    studentAssignments,
    loading,
    submitting,
    error,
    success,
    hasMore,
    page,

    // Setters
    setSelectedSkill,
    setSelectedStudents,
    setStudentAssignments,
    setError,
    setSuccess,
    setSubmitting,
    setPage,

    // Actions
    loadStudents,
    debouncedSearch,
  };
}