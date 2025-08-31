/**
 * Immutable utility functions for safe state updates
 * Prevents "readonly property" errors by ensuring proper deep copying
 */

/**
 * Deep clone an object to prevent mutations
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item)) as T;
  }

  if (typeof obj === "object") {
    const cloned = {} as T;
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }

  return obj;
}

/**
 * Safely update an object property
 */
export function updateProperty<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  key: K,
  value: T[K]
): T {
  return {
    ...deepClone(obj),
    [key]: value
  };
}

/**
 * Safely update an array item
 */
export function updateArrayItem<T>(
  array: readonly T[],
  index: number,
  updater: (item: T) => T
): T[] {
  const newArray = [...array];
  newArray[index] = updater(deepClone(newArray[index]));
  return newArray;
}

/**
 * Safely update an array item by ID
 */
export function updateArrayItemById<T extends { id: string }>(
  array: readonly T[],
  id: string,
  updater: (item: T) => T
): T[] {
  return array.map(item => 
    item.id === id ? updater(deepClone(item)) : deepClone(item)
  );
}

/**
 * Safely add an item to an array
 */
export function addToArray<T>(array: readonly T[], item: T): T[] {
  return [...array, deepClone(item)];
}

/**
 * Safely remove an item from an array by ID
 */
export function removeFromArrayById<T extends { id: string }>(
  array: readonly T[],
  id: string
): T[] {
  return array.filter(item => item.id !== id);
}

/**
 * Create a safe state updater function
 */
export function createStateUpdater<T>(setState: (updaterFunc: (current: T) => T) => void) {
  return (updater: (current: T) => T) => {
    setState((current: T) => deepClone(updater(current)));
  };
}