import type { Item } from '../../lib/types';

interface Props {
  items: Item[];
  responses: Record<string, number>;
  onResponse: (itemId: string, value: number) => void;
  pageNumber: number;
  devMode?: boolean;
}

const LIKERT_OPTIONS = [
  { value: 1, label: 'Very Inaccurate' },
  { value: 2, label: 'Moderately Inaccurate' },
  { value: 3, label: 'Neither Accurate nor Inaccurate' },
  { value: 4, label: 'Moderately Accurate' },
  { value: 5, label: 'Very Accurate' }
];

export default function QuestionPage({ items, responses, onResponse, pageNumber, devMode = false }: Props) {
  // Helper function to calculate score for an option based on keying
  const getScore = (optionValue: number, keying: number) => {
    if (keying === 1) {
      return optionValue; // Positive: 1→1, 2→2, etc.
    } else {
      return 6 - optionValue; // Negative: 1→5, 2→4, 3→3, 4→2, 5→1
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="space-y-8">
        {items.map((item, index) => {
          const itemNumber = (pageNumber - 1) * 10 + index + 1;
          const currentResponse = responses[item.ids[0]];

          // Get the first keying value (most items have only one scale)
          const firstKeying = item.keying ? Object.values(item.keying)[0] : 1;

          return (
            <div key={item.ids[0]} className="pb-6 border-b border-gray-200 last:border-b-0 last:pb-0">
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-500">Question {itemNumber}</span>
                <p className="text-lg text-gray-900 mt-1">{item.text}</p>
              </div>

              <div className="space-y-2">
                {LIKERT_OPTIONS.map(option => (
                  <label
                    key={option.value}
                    className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      currentResponse === option.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name={`item-${item.ids[0]}`}
                        value={option.value}
                        checked={currentResponse === option.value}
                        onChange={() => onResponse(item.ids[0], option.value)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-gray-700">{option.label}</span>
                    </div>
                    {devMode && (
                      <span className={`text-sm font-mono ${firstKeying === 1 ? 'text-green-600' : 'text-red-600'}`}>
                        {firstKeying === 1 ? '+' : '-'}{option.value}
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
