import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, TrendingUp, Users, Zap, ExternalLink, Copy, Check } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ResultsDisplay = ({ results }) => {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const copyToClipboard = async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const parseSuggestions = (suggestions) => {
    // First, let's try to identify complete projects by looking for major section breaks
    const completeProjectPatterns = [
      // Pattern 1: "Project X:" or "Portfolio Project X:" followed by content until next project
      /(?:Project|Portfolio Project)\s+\d+:\s*([\s\S]*?)(?=(?:Project|Portfolio Project)\s+\d+:|$)/gi,
      
      // Pattern 2: Bold project titles followed by content (this is the main pattern we want)
      /\*\*([^*]+)\*\*\s*([\s\S]*?)(?=\*\*[^*]+\*\*|$)/g,
      
      // Pattern 3: Markdown headers for projects
      /##\s+([^#\n]+)\s*([\s\S]*?)(?=##\s+[^#\n]+|$)/g,
    ];
    
    let projects = [];
    
    // Try each pattern to find complete projects
    for (const pattern of completeProjectPatterns) {
      const matches = [...suggestions.matchAll(pattern)];
      if (matches.length > 1) {
        projects = matches.map((match, index) => {
          const title = match[1]?.trim() || `Project ${index + 1}`;
          const content = match[2]?.trim() || match[0]?.trim() || '';
          
          return {
            id: index,
            title,
            content,
            fullText: match[0]?.trim() || ''
          };
        });
        break;
      }
    }
    
    // If no complete projects found, try to split by major sections
    if (projects.length <= 1) {
             // Look for sections that start with common project indicators
       const sectionPatterns = [
         /\n(?=Project \d+:)/gi,
         /\n(?=Portfolio Project \d+:)/gi,
         /\n(?=\*\*[^*]+\*\*)/g,
         /\n(?=##\s+)/g,
       ];
      
      for (const pattern of sectionPatterns) {
        const sections = suggestions.split(pattern).filter(section => section.trim());
        if (sections.length > 1) {
          projects = sections.map((section, index) => {
            const lines = section.trim().split('\n');
            const firstLine = lines[0]?.trim() || '';
            
            // Extract title from first line
            let title = firstLine.replace(/^(Project|Portfolio Project)\s+\d+:\s*/, '');
            title = title.replace(/^\d+\.\s*/, '');
            title = title.replace(/^\*\*([^*]+)\*\*/, '$1');
            title = title.replace(/^##\s*/, '');
            
            if (!title || title.length < 3) {
              title = `Portfolio Project ${index + 1}`;
            }
            
            const content = lines.slice(1).join('\n').trim();
            
            return {
              id: index,
              title,
              content,
              fullText: section.trim()
            };
          });
          break;
        }
      }
    }
    
    // If still no good separation, try to split by double newlines and group related content
    if (projects.length <= 1) {
      const paragraphs = suggestions.split(/\n\n+/).filter(p => p.trim());
      
      // Group paragraphs into projects based on content similarity
      projects = [];
      let currentProject = null;
      
      for (const paragraph of paragraphs) {
        const trimmed = paragraph.trim();
        
                 // Check if this paragraph starts a new project
         const isNewProject = /^(Project|Portfolio Project)\s+\d+:|^##\s+|^\*\*[^*]+\*\*/.test(trimmed);
        
        if (isNewProject && currentProject) {
          // Save current project and start new one
          projects.push(currentProject);
          currentProject = {
            id: projects.length,
            title: '',
            content: trimmed,
            fullText: trimmed
          };
        } else if (isNewProject) {
          // Start first project
          currentProject = {
            id: 0,
            title: '',
            content: trimmed,
            fullText: trimmed
          };
        } else if (currentProject) {
          // Add to current project
          currentProject.content += '\n\n' + trimmed;
          currentProject.fullText += '\n\n' + trimmed;
        } else {
          // Start first project even if it doesn't have a clear header
          currentProject = {
            id: 0,
            title: 'Portfolio Project 1',
            content: trimmed,
            fullText: trimmed
          };
        }
      }
      
      if (currentProject) {
        projects.push(currentProject);
      }
    }
    
    // Clean up titles and content for each project
    return projects.map((project, index) => {
      const lines = project.content.split('\n');
      const firstLine = lines[0]?.trim() || '';
      
      // Extract better title from first line
      let title = firstLine
        .replace(/^(Project|Portfolio Project)\s+\d+:\s*/, '')
        .replace(/^\d+\.\s*/, '')
        .replace(/^\*\*([^*]+)\*\*/, '$1')
        .replace(/^##\s*/, '')
        .trim();
      
      if (!title || title.length < 3) {
        title = `Portfolio Project ${index + 1}`;
      }
      
      // Remove the title line from content if it's the same as the extracted title
      let content = project.content;
      if (lines[0]?.trim().includes(title) && title !== `Portfolio Project ${index + 1}`) {
        content = lines.slice(1).join('\n').trim();
      }
      
      return {
        id: index,
        title,
        content,
        fullText: project.fullText
      };
    });
  };

  const projects = parseSuggestions(results.suggestions);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card"
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{results.jobs_analyzed}</div>
            <div className="text-sm text-gray-600">Jobs Analyzed</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mx-auto mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{results.quality_descriptions}</div>
            <div className="text-sm text-gray-600">Quality Descriptions</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-2">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{results.historical_jobs_used}</div>
            <div className="text-sm text-gray-600">Historical Jobs</div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{results.total_time}s</div>
            <div className="text-sm text-gray-600">Total Time</div>
          </div>
        </div>
      </motion.div>

      {/* AI Suggestions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            🧠 AI Portfolio Project Suggestions
          </h2>
          <p className="text-gray-600">
            Based on {results.jobs_analyzed} job listings, here are tailored project ideas to strengthen your application.
          </p>
        </div>

        <div className="space-y-8">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-500"
            >
              {/* Project Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl text-white text-sm font-bold shadow-lg flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight">
                        {project.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Portfolio Project #{index + 1}
                      </p>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => copyToClipboard(project.fullText, index)}
                  className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Project</span>
                    </>
                  )}
                </button>
              </div>

              {/* Project Content */}
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-semibold text-gray-900 mb-3 mt-4">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-semibold text-gray-800 mb-2 mt-4">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-gray-700 mb-2 mt-3">{children}</h3>,
                    p: ({ children }) => <p className="text-gray-700 mb-4 leading-relaxed">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2 ml-4">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-2 ml-4">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-700 leading-relaxed">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                    em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                    code: ({ children }) => <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-blue-700">{children}</code>,
                    pre: ({ children }) => <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-sm border border-gray-200">{children}</pre>,
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 bg-blue-50 py-2 rounded-r-lg">{children}</blockquote>,
                  }}
                >
                  {project.content}
                </ReactMarkdown>
              </div>

              {/* Project Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-sm text-gray-500">
                    <Zap className="w-4 h-4" />
                    <span>AI-Generated Portfolio Project</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-gray-500">Ready to implement</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card bg-gradient-to-r from-blue-50 to-purple-50"
      >
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            🎯 Next Steps
          </h3>
          <p className="text-gray-700 mb-4">
            Choose one or two projects that align with your skills and interests. Start with the one that excites you most!
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">1. Research</div>
              <div className="text-gray-600">Study the project requirements and gather resources</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">2. Build</div>
              <div className="text-gray-600">Implement the project step by step</div>
            </div>
            <div className="bg-white p-3 rounded-lg">
              <div className="font-semibold text-gray-900 mb-1">3. Showcase</div>
              <div className="text-gray-600">Document and present your work professionally</div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultsDisplay; 