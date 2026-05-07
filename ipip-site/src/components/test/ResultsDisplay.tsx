import type { TestBattery, ScaleScore } from '../../lib/types';
import { exportResultsAsJSON, exportResultsAsCSV } from '../../lib/scoring';

interface Props {
  battery: TestBattery;
  scaleScores: ScaleScore[];
  responses: Record<string, number>;
  onRestart: () => void;
  onNewTest: () => void;
}

export default function ResultsDisplay({
  battery,
  scaleScores,
  responses,
  onRestart,
  onNewTest
}: Props) {
  const handleExportJSON = () => {
    const json = exportResultsAsJSON(battery.name, scaleScores, responses);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${battery.id}-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = exportResultsAsCSV(scaleScores);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${battery.id}-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Find min and max scores for visualization
  const meanScores = scaleScores.map(s => s.meanScore);
  const minScore = Math.min(...meanScores);
  const maxScore = Math.max(...meanScores);
  const range = maxScore - minScore || 1;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full mb-4">
          ✓ Test Complete
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Results</h1>
        <p className="text-gray-600">{battery.name}</p>
        <p className="text-sm text-gray-500 mt-2">
          Completed on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        <button
          onClick={handleExportJSON}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Export JSON
        </button>
        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
        >
          Export CSV
        </button>
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg font-medium hover:bg-gray-700"
        >
          Print
        </button>
      </div>

      {/* Scale Scores */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Scale Scores</h2>

        <div className="space-y-6">
          {scaleScores.map(score => {
            const normalizedScore = ((score.meanScore - minScore) / range) * 100;

            return (
              <div key={score.scaleId}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900">{score.scaleName}</span>
                  <span className="text-sm text-gray-600">
                    Mean: {score.meanScore.toFixed(2)} | Raw: {score.rawScore}
                  </span>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-500 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${normalizedScore}%` }}
                  >
                    {normalizedScore > 15 && (
                      <span className="text-xs text-white font-medium">
                        {score.meanScore.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interpretation Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Interpretation Note</h3>
        <p className="text-gray-700 text-sm">
          These results show your raw and mean scores on each scale. Higher scores indicate
          stronger endorsement of the traits measured by that scale. These results are provided
          for research and educational purposes only and should not be used for clinical diagnosis.
          For detailed interpretation guidelines, please refer to the archive documentation.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={onRestart}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
        >
          Retake This Test
        </button>
        <button
          onClick={onNewTest}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
        >
          Take Another Test
        </button>
      </div>
    </div>
  );
}
