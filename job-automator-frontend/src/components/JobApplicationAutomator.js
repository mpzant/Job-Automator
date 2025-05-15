import React, { useState } from 'react';

// Backend API base URL
const API_BASE_URL = 'http://localhost:5000/api';

const JobApplicationAutomator = () => {
  // State management
  const [page, setPage] = useState('login');
  const [activePage, setActivePage] = useState('matching');
  const [files, setFiles] = useState({ resume: null, coverLetter: null });
  const [jobCount, setJobCount] = useState(5);
  const [jobs, setJobs] = useState([]);
  const [selectedJobs, setSelectedJobs] = useState([]);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [rejectedJobs, setRejectedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  
  // Handle credential input changes
  const handleCredentialChange = (e) => {
    const { name, value } = e.target;
    setCredentials({
      ...credentials,
      [name]: value
    });
  };
  
  // Handle login
  const handleLogin = async () => {
    setIsLoading(true);
    setMessage('Logging in...');
    
    try {
      // Call backend API to login
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(data.message);
        setPage('upload');
      } else {
        setMessage(data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setMessage('Error connecting to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Go to jobs page and load jobs from API
  const goToJobsPage = async () => {
    if (!files.resume) {
      setMessage('Please upload your resume to continue.');
      return;
    }
    
    setIsLoading(true);
    setMessage('Uploading files and finding matching jobs...');
    
    try {
      // First upload files
      const formData = new FormData();
      formData.append('resume', files.resume);
      if (files.coverLetter) {
        formData.append('coverLetter', files.coverLetter);
      }
      
      const uploadResponse = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        body: formData
      });
      
      const uploadData = await uploadResponse.json();
      
      if (uploadData.success) {
        // Then fetch jobs
        const appliedJobIds = appliedJobs.map(job => job.id).join(',');
        const rejectedJobIds = rejectedJobs.join(',');
        
        const jobsResponse = await fetch(
          `${API_BASE_URL}/jobs?count=${jobCount}&appliedJobs=${appliedJobIds}&rejectedJobs=${rejectedJobIds}`
        );
        
        const jobsData = await jobsResponse.json();
        
        if (jobsData.success) {
          setJobs(jobsData.jobs);
          setPage('jobs');
        } else {
          setMessage(jobsData.message || 'Failed to fetch matching jobs.');
        }
      } else {
        setMessage(uploadData.message || 'Failed to upload files.');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error connecting to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle file uploads
  const handleFileUpload = (e, type) => {
    // Check if file is available
    if (e.target.files && e.target.files[0]) {
      setFiles({
        ...files,
        [type]: e.target.files[0]
      });
    }
  };
  
  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e, type) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFiles({
        ...files,
        [type]: e.dataTransfer.files[0]
      });
    }
  };
  
  // Refresh job listings
  const refreshJobListings = async () => {
    setIsLoading(true);
    setMessage('Refreshing job listings...');
    
    try {
      const appliedJobIds = appliedJobs.map(job => job.id).join(',');
      const rejectedJobIds = rejectedJobs.join(',');
      
      const response = await fetch(
        `${API_BASE_URL}/jobs?count=${jobCount}&appliedJobs=${appliedJobIds}&rejectedJobs=${rejectedJobIds}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
        setMessage('Job listings refreshed!');
      } else {
        setMessage(data.message || 'Failed to refresh job listings.');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage('Error connecting to server. Please try again.');
    } finally {
      setIsLoading(false);
      // Clear message after 3 seconds
      setTimeout(() => setMessage(''), 3000);
    }
  };
  
  // Toggle job selection for batch apply
  const toggleJobSelection = (jobId) => {
    if (selectedJobs.includes(jobId)) {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    } else {
      setSelectedJobs([...selectedJobs, jobId]);
    }
  };
  
  // Apply to selected jobs
  const applyToSelected = async () => {
    if (selectedJobs.length === 0) {
      setMessage('Please select at least one job');
      return;
    }
    
    setIsLoading(true);
    setMessage(`Applying to ${selectedJobs.length} jobs...`);
    
    const newAppliedJobs = [];
    const failedApplications = [];
    
    for (const jobId of selectedJobs) {
      const job = jobs.find(j => j.id === jobId);
      setMessage(`Applying to ${job.title} at ${job.company}...`);
      
      try {
        // If job requires a cover letter, customize it
        let coverLetterPath = null;
        if (job.requiresCoverLetter) {
          setMessage(`Customizing cover letter for ${job.company}...`);
          
          const coverLetterResponse = await fetch(`${API_BASE_URL}/cover-letter`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              jobDetails: {
                id: job.id,
                company: job.company,
                title: job.title,
                current_date: new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })
              }
            })
          });
          
          const coverLetterData = await coverLetterResponse.json();
          
          if (coverLetterData.success) {
            coverLetterPath = coverLetterData.coverLetterPath;
          }
        }
        
        // Apply to the job
        const applyResponse = await fetch(`${API_BASE_URL}/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            jobId: job.id,
            coverLetterPath: coverLetterPath
          })
        });
        
        const applyData = await applyResponse.json();
        
        if (applyData.success) {
          newAppliedJobs.push({
            id: job.id,
            title: job.title,
            company: job.company,
            location: job.location,
            appliedDate: applyData.applicationDate || new Date().toISOString(),
            hasCoverLetter: job.requiresCoverLetter
          });
        } else {
          failedApplications.push(job.title);
        }
      } catch (error) {
        console.error(`Error applying to ${job.title}:`, error);
        failedApplications.push(job.title);
      }
    }
    
    // Update state
    if (newAppliedJobs.length > 0) {
      setAppliedJobs([...appliedJobs, ...newAppliedJobs]);
      setJobs(jobs.filter(job => !selectedJobs.includes(job.id)));
      
      // Get replacement jobs
      try {
        const appliedJobIds = [...appliedJobs, ...newAppliedJobs].map(job => job.id).join(',');
        const rejectedJobIds = rejectedJobs.join(',');
        
        const response = await fetch(
          `${API_BASE_URL}/jobs?count=${newAppliedJobs.length}&appliedJobs=${appliedJobIds}&rejectedJobs=${rejectedJobIds}`
        );
        
        const data = await response.json();
        
        if (data.success && data.jobs.length > 0) {
          setJobs([...jobs.filter(job => !selectedJobs.includes(job.id)), ...data.jobs]);
        }
      } catch (error) {
        console.error('Error getting replacement jobs:', error);
      }
    }
    
    setSelectedJobs([]);
    setIsLoading(false);
    
    if (failedApplications.length > 0) {
      setMessage(`Applied to ${newAppliedJobs.length} jobs. Failed to apply to: ${failedApplications.join(', ')}`);
    } else {
      setMessage(`Successfully applied to ${newAppliedJobs.length} jobs!`);
    }
    
    // Clear message after delay
    setTimeout(() => setMessage(''), 5000);
  };
  
  // Apply to all displayed jobs
  const applyToAll = () => {
    const allJobIds = jobs.map(job => job.id);
    setSelectedJobs(allJobIds);
    applyToSelected();
  };
  
  // Apply to single job
  const applyToJob = (jobId) => {
    setSelectedJobs([jobId]);
    applyToSelected();
  };
  
  // Mark job as not interested
  const handleRejectJob = async (jobId) => {
    // Add to rejected jobs
    setRejectedJobs([...rejectedJobs, jobId]);
    
    // Remove from current jobs
    const updatedJobs = jobs.filter(job => job.id !== jobId);
    
    // Get a replacement job from the API
    try {
      const appliedJobIds = appliedJobs.map(job => job.id).join(',');
      const updatedRejectedJobIds = [...rejectedJobs, jobId].join(',');
      
      const response = await fetch(
        `${API_BASE_URL}/jobs?count=1&appliedJobs=${appliedJobIds}&rejectedJobs=${updatedRejectedJobIds}`
      );
      
      const data = await response.json();
      
      if (data.success && data.jobs.length > 0) {
        setJobs([...updatedJobs, ...data.jobs]);
      } else {
        setJobs(updatedJobs);
      }
    } catch (error) {
      console.error('Error getting replacement job:', error);
      setJobs(updatedJobs);
    }
    
    setMessage('Job marked as Not Interested');
    setTimeout(() => setMessage(''), 2000);
  };
  
  // Handle job count change
  const handleJobCountChange = async (newCount) => {
    setJobCount(newCount);
    setIsLoading(true);
    
    try {
      const appliedJobIds = appliedJobs.map(job => job.id).join(',');
      const rejectedJobIds = rejectedJobs.join(',');
      
      const response = await fetch(
        `${API_BASE_URL}/jobs?count=${newCount}&appliedJobs=${appliedJobIds}&rejectedJobs=${rejectedJobIds}`
      );
      
      const data = await response.json();
      
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Error updating job count:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Login Page */}
      {page === 'login' && (
        <div className="max-w-md mx-auto bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold text-center mb-6">12twenty Job Automator</h1>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">Username</label>
            <input 
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleCredentialChange}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter your 12twenty username"
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">Password</label>
            <input 
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleCredentialChange}
              className="w-full px-3 py-2 border rounded"
              placeholder="Enter your password"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-bold hover:bg-blue-700 disabled:bg-blue-300"
          >
            {isLoading ? 'Logging in...' : 'Log In'}
          </button>
          {message && (
            <div className="mt-4 text-center text-sm text-blue-600">
              {message}
            </div>
          )}
        </div>
      )}
      
      {/* Upload Page */}
      {page === 'upload' && (
        <div className="max-w-md mx-auto bg-white rounded shadow p-6">
          <h1 className="text-2xl font-bold text-center mb-6">Upload Your Documents</h1>
          <div className="mb-4">
            <label className="block text-gray-700 font-bold mb-2">
              Resume (PDF) <span className="text-red-500">*</span>
            </label>
            <div 
              className={`border-2 border-dashed rounded p-4 text-center 
              ${files.resume ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'resume')}
            >
              <input 
                type="file" 
                id="resume"
                accept=".pdf" 
                onChange={(e) => handleFileUpload(e, 'resume')}
                className="hidden"
              />
              <label htmlFor="resume" className="cursor-pointer">
                {files.resume ? (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">{files.resume.name}</span>
                    <span className="text-xs text-gray-500 mt-1">
                      {Math.round(files.resume.size / 1024)} KB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Drag & drop or click to browse</span>
                  </div>
                )}
              </label>
            </div>
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-bold mb-2">
              Cover Letter (PDF) <span className="text-gray-500">(Optional)</span>
            </label>
            <div 
              className={`border-2 border-dashed rounded p-4 text-center 
              ${files.coverLetter ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:bg-gray-50'}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'coverLetter')}
            >
              <input 
                type="file" 
                id="coverLetter"
                accept=".pdf" 
                onChange={(e) => handleFileUpload(e, 'coverLetter')}
                className="hidden"
              />
              <label htmlFor="coverLetter" className="cursor-pointer">
                {files.coverLetter ? (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium">{files.coverLetter.name}</span>
                    <span className="text-xs text-gray-500 mt-1">
                      {Math.round(files.coverLetter.size / 1024)} KB
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <span className="text-sm font-medium">Drag & drop or click to browse</span>
                  </div>
                )}
              </label>
            </div>
          </div>
          <button
            onClick={goToJobsPage}
            disabled={isLoading || !files.resume}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded font-bold hover:bg-blue-700 text-lg disabled:bg-blue-300"
          >
            {isLoading ? 'Finding Jobs...' : 'Find Matching Jobs'}
          </button>
          {message && (
            <div className="mt-4 text-center text-sm text-blue-600">
              {message}
            </div>
          )}
        </div>
      )}
      
      {/* Jobs Page */}
      {page === 'jobs' && (
        <div className="max-w-4xl mx-auto bg-white rounded shadow p-6">
          {/* Tab Navigation */}
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
            <h1 className="text-2xl font-bold mb-2 sm:mb-0">Job Portal</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setActivePage('matching')}
                className={`px-3 py-1 rounded text-sm ${
                  activePage === 'matching' 
                    ? 'bg-blue-100 text-blue-800 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Matching Jobs
              </button>
              <button
                onClick={() => setActivePage('applied')}
                className={`px-3 py-1 rounded text-sm ${
                  activePage === 'applied' 
                    ? 'bg-green-100 text-green-800 font-medium' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Applied Jobs
              </button>
            </div>
          </div>
          
          {/* Matching Jobs View */}
          {activePage === 'matching' && (
            <>
              {/* Action Buttons */}
              <div className="flex flex-wrap justify-between items-center mb-4">
                <div className="flex space-x-2 mb-2 sm:mb-0">
                  <button
                    onClick={applyToSelected}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
                    disabled={isLoading || selectedJobs.length === 0}
                  >
                    Apply to Selected ({selectedJobs.length})
                  </button>
                  <button
                    onClick={applyToAll}
                    className="bg-blue-800 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-900 disabled:bg-blue-300"
                    disabled={isLoading || jobs.length === 0}
                  >
                    Apply to All ({jobs.length})
                  </button>
                </div>
                <button
                  onClick={refreshJobListings}
                  className="bg-gray-200 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-300 flex items-center disabled:bg-gray-100"
                  disabled={isLoading}
                >
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
              
              {/* Job Count Slider */}
              <div className="mb-4 bg-gray-50 p-3 rounded border">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Number of Jobs: {jobCount}
                </label>
                <input
                  type="range"
                  min="1"
                  max="8"
                  value={jobCount}
                  onChange={(e) => handleJobCountChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-blue-100 rounded appearance-none"
                  disabled={isLoading}
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1</span>
                  <span>8</span>
                </div>
              </div>
              
              {/* Status Message */}
              {message && (
                <div className="mb-4 p-3 bg-blue-50 text-blue-700 rounded text-sm">
                  {message}
                </div>
              )}
              
              {/* Loading State */}
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <>
                  {/* Job Listings */}
                  {jobs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      No matching jobs found. Try adjusting your filters or refreshing.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobs.map(job => (
                        <div key={job.id} className="border rounded p-4 hover:shadow transition-shadow">
                          <div className="flex justify-between flex-wrap">
                            <div className="flex">
                              <input
                                type="checkbox"
                                checked={selectedJobs.includes(job.id)}
                                onChange={() => toggleJobSelection(job.id)}
                                className="mr-3 mt-1"
                              />
                              <div>
                                <h3 className="font-semibold text-lg">{job.title}</h3>
                                <p className="text-gray-700">{job.company}</p>
                                <div className="text-sm text-gray-500 mt-1">
                                  <span className="mr-3">{job.location}</span>
                                  <span className="mr-3">{job.type}</span>
                                  <span>{job.posted}</span>
                                </div>
                                {job.requiresCoverLetter && (
                                  <div className="mt-1 text-xs text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded">
                                    Cover Letter Required
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col text-sm space-y-2 mt-2 sm:mt-0">
                              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Match: {job.relevanceScore}%
                              </span>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => applyToJob(job.id)}
                                  className="bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:bg-blue-300"
                                  disabled={isLoading}
                                >
                                  Apply
                                </button>
                                <button
                                  onClick={() => handleRejectJob(job.id)}
                                  className="bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 disabled:bg-gray-100"
                                  disabled={isLoading}
                                >
                                  Not Interested
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
          
          {/* Applied Jobs View */}
          {activePage === 'applied' && (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-medium mb-2">Your Applied Jobs</h2>
                <p className="text-sm text-gray-600">
                  Track your application history and status.
                </p>
              </div>
              
              {/* Applied Jobs List */}
              {appliedJobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  You haven't applied to any jobs yet.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="mb-4 text-sm text-center p-2 bg-green-50 text-green-700 rounded">
                    <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Successfully applied to {appliedJobs.length} jobs!
                  </div>
                  
                  {appliedJobs.map(job => (
                    <div key={job.id} className="border border-green-200 bg-green-50 rounded p-4">
                      <div className="flex justify-between flex-wrap">
                        <div>
                          <h3 className="font-semibold">{job.title}</h3>
                          <p className="text-gray-700">{job.company}</p>
                          <div className="text-sm text-gray-500 mt-1">
                            <span className="mr-3">
                              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Applied: {new Date(job.appliedDate).toLocaleDateString()}
                            </span>
                            {job.location && (
                              <span>
                                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {job.location}
                              </span>
                            )}
                          </div>
                          {job.hasCoverLetter && (
                            <div className="mt-1 text-xs text-blue-600">
                              <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Cover Letter Included
                            </div>
                          )}
                        </div>
                        <div className="flex items-start mt-2 sm:mt-0">
                          <span className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Applied
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default JobApplicationAutomator; 