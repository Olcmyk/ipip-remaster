/**
 * Core IPIP data types
 */

export interface Item {
  ids: string[];           // e.g., ["H34", "X244"] - merged items have multiple IDs
  text: string;            // English item text
  translations: {
    [languageCode: string]: string;  // e.g., { "de": "...", "es": "..." }
  };
  scales?: string[];       // Scale IDs that use this item
  keying?: {
    [scaleId: string]: 1 | -1;  // Positive or negative keying per scale
  };
}

export interface ScaleItem {
  itemIds: string[];       // Array of item IDs (merged items have multiple IDs)
  keying: 1 | -1;          // +1 for positive keying, -1 for negative keying
}

export interface Scale {
  id: string;              // e.g., "neo-anxiety", "bigfive-extraversion"
  name: string;            // Display name
  instrument: string;      // Parent test battery (NEO-PI-R, Big Five, etc.)
  alpha: number | null;    // Reliability coefficient (Cronbach's alpha)
  items: ScaleItem[];
  facetOf?: string;        // For hierarchical scales (facet of a domain)
}

export interface TestBattery {
  id: string;              // e.g., "neo-pi-r-300", "bigfive-50"
  name: string;            // "NEO-PI-R (300 items)", "Big Five Factor Markers (50 items)"
  description: string;
  itemCount: number;
  scales: string[];        // Scale IDs included in this battery
  estimatedMinutes: number;
  sourceFile: string;      // Original .htm file
}

export interface Translation {
  languageCode: string;    // ISO 639-1 code (e.g., "de", "es", "zh")
  languageName: string;    // "German", "Spanish", etc.
  translations: {
    [itemId: string]: string;
  };
  coverage: string;        // Percentage of items translated
  sourceFile: string;
  itemCount?: number;
}

export interface ArchiveDocument {
  id: string;
  title: string;
  category: 'test-batteries' | 'translations' | 'technical' | 'guides' | 'reference' | 'about' | 'other';
  path: string;            // Relative path in archive
  type: 'html' | 'pdf' | 'document';
  description: string;
  filename: string;
  size: number;
}

export interface ArchiveCatalog {
  totalDocuments: number;
  categories: string[];
  byCategory: {
    [category: string]: ArchiveDocument[];
  };
  allDocuments: ArchiveDocument[];
}

/**
 * Test-taking types
 */

export interface TestResponse {
  itemId: string;
  value: number;           // 1-5 Likert scale response
}

export interface TestProgress {
  testId: string;
  responses: Record<string, number>;  // itemId -> response value
  currentPage: number;
  startedAt: string;       // ISO timestamp
  lastUpdated: string;     // ISO timestamp
}

export interface ScaleScore {
  scaleId: string;
  scaleName: string;
  rawScore: number;
  meanScore: number;       // Raw score / number of items
  percentile?: number;     // If norm data available
}

export interface TestResults {
  testId: string;
  testName: string;
  completedAt: string;     // ISO timestamp
  responses: Record<string, number>;
  scaleScores: ScaleScore[];
}

/**
 * UI State types
 */

export interface TestState {
  battery: TestBattery | null;
  items: Item[];
  currentPage: number;
  totalPages: number;
  responses: Record<string, number>;
  language: string;        // Current display language for items
}

export interface ItemBrowserFilters {
  searchQuery: string;
  scaleFilter: string[];
  languageFilter: string[];
  sortBy: 'id' | 'text' | 'usage';
}
