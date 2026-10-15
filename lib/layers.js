import { RECONNECT_GRACE_MS } from "./config.js";

// stack[0] is the top layer; the last entry is the bottom layer (the background).

function indexOf(stack, identity) {
  return identity === null ? -1 : stack.findIndex((e) => e.identity === identity);
}

function present(entry) {
  return { identity: entry.identity, name: entry.name, joinedAt: entry.joinedAt };
}

function dedupe(stack) {
  const seen = new Set();
  return stack.filter((e) => {
    if (seen.has(e.identity)) return false;
    seen.add(e.identity);
    return true;
  });
}

function pickNextHost(stack, exclude) {
  let best = null;
  for (const entry of stack) {
    if (entry.absentSince !== undefined || entry.identity === exclude) continue;
    if (!best || entry.joinedAt < best.joinedAt) best = entry;
  }
  return best ? best.identity : null;
}

function insertParticipant(state, entry) {
  const stack = state.stack.slice();
  const existing = indexOf(stack, entry.identity);
  if (existing >= 0) stack[existing] = present({ ...stack[existing], name: entry.name || stack[existing].name });
  else stack.unshift(present(entry));
  return { hostIdentity: state.hostIdentity, stack };
}

export function removeParticipant(state, identity) {
  if (indexOf(state.stack, identity) < 0) {
    return state.hostIdentity === identity ? { ...state, hostIdentity: null } : state;
  }
  const stack = state.stack.filter((e) => e.identity !== identity);
  if (state.hostIdentity !== identity) return { hostIdentity: state.hostIdentity, stack };
  const next = pickNextHost(stack);
  const hostless = { hostIdentity: null, stack };
  return next ? transferHost(hostless, next) : hostless;
}

export function moveLayer(stack, from, to) {
  const out = stack.slice();
  if (from < 0 || from >= out.length || to < 0 || to >= out.length || from === to) return out;
  const [item] = out.splice(from, 1);
  out.splice(to, 0, item);
  return out;
}

export function transferHost(state, newHost) {
  const index = indexOf(state.stack, newHost);
  if (index < 0) return state;
  const stack = [state.stack[index], ...state.stack.filter((_, i) => i !== index)];
  return { hostIdentity: newHost, stack };
}

export function validateOrder(stack, order) {
  if (new Set(order).size !== order.length) return "duplicate";
  if (order.length !== stack.length) return "mismatch";
  const ids = new Set(stack.map((e) => e.identity));
  return order.every((id) => ids.has(id)) ? null : "mismatch";
}

export function applyOrder(stack, order) {
  const byId = new Map(stack.map((e) => [e.identity, e]));
  return order.map((id) => byId.get(id));
}

export function reconcileWithPresence(state, presence, now, keepAbsentHost = false) {
  const presentById = new Map();
  for (const p of presence) if (!presentById.has(p.identity)) presentById.set(p.identity, p);

  const expired = [];
  const stack = dedupe(state.stack).map((entry) => {
    const p = presentById.get(entry.identity);
    if (p) return present({ ...entry, name: p.name || entry.name });
    if (entry.absentSince === undefined) return { ...entry, absentSince: now };
    if (now - entry.absentSince >= RECONNECT_GRACE_MS) expired.push(entry.identity);
    return entry;
  });
  let next = { hostIdentity: state.hostIdentity, stack };
  for (const id of expired) next = removeParticipant(next, id);

  const known = new Set(next.stack.map((e) => e.identity));
  const newcomers = [...presentById.values()]
    .filter((p) => !known.has(p.identity))
    .sort((a, b) => {
      if (a.identity === next.hostIdentity) return -1;
      if (b.identity === next.hostIdentity) return 1;
      return a.joinedAt - b.joinedAt;
    });
  for (const p of newcomers) next = insertParticipant(next, p);

  const host = next.hostIdentity;
  if (host === null || !presentById.has(host)) {
    const hostNeverArrived = host !== null && indexOf(next.stack, host) < 0;
    if (!(hostNeverArrived && keepAbsentHost)) {
      const candidate = pickNextHost(next.stack, host ?? undefined);
      if (candidate) next = transferHost(next, candidate);
    }
  }
  return next;
}

export function sameLayerState(a, b) {
  if (a.hostIdentity !== b.hostIdentity || a.stack.length !== b.stack.length) return false;
  return a.stack.every((e, i) => {
    const o = b.stack[i];
    return e.identity === o.identity && e.name === o.name && e.joinedAt === o.joinedAt && e.absentSince === o.absentSince;
  });
}
