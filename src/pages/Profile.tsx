import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, CheckCircle, Loader2, User, Mail, Lock, School, Users, Copy, Eye, EyeOff, Info, X } from 'lucide-react';

type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  role: 'student' | 'instructor' | 'admin';
  affiliated_instructor: string | null;
  instructor_code?: string | null;
};

type Instructor = {
  id: string;
  full_name: string;
  email: string;
};

type Class = {
  id: string;
  name: string;
  instructor: {
    full_name: string;
  };
};

export function Profile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [instructor, setInstructor] = useState<Instructor | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showInstructorCode, setShowInstructorCode] = useState(false);
  const [showAffiliationForm, setShowAffiliationForm] = useState(false);
  const [instructorCode, setInstructorCode] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      if (!user) return;

      // Load profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // If user is a student, check for pending affiliation request
      if (profileData.role === 'student') {
        const { data: requestData, error: requestError } = await supabase
          .from('affiliation_requests')
          .select('id')
          .eq('student_id', user.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (requestError) throw requestError;
        setHasPendingRequest(!!requestData);

        // If affiliated with an instructor, load instructor details
        if (profileData.affiliated_instructor) {
          const { data: instructorData, error: instructorError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .eq('id', profileData.affiliated_instructor)
            .single();

          if (instructorError) throw instructorError;
          setInstructor(instructorData);

          // Load enrolled classes
          const { data: classesData, error: classesError } = await supabase
            .from('class_enrollments')
            .select(`
              class:classes (
                id,
                name,
                instructor:profiles (
                  full_name
                )
              )
            `)
            .eq('student_id', user.id);

          if (classesError) throw classesError;
          setClasses(classesData?.map(enrollment => enrollment.class) || []);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !user) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const updates = {
        full_name: profile.full_name,
        email: profile.email
      };

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update auth email if changed
      if (profile.email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: profile.email
        });

        if (emailError) throw emailError;
      }

      setSuccess('Profile updated successfully');
      await loadProfile();
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (passwords.new !== passwords.confirm) {
        setError('New passwords do not match');
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwords.new
      });

      if (error) throw error;

      setSuccess('Password updated successfully');
      setShowPasswordForm(false);
      setPasswords({ current: '', new: '', confirm: '' });
    } catch (err) {
      console.error('Error updating password:', err);
      setError('Failed to update password');
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyInstructorCode() {
    if (!profile?.instructor_code) return;
    
    try {
      await navigator.clipboard.writeText(profile.instructor_code);
      setSuccess('Instructor code copied to clipboard');
    } catch (err) {
      console.error('Error copying instructor code:', err);
      setError('Failed to copy instructor code');
    }
  }

  async function handleRequestAffiliation(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmittingRequest(true);
      setError(null);
      setSuccess(null);

      // Check for existing pending request
      const { data: existingRequest, error: checkError } = await supabase
        .from('affiliation_requests')
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingRequest) {
        throw new Error('You already have a pending affiliation request');
      }

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
          student_id: user.id,
          instructor_id: instructor.id,
          status: 'pending'
        }]);

      if (requestError) {
        throw requestError;
      }

      setSuccess('Affiliation request submitted successfully');
      setShowAffiliationForm(false);
      setInstructorCode('');
      setHasPendingRequest(true);
      await loadProfile();
    } catch (err) {
      console.error('Error requesting affiliation:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit affiliation request');
    } finally {
      setSubmittingRequest(false);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your account settings and preferences
            </p>
          </div>
          {profile?.role === 'instructor' && profile.instructor_code && (
            <div className="mt-4 sm:mt-0 bg-indigo-50 rounded-lg p-3 border border-indigo-200">
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-indigo-900 mb-1">Instructor Code</h3>
                <div className="relative">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-grow">
                      <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-indigo-500" />
                      </div>
                      <input
                        type={showInstructorCode ? 'text' : 'password'}
                        value={profile.instructor_code}
                        readOnly
                        className="block w-full pl-7 pr-16 py-1 text-sm font-mono bg-white border border-indigo-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-1">
                        <button
                          type="button"
                          onClick={() => setShowInstructorCode(!showInstructorCode)}
                          className="p-1 text-indigo-600 hover:text-indigo-700 focus:outline-none"
                        >
                          {showInstructorCode ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyInstructorCode}
                          className="p-1 text-indigo-600 hover:text-indigo-700 focus:outline-none"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-indigo-700">
                    Share this code with your students
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

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

        {/* Profile Form */}
        {profile && (
          <form onSubmit={handleUpdateProfile} className="bg-white shadow rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="fullName"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      required
                    />
                  </div>
                </div>

                {profile.role === 'student' && instructor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Affiliated Instructor
                    </label>
                    <div className="mt-1 bg-gray-50 rounded-md p-4 border border-gray-200">
                      <div className="flex items-center">
                        <Users className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{instructor.full_name}</div>
                          <div className="text-sm text-gray-500">{instructor.email}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {profile.role === 'student' && !instructor && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Instructor Affiliation
                    </label>
                    <div className="mt-1 bg-gray-50 rounded-md p-4 border border-gray-200">
                      <div className="flex flex-col space-y-4">
                        <p className="text-sm text-gray-500">
                          {hasPendingRequest
                            ? 'You have a pending affiliation request.'
                            : 'You are not currently affiliated with an instructor. Request affiliation by entering an instructor code.'}
                        </p>
                        {!hasPendingRequest && (
                          <button
                            type="button"
                            onClick={() => setShowAffiliationForm(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Request Instructor Affiliation
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}

        {/* Password Update Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Lock className="h-5 w-5 mr-2" />
              Password
            </h3>
            {!showPasswordForm ? (
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Update your password to keep your account secure.</p>
                <button
                  onClick={() => setShowPasswordForm(true)}
                  className="mt-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="mt-5 space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwords.new}
                    onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                    minLength={6}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                    minLength={6}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordForm(false);
                      setPasswords({ current: '', new: '', confirm: '' });
                    }}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Updating...
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Enrolled Classes (for students) */}
        {profile?.role === 'student' && (
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <School className="h-5 w-5 mr-2" />
                Enrolled Classes
              </h3>
              <div className="mt-4">
                {classes.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {classes.map((cls) => (
                      <li key={cls.id} className="py-4">
                        <div className="flex justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{cls.name}</p>
                            <p className="text-sm text-gray-500">
                              Instructor: {cls.instructor.full_name}
                            </p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">You are not enrolled in any classes.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructor Affiliation Modal */}
        {showAffiliationForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Request Instructor Affiliation
                </h3>
                <button
                  onClick={() => setShowAffiliationForm(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleRequestAffiliation} className="space-y-4">
                <div>
                  <label htmlFor="instructorCode" className="block text-sm font-medium text-gray-700">
                    Instructor Code
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="instructorCode"
                      value={instructorCode}
                      onChange={(e) => setInstructorCode(e.target.value)}
                      placeholder="XX-XXXX"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      required
                    />
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <Info className="h-4 w-4 mr-1 text-indigo-500" />
                      <span>Format: XX-XXXX (Case Sensitive)</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAffiliationForm(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingRequest}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {submittingRequest ? (
                      <>
                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Request'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}