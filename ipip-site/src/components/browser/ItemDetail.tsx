import { useState, useEffect, useRef } from 'react';
import type { Item, Scale, Translation } from '../../lib/types';

interface Props {
  item: Item;
  scales: Scale[];
  availableLanguages: Translation[];
}

interface BatteryLanguage {
  code: string;
  name: string;
  itemCount: number;
  battery?: string;
}

// Detect which battery an item belongs to based on its scales
// Prioritize batteries that are known to have translations
function detectItemBattery(item: Item, scales: Scale[]): string | null {
  if (!scales || scales.length === 0) return null;

  // Priority order for batteries with translations
  const priorityBatteries = ['bigfive5broad', 'neodomains', 'neofacets', 'neo'];

  // First, try to find a scale from a priority battery
  for (const priority of priorityBatteries) {
    const scale = scales.find(s => s.id.startsWith(priority));
    if (scale) {
      return priority;
    }
  }

  // If no priority battery found, use the first scale's battery
  const scaleId = scales[0].id;
  const batteryId = scaleId.split('-')[0];
  return batteryId;
}

export default function ItemDetail({ item, scales, availableLanguages }: Props) {
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [batteryId, setBatteryId] = useState<string | null>(null);
  const [availableBatteryLanguages, setAvailableBatteryLanguages] = useState<BatteryLanguage[]>([]);
  const [languagesWithThisItem, setLanguagesWithThisItem] = useState<BatteryLanguage[]>([]);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    }

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showLanguageMenu]);

  // Detect battery and load available languages for this battery
  useEffect(() => {
    const battery = detectItemBattery(item, scales);
    setBatteryId(battery);

    if (!battery) {
      setAvailableBatteryLanguages([]);
      return;
    }

    fetch('/data/translations/battery-translations.json')
      .then(res => res.json())
      .then(data => {
        const batteryData = data[battery];

        // If battery not found in translations, try to find this item in other batteries
        if (!batteryData) {
          // Check all batteries to see which ones might have this item
          const allLanguages: BatteryLanguage[] = [];
          const checkedLanguages = new Set<string>();

          for (const [batteryKey, batteryInfo] of Object.entries(data)) {
            if (batteryInfo && typeof batteryInfo === 'object' && 'availableLanguages' in batteryInfo && 'metadata' in batteryInfo) {
              const langs = (batteryInfo as any).availableLanguages.map((code: string) => ({
                code,
                name: (batteryInfo as any).metadata[code].name,
                itemCount: (batteryInfo as any).metadata[code].itemCount,
                battery: batteryKey
              }));
              langs.forEach((lang: any) => {
                if (!checkedLanguages.has(lang.code)) {
                  checkedLanguages.add(lang.code);
                  allLanguages.push(lang);
                }
              });
            }
          }

          setAvailableBatteryLanguages(allLanguages);
          return;
        }

        if (batteryData) {
          // Handle the new structure with availableLanguages and metadata
          if (batteryData.availableLanguages && batteryData.metadata) {
            const languages = batteryData.availableLanguages.map((code: string) => ({
              code,
              name: batteryData.metadata[code].name,
              itemCount: batteryData.metadata[code].itemCount
            }));
            setAvailableBatteryLanguages(languages);
          }
          // Handle old array structure for other batteries
          else if (Array.isArray(batteryData)) {
            const languages = batteryData.map((lang: any) => ({
              code: lang.languageCode,
              name: lang.languageName,
              itemCount: lang.itemCount
            }));
            setAvailableBatteryLanguages(languages);
          }
        } else {
          setAvailableBatteryLanguages([]);
        }
      })
      .catch(() => {
        setAvailableBatteryLanguages([]);
      });
  }, [item, scales]);

  // Check which languages actually have this specific item translated
  useEffect(() => {
    if (availableBatteryLanguages.length === 0 || !batteryId) {
      setLanguagesWithThisItem([]);
      return;
    }

    const itemId = item.ids[0];
    const checkPromises = availableBatteryLanguages.map(async (lang) => {
      const batteriesToTry = lang.battery
        ? [lang.battery]
        : [batteryId, 'bigfive5broad', 'neodomains', 'neofacets', 'neo'];

      for (const battery of batteriesToTry) {
        try {
          const response = await fetch(`/data/translations/${lang.code}-${battery}.json`);
          if (response.ok) {
            const data = await response.json();
            if (data.translations && data.translations[itemId]) {
              return { ...lang, translationText: data.translations[itemId], battery };
            }
          }
        } catch (err) {
          // Continue to next battery
        }
      }
      return null;
    });

    Promise.all(checkPromises).then(results => {
      const validLanguages = results.filter((r): r is BatteryLanguage & { translationText: string } => r !== null);
      setLanguagesWithThisItem(validLanguages);
    });
  }, [availableBatteryLanguages, batteryId, item.ids]);

  // Load translation when language is selected
  useEffect(() => {
    if (!selectedLanguage) {
      setTranslationText('');
      return;
    }

    const selectedLang = languagesWithThisItem.find(l => l.code === selectedLanguage);
    if (!selectedLang) {
      setTranslationText('');
      return;
    }

    setLoading(true);

    // Use the pre-verified translation
    const langWithTranslation = selectedLang as BatteryLanguage & { translationText: string };
    setTranslationText(langWithTranslation.translationText);
    setLoading(false);
  }, [selectedLanguage, languagesWithThisItem]);

  const hasTranslations = languagesWithThisItem.length > 0;

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
    setShowLanguageMenu(false);
  };

  const currentDisplayLanguage = selectedLanguage
    ? languagesWithThisItem.find(l => l.code === selectedLanguage)?.name
    : 'English';

  const currentDisplayText = selectedLanguage && translationText
    ? translationText
    : item.text;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <a href="/items" className="text-blue-600 hover:underline">
          ← Back to Item Browser
        </a>
      </div>

      {/* Item Header */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-sm font-medium text-gray-500 block mb-2">Item ID</span>
            <div className="flex items-center gap-2 flex-wrap">
              {item.ids.map((id, index) => (
                <h1 key={id} className="text-3xl font-bold text-blue-600 font-mono">
                  {id}{index < item.ids.length - 1 ? ',' : ''}
                </h1>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-medium text-gray-500">Item Text</span>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => hasTranslations && setShowLanguageMenu(!showLanguageMenu)}
                disabled={!hasTranslations}
                className={`px-3 py-1 text-sm font-medium rounded-lg border transition-colors ${
                  hasTranslations
                    ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed'
                }`}
              >
                {hasTranslations ? `${currentDisplayLanguage} ▼` : 'No other languages'}
              </button>

              {showLanguageMenu && hasTranslations && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
                  <button
                    onClick={() => {
                      setSelectedLanguage(null);
                      setShowLanguageMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                      !selectedLanguage ? 'bg-blue-50 font-medium' : ''
                    }`}
                  >
                    English
                  </button>
                  {languagesWithThisItem.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleLanguageSelect(lang.code)}
                      className={`w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors ${
                        selectedLanguage === lang.code ? 'bg-blue-50 font-medium' : ''
                      }`}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            {loading ? (
              <p className="text-gray-600">Loading translation...</p>
            ) : (
              <p className="text-xl text-gray-900">{currentDisplayText}</p>
            )}
          </div>
        </div>
      </div>

      {/* Scales Using This Item */}
      {scales.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Used in {scales.length} Scale{scales.length !== 1 ? 's' : ''}
          </h2>

          <div className="space-y-3">
            {scales.map(scale => {
              const scaleItem = scale.items.find(i => i.itemIds.some(id => item.ids.includes(id)));
              const keying = scaleItem?.keying;

              return (
                <div
                  key={scale.id}
                  className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900">{scale.name}</h3>
                      <p className="text-sm text-gray-600">{scale.instrument}</p>
                      {scale.alpha && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reliability (α): {scale.alpha.toFixed(2)}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {keying === 1 ? (
                        <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                          + keyed
                        </span>
                      ) : keying === -1 ? (
                        <span className="inline-block px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded">
                          − keyed
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Keying Explanation */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-bold text-gray-900 mb-2">About Keying</h3>
        <p className="text-sm text-gray-700">
          <strong>+ keyed</strong> items are scored as-is (1-5). <strong>− keyed</strong> items
          are reverse-scored (5-1). This ensures that higher scores on a scale consistently
          indicate higher levels of the trait being measured.
        </p>
      </div>
    </div>
  );
}
