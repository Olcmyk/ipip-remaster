import type { Item, Scale, TestBattery, Translation, ArchiveCatalog } from './types';

/**
 * Load items data
 */
export async function loadItems(): Promise<Item[]> {
  const response = await fetch('/data/items.json');
  if (!response.ok) {
    throw new Error('Failed to load items');
  }
  return response.json();
}

/**
 * Load a single item by ID
 */
export async function loadItem(itemId: string): Promise<Item | null> {
  const items = await loadItems();
  return items.find(item => item.ids.includes(itemId)) || null;
}

/**
 * Load scales data
 */
export async function loadScales(): Promise<Scale[]> {
  const response = await fetch('/data/scales.json');
  if (!response.ok) {
    throw new Error('Failed to load scales');
  }
  return response.json();
}

/**
 * Load test batteries
 */
export async function loadTestBatteries(): Promise<TestBattery[]> {
  const response = await fetch('/data/test-batteries.json');
  if (!response.ok) {
    throw new Error('Failed to load test batteries');
  }
  return response.json();
}

/**
 * Load a single test battery by ID
 */
export async function loadTestBattery(batteryId: string): Promise<TestBattery | null> {
  const batteries = await loadTestBatteries();
  return batteries.find(b => b.id === batteryId) || null;
}

/**
 * Load translation index
 */
export async function loadTranslationIndex(): Promise<Translation[]> {
  const response = await fetch('/data/translations/index.json');
  if (!response.ok) {
    throw new Error('Failed to load translation index');
  }
  return response.json();
}

/**
 * Load translations for a specific language
 */
export async function loadTranslation(languageCode: string): Promise<Translation | null> {
  try {
    const response = await fetch(`/data/translations/${languageCode}.json`);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to load translation for ${languageCode}:`, error);
    return null;
  }
}

/**
 * Load archive catalog
 */
export async function loadArchiveCatalog(): Promise<ArchiveCatalog> {
  const response = await fetch('/data/archive-catalog.json');
  if (!response.ok) {
    throw new Error('Failed to load archive catalog');
  }
  return response.json();
}

/**
 * Get items for a specific test battery
 */
export async function getTestBatteryItems(batteryId: string): Promise<Item[]> {
  const battery = await loadTestBattery(batteryId);
  if (!battery) {
    throw new Error(`Test battery not found: ${batteryId}`);
  }

  const scales = await loadScales();
  const batteryScales = scales.filter(s => battery.scales.includes(s.id));

  const items = await loadItems();
  const itemIds = new Set<string>();

  // Collect all unique item IDs from the battery's scales
  batteryScales.forEach(scale => {
    scale.items.forEach(item => {
      item.itemIds.forEach(id => itemIds.add(id));
    });
  });

  // Return items in the order they appear in the item list
  return items.filter(item => item.ids.some(id => itemIds.has(id)));
}

/**
 * Get scales for a specific test battery
 */
export async function getTestBatteryScales(batteryId: string): Promise<Scale[]> {
  const battery = await loadTestBattery(batteryId);
  if (!battery) {
    throw new Error(`Test battery not found: ${batteryId}`);
  }

  const scales = await loadScales();
  return scales.filter(s => battery.scales.includes(s.id));
}

/**
 * Search items by text
 */
export async function searchItems(query: string): Promise<Item[]> {
  const items = await loadItems();
  const lowerQuery = query.toLowerCase();

  return items.filter(item =>
    item.text.toLowerCase().includes(lowerQuery) ||
    item.ids.some(id => id.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get items by scale
 */
export async function getItemsByScale(scaleId: string): Promise<Item[]> {
  const scales = await loadScales();
  const scale = scales.find(s => s.id === scaleId);

  if (!scale) {
    return [];
  }

  const items = await loadItems();
  const itemIds = new Set(scale.items.flatMap(i => i.itemIds));

  return items.filter(item => item.ids.some(id => itemIds.has(id)));
}
