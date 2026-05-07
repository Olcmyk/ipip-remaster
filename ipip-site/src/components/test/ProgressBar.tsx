interface Props {
  currentPage: number;
  totalPages: number;
  completionPercent: number;
  answeredCount: number;
  totalItems: number;
}

export default function ProgressBar({
  currentPage,
  totalPages,
  completionPercent,
  answeredCount,
  totalItems
}: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          Progress: {answeredCount} of {totalItems} items
        </span>
        <span className="text-sm font-medium text-gray-700">
          {completionPercent.toFixed(0)}%
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${completionPercent}%` }}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500 text-center">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
}
