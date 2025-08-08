import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, MapPin, Send, AlertCircle } from 'lucide-react';

const JobForm = ({ onSubmit, loading }) => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobCountry, setJobCountry] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (!jobTitle.trim()) {
      newErrors.jobTitle = 'Job title is required';
    }
    
    if (!jobCountry.trim()) {
      newErrors.jobCountry = 'Country is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(jobTitle.trim(), jobCountry.trim());
    }
  };

  const handleInputChange = (field, value) => {
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'jobTitle') {
      setJobTitle(value);
    } else if (field === 'jobCountry') {
      setJobCountry(value);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card sticky top-8"
    >
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Job Analysis
        </h2>
        <p className="text-gray-600">
          Enter job details to get AI-powered portfolio project suggestions
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Job Title Input */}
        <div>
          <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700 mb-2">
            Job Title
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="jobTitle"
              type="text"
              value={jobTitle}
              onChange={(e) => handleInputChange('jobTitle', e.target.value)}
              className={`input-field pl-10 ${errors.jobTitle ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g. Junior Data Analyst"
              disabled={loading}
            />
          </div>
          {errors.jobTitle && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center mt-1 text-sm text-red-600"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.jobTitle}
            </motion.div>
          )}
        </div>

        {/* Country Input */}
        <div>
          <label htmlFor="jobCountry" className="block text-sm font-medium text-gray-700 mb-2">
            Country
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MapPin className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="jobCountry"
              type="text"
              value={jobCountry}
              onChange={(e) => handleInputChange('jobCountry', e.target.value)}
              className={`input-field pl-10 ${errors.jobCountry ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="e.g. United Kingdom"
              disabled={loading}
            />
          </div>
          {errors.jobCountry && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center mt-1 text-sm text-red-600"
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {errors.jobCountry}
            </motion.div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Start Analysis</span>
            </>
          )}
        </button>
      </form>

      {/* Info Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">What this tool does:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Scrapes LinkedIn job listings</li>
          <li>• Analyzes job descriptions with AI</li>
          <li>• Generates portfolio project suggestions</li>
          <li>• Provides detailed implementation guidance</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default JobForm; 