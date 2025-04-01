import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Clock, Star, BookOpen } from 'lucide-react';
import { Skill } from '../../types/skills';

type RecentSkillsGridProps = {
  userId: string | undefined;
  onSelectSkill: (skill: Skill) => void;
};

export function RecentSkillsGrid({ userId, onSelectSkill }: RecentSkillsGridProps) {
  const [recentSkills, setRecentSkills] = useState<Skill[]>([]);
  const [frequentSkills, setFrequentSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadSkills();
    }
  }, [userId]);

  async function loadSkills() {
    try {
      setLoading(true);
      setError(null);

      // Load recent skills (based on most recent skill logs)
      const { data: recentLogsData, error: recentError } = await supabase
        .from('skill_logs')
        .select(`
          skill_id,
          skills (
            id,
            name,
            description,
            category_id,
            verification_type,
            form_schema,
            skill_categories (
              name
            )
          )
        `)
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(4);

      if (recentError) throw recentError;

      // Load frequent skills (based on count of skill logs)
      const { data: frequentLogsData, error: frequentError } = await supabase
        .rpc('get_frequent_skills', { p_student_id: userId, p_limit: 4 });

      if (frequentError) throw frequentError;

      // Process recent skills
      const recentSkillsMap = new Map();
      recentLogsData?.forEach(log => {
        if (log.skills && !recentSkillsMap.has(log.skills.id)) {
          recentSkillsMap.set(log.skills.id, log.skills);
        }
      });
      
      setRecentSkills(Array.from(recentSkillsMap.values()).slice(0, 4));

      // Process frequent skills
      if (frequentLogsData) {
        const frequentSkillIds = frequentLogsData.map(item => item.skill_id);
        
        if (frequentSkillIds.length > 0) {
          const { data: skillsData, error: skillsError } = await supabase
            .from('skills')
            .select(`
              id,
              name,
              description,
              category_id,
              verification_type,
              form_schema,
              skill_categories (
                name
              )
            `)
            .in('id', frequentSkillIds);

          if (skillsError) throw skillsError;
          
          // Sort skills based on the order in frequentSkillIds
          const sortedSkills = frequentSkillIds
            .map(id => skillsData?.find(skill => skill.id === id))
            .filter(skill => skill !== undefined) as Skill[];
            
          setFrequentSkills(sortedSkills);
        }
      }
    } catch (err) {
      console.error('Error loading skills:', err);
      setError('Failed to load skills');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-pulse">
        <div className="bg-gray-100 rounded-lg p-4 h-40"></div>
        <div className="bg-gray-100 rounded-lg p-4 h-40"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
        {error}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
      {/* Recent Skills */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-indigo-50 px-4 py-3 border-b border-indigo-100">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-indigo-600 mr-2" />
            <h3 className="text-md font-medium text-indigo-900">Recent Skills</h3>
          </div>
        </div>
        <div className="p-4">
          {recentSkills.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {recentSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => onSelectSkill(skill)}
                  className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-left"
                >
                  <BookOpen className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{skill.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{skill.skill_categories.name}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-2">No recent skills found</p>
          )}
        </div>
      </div>

      {/* Frequent Skills */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
          <div className="flex items-center">
            <Star className="h-5 w-5 text-amber-600 mr-2" />
            <h3 className="text-md font-medium text-amber-900">Most Used Skills</h3>
          </div>
        </div>
        <div className="p-4">
          {frequentSkills.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {frequentSkills.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => onSelectSkill(skill)}
                  className="flex items-start p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors text-left"
                >
                  <BookOpen className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{skill.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">{skill.skill_categories.name}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-2">No frequent skills found</p>
          )}
        </div>
      </div>
    </div>
  );
}