import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, AlertCircle, ArrowLeft, Info } from 'lucide-react';

type SignupData = {
  email: string;
  password: string;
  fullName: string;
};

export function InstructorSelection() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [instructorCode, setInstructorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const signupDataStr = sessionStorage.getItem('signupData');
      if (!signupDataStr) {
        throw new Error('Signup data not found');
      }

      const signupData: SignupData = JSON.parse(signupDataStr);
      setLoading(true);

      // First create the user account without instructor affiliation
      const { user: newUser } = await signUp(
        signupData.email,
        signupData.password,
        signupData.fullName,
        null // No instructor affiliation initially
      );

      if (!newUser) {
        throw new Error('Failed to create user account');
      }

      // If instructor code is provided, verify and create affiliation request
      if (instructorCode.trim()) {
        // Get instructor by code
        const { data: instructor, error: instructorError } = await supabase
          .from('profiles')
          .select('id')
          .eq('instructor_code', instructorCode.trim())
          .eq('role', 'instructor')
          .single();

        if (instructorError || !instructor) {
          throw new Error('Invalid instructor code');
        }

        // Create affiliation request
        const { error: requestError } = await supabase
          .from('affiliation_requests')
          .insert([{
            student_id: newUser.id,
            instructor_id: instructor.id,
            status: 'pending'
          }]);

        if (requestError) {
          if (requestError.message.includes('duplicate')) {
            throw new Error('You already have a pending affiliation request');
          }
          throw requestError;
        }
      }

      // Clear signup data
      sessionStorage.removeItem('signupData');
      
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Users className="h-12 w-12 text-indigo-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Enter Instructor Code
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your instructor's code or skip if you don't have one
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="instructorCode" className="block text-sm font-medium text-gray-700">
                Instructor Code
              </label>
              <div className="mt-1">
                <input
                  id="instructorCode"
                  type="text"
                  value={instructorCode}
                  onChange={(e) => setInstructorCode(e.target.value)}
                  placeholder="XX-XXXX"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <div className="mt-2 flex items-center text-sm text-gray-500">
                  <Info className="h-4 w-4 mr-1 text-indigo-500" />
                  <span>Format: XX-XXXX (Case Sensitive)</span>
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Leave empty if you don't have an instructor code
              </p>
              {instructorCode && (
                <p className="mt-2 text-sm text-yellow-600">
                  Note: Your instructor will need to approve your affiliation request
                </p>
              )}
            </div>

            <div className="flex flex-col space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Complete Signup'}
              </button>

              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}