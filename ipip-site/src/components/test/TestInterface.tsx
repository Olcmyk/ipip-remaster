import { useState, useEffect } from 'react';
import type { TestBattery, Item, Scale, TestProgress } from '../../lib/types';
import { saveTestProgress, loadTestProgress, clearTestProgress } from '../../lib/storage';
import { scoreScales } from '../../lib/scoring';
import QuestionPage from './QuestionPage';
import ProgressBar from './ProgressBar';
import ResultsDisplay from './ResultsDisplay';

interface Props {
  battery: TestBattery;
  items: Item[];
  scales: Scale[];
}

const ITEMS_PER_PAGE = 10;

export default function TestInterface({ battery, items, scales }: Props) {
  const [currentPage, setCurrentPage] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [showResults, setShowResults] = useState(false);
  const [startedAt] = useState(new Date().toISOString());
  const [devMode, setDevMode] = useState(false);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  // Load saved progress on mount
  useEffect(() => {
    const saved = loadTestProgress(battery.id);
    if (saved) {
      setResponses(saved.responses);
      setCurrentPage(saved.currentPage);
    }
  }, [battery.id]);

  // Save progress whenever responses change
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      const progress: TestProgress = {
        testId: battery.id,
        responses,
        currentPage,
        startedAt,
        lastUpdated: new Date().toISOString()
      };
      saveTestProgress(progress);
    }
  }, [responses, currentPage, battery.id, startedAt]);

  const handleResponse = (itemId: string, value: number) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = () => {
    // Check if all items are answered
    const unanswered = items.filter(item => !responses[item.ids[0]]);
    if (unanswered.length > 0) {
      const confirm = window.confirm(
        `You have ${unanswered.length} unanswered items. Submit anyway?`
      );
      if (!confirm) return;
    }

    setShowResults(true);
    window.scrollTo(0, 0);
  };

  const handleRestart = () => {
    if (window.confirm('Are you sure you want to restart this test? All progress will be lost.')) {
      setResponses({});
      setCurrentPage(0);
      setShowResults(false);
      clearTestProgress(battery.id);
      window.scrollTo(0, 0);
    }
  };

  const handleNewTest = () => {
    clearTestProgress(battery.id);
    window.location.href = '/tests';
  };

  // Calculate completion
  const answeredCount = items.filter(item => responses[item.ids[0]] !== undefined).length;
  const completionPercent = (answeredCount / items.length) * 100;

  // Get current page items
  const startIdx = currentPage * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, items.length);
  const currentItems = items.slice(startIdx, endIdx);

  // Calculate scores if showing results
  const scaleScores = showResults ? scoreScales(scales, responses) : [];

  if (showResults) {
    return (
      <ResultsDisplay
        battery={battery}
        scaleScores={scaleScores}
        responses={responses}
        onRestart={handleRestart}
        onNewTest={handleNewTest}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{battery.name}</h1>
          <p className="text-gray-600">{battery.description}</p>
        </div>
        <button
          onClick={() => setDevMode(!devMode)}
          className={`ml-4 px-3 py-1.5 text-sm font-medium rounded border transition-colors w-36 ${
            devMode
              ? 'bg-gray-700 text-white border-gray-700 hover:bg-gray-800 hover:border-gray-800'
              : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
          }`}
        >
          {devMode ? 'Dev Mode: ON' : 'Developer Mode'}
        </button>
      </div>

      {/* Progress Bar */}
      <ProgressBar
        currentPage={currentPage + 1}
        totalPages={totalPages}
        completionPercent={completionPercent}
        answeredCount={answeredCount}
        totalItems={items.length}
      />

      {/* Questions */}
      <QuestionPage
        items={currentItems}
        responses={responses}
        onResponse={handleResponse}
        pageNumber={currentPage + 1}
        devMode={devMode}
      />

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 0}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>

        <div className="text-sm text-gray-600">
          Page {currentPage + 1} of {totalPages}
        </div>

        {currentPage === totalPages - 1 ? (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Submit Test
          </button>
        ) : (
          <button
            onClick={handleNextPage}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Next →
          </button>
        )}
      </div>

      {/* Restart Button */}
      <div className="mt-4 text-center">
        <button
          onClick={handleRestart}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Restart Test
        </button>
      </div>
    </div>
  );
}
