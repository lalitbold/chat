import { firebaseConfig } from "../firebase-config.js";

export async function signInAnonymously(apiKey = firebaseConfig.apiKey) {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnSecureToken: true }),
    }
  );
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Anonymous Firebase sign-in failed.");
  }

  return {
    idToken: payload.idToken,
    uid: payload.localId,
  };
}

export function roomPath(roomId) {
  return `projects/${firebaseConfig.projectId}/databases/(default)/documents/rooms/${encodeURIComponent(roomId)}`;
}

export async function getDocument({ token, name }) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${name}`, {
    method: "GET",
    headers: firestoreHeaders(token),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not load Firestore document.");
  }

  return parseDocument(payload);
}

export async function createDocument({ token, path, fields }) {
  const response = await fetch(`https://firestore.googleapis.com/v1/${path}`, {
    method: "POST",
    headers: firestoreHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not create Firestore document.");
  }

  return parseDocument(payload);
}

export async function patchDocument({ token, name, fields }) {
  const fieldNames = Object.keys(fields);
  const updateMask = fieldNames
    .map((fieldPath) => `updateMask.fieldPaths=${encodeURIComponent(fieldPath)}`)
    .join("&");
  const response = await fetch(`https://firestore.googleapis.com/v1/${name}?${updateMask}`, {
    method: "PATCH",
    headers: firestoreHeaders(token),
    body: JSON.stringify({ fields: toFirestoreFields(fields) }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not update Firestore document.");
  }

  return parseDocument(payload);
}

export async function runCollectionQuery({ token, parentPath, collectionId, where, orderBy, limit }) {
  const structuredQuery = {
    from: [{ collectionId }],
  };

  if (where) {
    structuredQuery.where = where;
  }

  if (orderBy) {
    structuredQuery.orderBy = orderBy;
  }

  if (limit) {
    structuredQuery.limit = limit;
  }

  const response = await fetch(`https://firestore.googleapis.com/v1/${parentPath}:runQuery`, {
    method: "POST",
    headers: firestoreHeaders(token),
    body: JSON.stringify({ structuredQuery }),
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(getFirestoreErrorMessage(payload, `Could not load ${collectionId}.`));
  }

  return payload.filter((row) => row.document).map((row) => parseDocument(row.document));
}

export function parseDocument(document) {
  const fields = document.fields || {};
  const id = document.name.split("/").pop();
  const data = { id, name: document.name };

  for (const [key, value] of Object.entries(fields)) {
    data[key] = parseFirestoreValue(value);
  }

  return data;
}

export function toFirestoreFields(data) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toFirestoreValue(value)])
  );
}

export function toFirestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) {
    return value.length > 0 ? { arrayValue: { values: value.map(toFirestoreValue) } } : { arrayValue: {} };
  }
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "object") return { mapValue: { fields: toFirestoreFields(value) } };
  return { stringValue: String(value) };
}

export function parseFirestoreValue(value) {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(parseFirestoreValue);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, nestedValue]) => [
        key,
        parseFirestoreValue(nestedValue),
      ])
    );
  }
  return undefined;
}

function firestoreHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function getFirestoreErrorMessage(payload, fallback) {
  if (payload?.error?.message) {
    return payload.error.message;
  }

  if (Array.isArray(payload)) {
    const rowError = payload.find((row) => row?.error?.message)?.error?.message;

    if (rowError) {
      return rowError;
    }
  }

  return fallback;
}
