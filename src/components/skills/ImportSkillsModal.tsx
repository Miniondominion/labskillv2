import { useState } from 'react';
import { X, Upload, FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';
import Papa from 'papaparse';
import { Question } from '../../types/skills';

type ImportSkillsModalProps = {
  onClose: () => void;
  onImport: (questions: Question[]) => void;
};

export function ImportSkillsModal({ onClose, onImport }: ImportSkillsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file type
    const fileType = selectedFile.type;
    if (fileType !== 'text/csv' && 
        fileType !== 'application/vnd.ms-excel' && 
        fileType !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      setError('Please upload a CSV or Excel file');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleImport = () => {
    if (!file) {
      setError('Please select a file to import');
      return;
    }

    setLoading(true);
    setError(null);

    // For CSV files
    if (file.type === 'text/csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          try {
            const questions = processImportedData(results.data);
            onImport(questions);
            setSuccess('Questions imported successfully!');
            setTimeout(() => {
              onClose();
            }, 1500);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to process file');
          } finally {
            setLoading(false);
          }
        },
        error: (error) => {
          setError(`Error parsing CSV: ${error.message}`);
          setLoading(false);
        }
      });
    } else {
      setError('Excel file support is coming soon. Please use CSV format for now.');
      setLoading(false);
    }
  };

  const processImportedData = (data: any[]): Question[] => {
    if (!data || data.length === 0) {
      throw new Error('The file contains no data');
    }

    // Validate required columns
    const requiredColumns = ['QuestionType', 'QuestionText', 'Required'];
    const missingColumns = requiredColumns.filter(col => 
      !Object.keys(data[0]).some(key => key.toLowerCase() === col.toLowerCase())
    );

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    return data.map((row, index) => {
      const questionType = row.QuestionType?.toLowerCase() || '';
      let responseType: Question['response_type'] = 'text';
      
      // Map the question type from the CSV to our internal types
      if (questionType.includes('multiple choice') || questionType.includes('mc')) {
        responseType = 'multiple_choice';
      } else if (questionType.includes('select multiple') || questionType.includes('select all')) {
        responseType = 'select_multiple';
      } else if (questionType.includes('checkbox') || questionType.includes('yes/no')) {
        responseType = 'checkbox';
      } else if (questionType.includes('number')) {
        responseType = 'number';
      } else if (questionType.includes('text') || questionType.includes('short answer')) {
        responseType = 'text';
      }

      // Extract options for multiple choice and select multiple questions
      const options: string[] = [];
      if (responseType === 'multiple_choice' || responseType === 'select_multiple') {
        // Look for columns named Option1 through Option8
        for (let i = 1; i <= 8; i++) {
          const optionKey = `Option${i}`;
          if (row[optionKey] && row[optionKey].trim()) {
            options.push(row[optionKey].trim());
          }
        }
      }

      return {
        id: crypto.randomUUID(),
        question_text: row.QuestionText || `Question ${index + 1}`,
        response_type: responseType,
        is_required: row.Required?.toLowerCase() === 'true' || row.Required === '1' || true,
        order_index: index,
        options: options.length > 0 ? options : undefined
      };
    });
  };

  const downloadSampleTemplate = () => {
    const csvContent = `QuestionType,QuestionText,Required,Option1,Option2,Option3,Option4,Option5,Option6,Option7,Option8
Multiple Choice,What technique was used for this skill?,true,Technique A,Technique B,Technique C,Technique D,,,,,
Multiple Choice,Rate the student's performance,true,Excellent,Good,Satisfactory,Needs Improvement,,,,
Multiple Choice,What level of supervision was required?,true,None,Minimal,Moderate,Significant,Constant,,,
Multiple Choice,How would you rate the student's preparation?,true,Excellent,Good,Fair,Poor,,,,
Select Multiple,Which safety protocols were followed?,true,Hand hygiene,PPE usage,Sterile technique,Equipment check,Patient identification,Documentation,Area preparation,Time out
Select Multiple,What challenges were encountered?,true,Technical difficulty,Equipment issues,Time constraints,Patient factors,Communication barriers,Resource limitations,,
Checkbox,Was the procedure completed successfully?,true,,,,,,,,
Text,Describe the steps taken to complete this skill,true,,,,,,,,
Number,How many attempts were needed?,true,,,,,,,,
Text,What challenges were encountered during the procedure?,true,,,,,,,,
Checkbox,Were all safety protocols followed?,true,,,,,,,,
Text,Provide feedback for improvement,true,,,,,,,,`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'skill_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Import Skill Questions</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
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

          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center justify-center">
            <FileText className="h-12 w-12 text-gray-400 mb-3" />
            <div className="text-center">
              <p className="text-sm text-gray-600">
                {file ? file.name : 'Upload a CSV file with your skill questions'}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                CSV format required
              </p>
            </div>
            <label className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {file ? 'Change File' : 'Select File'}
              <input
                type="file"
                className="hidden"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <div className="bg-indigo-50 rounded-md p-4">
            <h4 className="text-sm font-medium text-indigo-800 mb-2">CSV Format Instructions</h4>
            <p className="text-xs text-indigo-700 mb-2">
              Your CSV file should include the following columns:
            </p>
            <ul className="text-xs text-indigo-700 list-disc pl-5 mb-2">
              <li>QuestionType: Multiple Choice, Select Multiple, Checkbox, Text, or Number</li>
              <li>QuestionText: The text of your question</li>
              <li>Required: true/false</li>
              <li>Option1 through Option8: For multiple choice and select multiple questions</li>
            </ul>
            <button
              onClick={downloadSampleTemplate}
              className="mt-2 inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Download className="h-3 w-3 mr-1" />
              Download Sample Template
            </button>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!file || loading}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Importing...' : 'Import Questions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}