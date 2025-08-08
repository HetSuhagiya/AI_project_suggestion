import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Zap, TrendingUp, ArrowRight, Sparkles, Target, Users } from 'lucide-react';

const HeroPage = ({ onEnterApp }) => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900">
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
        
        {/* Floating Elements */}
        <motion.div
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 5, 0]
          }}
          transition={{ 
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"
        />
        
        <motion.div
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -5, 0]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute top-40 right-20 w-24 h-24 bg-white/10 rounded-full blur-xl"
        />
        
        <motion.div
          animate={{ 
            y: [0, -15, 0],
            x: [0, 10, 0]
          }}
          transition={{ 
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute bottom-40 left-1/4 w-20 h-20 bg-white/10 rounded-full blur-xl"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center min-h-screen px-4">
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Main Content */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-left"
            >

              
              {/* Title */}
              <div className="mb-6">
                <h1 className="text-4xl md:text-6xl font-bold text-purple-200 mb-2">
                  AI Project
                </h1>
                <h1 className="text-4xl md:text-6xl font-bold text-white">
                  Suggestion Engine
                </h1>
              </div>
              
              {/* Subtitle */}
              <p className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed">
                Transform job descriptions into actionable portfolio projects with AI-powered analysis
              </p>
              
              {/* CTA Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <button
                  onClick={onEnterApp}
                  className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-indigo-600 rounded-xl shadow-2xl hover:bg-indigo-700 hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105"
                >
                  <span className="mr-3">Generate Projects</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
              </motion.div>
            </motion.div>

            {/* Right Side - Preview Cards */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="relative"
            >
              {/* Back Card */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: -5 }}
                animate={{ opacity: 1, y: 0, rotate: -2 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="absolute top-0 right-0 w-80 h-96 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6 shadow-2xl"
              >
                {/* Window Controls */}
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                
                {/* Placeholder Content */}
                <div className="space-y-3">
                  <div className="h-4 bg-white/20 rounded animate-pulse"></div>
                  <div className="h-4 bg-white/20 rounded w-3/4 animate-pulse"></div>
                  <div className="h-4 bg-white/20 rounded w-1/2 animate-pulse"></div>
                  <div className="h-4 bg-white/20 rounded w-5/6 animate-pulse"></div>
                  <div className="h-4 bg-white/20 rounded w-2/3 animate-pulse"></div>
                  <div className="h-4 bg-white/20 rounded w-4/5 animate-pulse"></div>
                </div>
              </motion.div>

              {/* Front Card */}
              <motion.div
                initial={{ opacity: 0, y: 20, rotate: 5 }}
                animate={{ opacity: 1, y: 0, rotate: 2 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="relative z-10 w-72 h-80 bg-white/15 backdrop-blur-sm rounded-xl border border-white/25 p-6 shadow-2xl"
              >
                {/* Header */}
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">Project Ideas</h3>
                </div>
                
                {/* Placeholder Content */}
                <div className="space-y-3">
                  <div className="h-3 bg-white/20 rounded animate-pulse"></div>
                  <div className="h-3 bg-white/20 rounded w-4/5 animate-pulse"></div>
                  <div className="h-3 bg-white/20 rounded w-2/3 animate-pulse"></div>
                  <div className="h-3 bg-white/20 rounded w-3/4 animate-pulse"></div>
                  <div className="h-3 bg-white/20 rounded w-1/2 animate-pulse"></div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Horizon Effect */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
      
      {/* Bottom Gradient Overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-blue-900/80 via-purple-900/40 to-transparent"></div>
    </div>
  );
};

export default HeroPage; 