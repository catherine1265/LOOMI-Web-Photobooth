const STORAGE_KEY = "loomi.resultPhoto";
let resultPhoto = null;
let persistenceWarning = false;
try { resultPhoto = sessionStorage.getItem(STORAGE_KEY); } catch {}

export function setResultPhoto(photo) {
  resultPhoto = photo;
  try {
    sessionStorage.setItem(STORAGE_KEY, photo);
    persistenceWarning = false;
  } catch {
    try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
    persistenceWarning = true;
  }
}

export function hasResultPersistenceWarning() { return persistenceWarning; }

export function getResultPhoto() {
  return resultPhoto;
}

export function clearResultPhoto() {
  resultPhoto = null;
  try { sessionStorage.removeItem(STORAGE_KEY); } catch {}
  persistenceWarning = false;
}
