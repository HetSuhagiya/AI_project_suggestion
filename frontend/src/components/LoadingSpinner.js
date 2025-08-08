import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, TrendingUp, Zap } from 'lucide-react';

const LoadingSpinner = () => {
  const steps = [
    { icon: Search, text: 'Scraping LinkedIn jobs...', color: 'text-blue-600' },
    { icon: Brain, text: 'Analyzing job descriptions...', color: 'text-purple-600' },
    { icon: TrendingUp, text: 'Generating AI suggestions...', color: 'text-green-600' },
    { icon: Zap, text: 'Finalizing results...', color: 'text-orange-600' },
  ];

  return (
    <div className="card">
      <div className="text-center">
        {/* Main Loading Animation */}
        <div className="relative mb-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-20 h-20 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Brain className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        {/* Loading Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Analyzing Job Market
          </h3>
          <p className="text-gray-600">
            This may take a few minutes. We're scraping LinkedIn and analyzing job descriptions with AI.
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, delay: index * 0.3 }}
              >
                <step.icon className={`w-5 h-5 ${step.color}`} />
              </motion.div>
              <span className="text-sm text-gray-700">{step.text}</span>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 30, ease: "linear" }}
            />
          </div>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Tips:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• More specific job titles yield better results</li>
            <li>• Popular countries have more job listings</li>
            <li>• Results are cached for faster subsequent searches</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LoadingSpinner; 