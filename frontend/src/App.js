import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Brain, TrendingUp, Zap, CheckCircle, AlertCircle, Loader, Home } from 'lucide-react';
import JobForm from './components/JobForm';
import ResultsDisplay from './components/ResultsDisplay';
import LoadingSpinner from './components/LoadingSpinner';
import HeroPage from './components/HeroPage';
import { API_BASE_URL } from './config';

function App() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showHero, setShowHero] = useState(true);

  const handleSubmit = async (jobTitle, jobCountry) => {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          job_title: jobTitle,
          job_country: jobCountry,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResults(data);
      } else {
        setError(data.error || 'An error occurred while processing your request.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterApp = () => {
    setShowHero(false);
  };

  const handleBackToHero = () => {
    setShowHero(true);
    setResults(null);
    setError(null);
  };

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {showHero ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroPage onEnterApp={handleEnterApp} />
          </motion.div>
        ) : (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-gradient-to-br from-blue-50 via-white to-purple-50"
          >
            {/* Header */}
            <motion.header 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white shadow-sm border-b border-gray-200"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                      <Brain className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-gray-900">JobScraperAI</h1>
                      <p className="text-sm text-gray-500">AI-Powered Job Analysis</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handleBackToHero}
                      className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors duration-200"
                    >
                      <Home className="w-4 h-4" />
                      <span>Back to Home</span>
                    </button>
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Zap className="w-4 h-4" />
                      <span>Powered by OpenRouter AI</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500 text-xs">Constantly in development to improve result accuracy</span>
                    </div>
                  </div>
                </div>
              </div>
                        </motion.header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Form */}
                <div className="lg:col-span-1">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <JobForm onSubmit={handleSubmit} loading={loading} />
                  </motion.div>
                </div>

                {/* Right Column - Results */}
                <div className="lg:col-span-2">
                  <AnimatePresence mode="wait">
                    {loading && (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="h-full"
                      >
                        <LoadingSpinner />
                      </motion.div>
                    )}

                    {error && (
                      <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="card"
                      >
                        <div className="flex items-center space-x-3 text-red-600">
                          <AlertCircle className="w-6 h-6" />
                          <h3 className="text-lg font-semibold">Error</h3>
                        </div>
                        <p className="mt-2 text-gray-700">{error}</p>
                      </motion.div>
                    )}

                    {results && !loading && (
                      <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                      >
                        <ResultsDisplay results={results} />
                      </motion.div>
                    )}

                    {!loading && !error && !results && (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="card text-center"
                      >
                        <div className="flex flex-col items-center space-y-4">
                          <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                            <Search className="w-8 h-8 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              Ready to Analyze Jobs
                            </h3>
                            <p className="text-gray-600 mt-1">
                              Enter a job title and country to get AI-powered portfolio project suggestions
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </main>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="text-center text-sm text-gray-500">
                  <p>JobScraperAI - AI-Powered Job Analysis Tool</p>
                  <p className="mt-1">Powered by LinkedIn scraping and OpenRouter AI</p>
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App; 