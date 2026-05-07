import { useState, useMemo } from 'react';
import type { Item, Scale, Translation } from '../../lib/types';

interface Props {
  items: Item[];
  scales: Scale[];
  translations: Translation[];
}

export default function ItemBrowser({ items, scales, translations }: Props) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedScale, setSelectedScale] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'text'>('id');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 50;

  // Get unique instruments for filtering
  const instruments = useMemo(() => {
    const uniqueInstruments = new Set(scales.map(s => s.instrument));
    return Array.from(uniqueInstruments).sort();
  }, [scales]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let filtered = items;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.text.toLowerCase().includes(query) ||
        item.ids.some(id => id.toLowerCase().includes(query))
      );
    }

    // Scale filter
    if (selectedScale) {
      const scale = scales.find(s => s.id === selectedScale);
      if (scale) {
        const itemIds = new Set(scale.items.flatMap(i => i.itemIds));
        filtered = filtered.filter(item => item.ids.some(id => itemIds.has(id)));
      }
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'id') {
        return a.ids[0].localeCompare(b.ids[0]);
      } else {
        return a.text.localeCompare(b.text);
      }
    });

    return filtered;
  }, [items, scales, searchQuery, selectedScale, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIdx = Math.min(startIdx + ITEMS_PER_PAGE, filteredItems.length);
  const currentItems = filteredItems.slice(startIdx, endIdx);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid md:grid-cols-3 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by text or ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Scale Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Scale
            </label>
            <select
              value={selectedScale}
              onChange={(e) => {
                setSelectedScale(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Scales</option>
              {scales.map(scale => (
                <option key={scale.id} value={scale.id}>
                  {scale.name} ({scale.instrument})
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'id' | 'text')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="id">Item ID</option>
              <option value="text">Item Text</option>
            </select>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-600">
          Showing {startIdx + 1}-{endIdx} of {filteredItems.length} items
        </div>
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {currentItems.map(item => {
          const itemScales = scales.filter(s =>
            s.items.some(i => i.itemIds.some(id => item.ids.includes(id)))
          );
          const translationCount = Object.keys(item.translations).length;

          return (
            <a
              key={item.ids[0]}
              href={`/items/${item.ids[0]}`}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {item.ids.map((id, index) => (
                      <span key={id} className="text-sm font-mono font-bold text-blue-600">
                        {id}{index < item.ids.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                  <p className="text-gray-900 mb-2">{item.text}</p>
                  {itemScales.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {itemScales.slice(0, 3).map(scale => (
                        <span
                          key={scale.id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                        >
                          {scale.instrument}
                        </span>
                      ))}
                      {itemScales.length > 3 && (
                        <span className="text-xs text-gray-500">
                          +{itemScales.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="ml-4 text-gray-400">
                  →
                </div>
              </div>
            </a>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="flex gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-2 rounded-lg font-medium ${
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
