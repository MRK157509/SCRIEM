const STORAGE_KEY = "scriem_cases";

export function loadCases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCases(cases) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

export function addCase(newCase) {
  const cases = loadCases();
  cases.unshift(newCase);
  saveCases(cases);
}

export function getCaseById(id) {
  return loadCases().find(c => c.id === id);
}
