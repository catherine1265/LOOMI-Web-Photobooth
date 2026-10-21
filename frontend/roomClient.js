// Talking to the backend (/api/*) and to LiveKit (camera, mic, room metadata).
// The backend only creates/joins meetings, issues tokens and stores the layer order;
// video goes straight from browser to LiveKit and never passes through our API.
import { ConnectionState, Room, RoomEvent, Track } from "livekit-client";
import { IDENTITY_PREFIX, RECONNECT_GRACE_MS } from "../lib/config.js";
import { parsePublicState } from "../lib/roomState.js";

// ---- API calls ----------------------------------------------------------------------

async function postJson(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Network error. Check your connection and try again.");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error(data?.error?.message ?? `Request failed (${res.status})`);
  return data;
}

export const createMeeting = (req) => postJson("/api/meetings", req);
export const joinMeeting = (req) => postJson("/api/meetings/join", req);

// ---- Session storage (per tab; the password is never stored) -----------------------

const sessionKey = (code) => `vc-session:${code}`;

export function saveSession(session) {
  try {
    sessionStorage.setItem(sessionKey(session.code), JSON.stringify(session));
  } catch {}
}

export function loadSession(code) {
  try {
    const s = JSON.parse(sessionStorage.getItem(sessionKey(code)) ?? "null");
    if (!s || typeof s.code !== "string" || typeof s.identity !== "string" || typeof s.token !== "string") return null;
    return { code: s.code, identity: s.identity, name: s.name ?? "", token: s.token, url: s.url ?? "", rejoinKey: s.rejoinKey ?? "" };
  } catch {
    return null;
  }
}

function clearSession(code) {
  try {
    sessionStorage.removeItem(sessionKey(code));
  } catch {}
}

// ---- Camera/audio (LiveKit) ------------------------------------------------------------

function createHiddenContainer() {
  const div = document.createElement("div");
  div.setAttribute("aria-hidden", "true");
  div.style.cssText = "position:fixed;left:-10000px;top:0;width:2px;height:2px;overflow:hidden;opacity:0;pointer-events:none;";
  document.body.appendChild(div);
  return div;
}

function createVideoElement() {
  const v = document.createElement("video");
  v.muted = true;
  v.autoplay = true;
  v.playsInline = true;
  return v;
}

// Publishes the local camera + mic and keeps a hidden <video> per participant for the compositor.
function createVideoSource(room) {
  const listeners = new Set();
  const videos = new Map();
  let container = null;
  let cameraOn = false;
  let error = null;

  const notify = () => listeners.forEach((l) => l());
  const host = () => (container ??= createHiddenContainer());

  function participantFor(identity) {
    if (room.localParticipant.identity === identity) return room.localParticipant;
    return room.remoteParticipants.get(identity);
  }

  const onSubscribed = (track) => {
    if (track.kind === Track.Kind.Audio) host().appendChild(track.attach());
  };
  const onUnsubscribed = (track) => {
    if (track.kind === Track.Kind.Audio) track.detach().forEach((el) => el.remove());
  };
  const onParticipantLeft = (p) => {
    const entry = videos.get(p.identity);
    if (!entry) return;
    entry.el.srcObject = null;
    entry.el.remove();
    videos.delete(p.identity);
  };
  const onMediaError = (e) => {
    cameraOn = false;
    error = `Camera/microphone unavailable: ${e.message}`;
    notify();
  };
  room.on(RoomEvent.TrackSubscribed, onSubscribed);
  room.on(RoomEvent.TrackUnsubscribed, onUnsubscribed);
  room.on(RoomEvent.ParticipantDisconnected, onParticipantLeft);
  room.on(RoomEvent.MediaDevicesError, onMediaError);

  async function setCameraEnabled(on) {
    try {
      await room.localParticipant.setCameraEnabled(on);
      cameraOn = on && room.localParticipant.isCameraEnabled;
      if (on) error = null;
    } catch (e) {
      cameraOn = false;
      error = `Camera unavailable (${e instanceof Error ? e.message : "unknown error"}). Others will see a placeholder.`;
    }
    notify();
  }

  return {
    get cameraOn() {
      return cameraOn;
    },
    get error() {
      return error;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async start() {
      await setCameraEnabled(true);
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {}
      for (const p of room.remoteParticipants.values()) {
        for (const pub of p.audioTrackPublications.values()) if (pub.track) onSubscribed(pub.track);
      }
    },
    stop() {
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
      room.off(RoomEvent.TrackUnsubscribed, onUnsubscribed);
      room.off(RoomEvent.ParticipantDisconnected, onParticipantLeft);
      room.off(RoomEvent.MediaDevicesError, onMediaError);
      videos.forEach(({ el }) => (el.srcObject = null));
      videos.clear();
      container?.remove();
      container = null;
    },
    getVideo(identity) {
      const pub = participantFor(identity)?.getTrackPublication(Track.Source.Camera);
      const track = pub?.track;
      if (!pub || !track || pub.isMuted) return null;
      let entry = videos.get(identity);
      if (!entry) {
        entry = { el: createVideoElement() };
        host().appendChild(entry.el);
        videos.set(identity, entry);
      }
      if (entry.trackSid !== track.sid) {
        track.attach(entry.el);
        entry.trackSid = track.sid;
      }
      return entry.el;
    },
    setCameraEnabled,
  };
}

// ---- Room client ---------------------------------------------------------------------

const TOKEN_REFRESH_INTERVAL_MS = 4 * 60 * 1000;
const SYNC_DEBOUNCE_MS = 300;
const CONSISTENCY_SYNC_MIN_INTERVAL_MS = 2000;

function mapConnection(state) {
  switch (state) {
    case ConnectionState.Connected:
      return "connected";
    case ConnectionState.Connecting:
      return "connecting";
    case ConnectionState.Reconnecting:
    case ConnectionState.SignalReconnecting:
      return "reconnecting";
    default:
      return "disconnected";
  }
}

// Reads the layer stack from LiveKit room metadata; all changes go through the API.
export class RoomClient {
  listeners = new Set();
  snapshot = { connection: "connecting", state: null, present: [], cameraOn: false, notice: null, ended: false };
  room = new Room({ adaptiveStream: false, dynacast: true });
  closed = false;
  syncTimer = null;
  graceTimer = null;
  refreshTimer = null;
  lastConsistencySync = 0;

  constructor(session) {
    this.session = session;
    this.video = createVideoSource(this.room);
    this.video.onChange(() => this.patch({ cameraOn: this.video.cameraOn, notice: this.video.error }));
    const r = this.room;
    r.on(RoomEvent.RoomMetadataChanged, (metadata) => this.onMetadata(metadata));
    r.on(RoomEvent.ConnectionStateChanged, (state) => this.patch({ connection: mapConnection(state) }));
    r.on(RoomEvent.Reconnected, () => {
      this.onMetadata(r.metadata);
      this.updatePresence();
      this.syncNow();
    });
    r.on(RoomEvent.ParticipantConnected, () => this.onPresenceChanged());
    r.on(RoomEvent.ParticipantDisconnected, () => this.onPresenceChanged());
    r.on(RoomEvent.Disconnected, () => {
      if (!this.closed) this.patch({ connection: "disconnected", notice: "Disconnected from the meeting." });
    });
  }

  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.snapshot;

  async connect() {
    this.patch({ connection: "connecting" });
    try {
      await this.room.connect(this.session.url, this.session.token);
    } catch (e) {
      if (!this.closed) {
        this.patch({ connection: "disconnected", notice: `Could not connect: ${e instanceof Error ? e.message : "unknown error"}` });
      }
      return;
    }
    if (this.closed) {
      await this.room.disconnect();
      return;
    }
    this.onMetadata(this.room.metadata);
    this.updatePresence();
    this.room.startAudio().catch(() => undefined);
    this.video.start();
    await this.syncNow();
    this.refreshTimer = setInterval(() => this.refreshToken(), TOKEN_REFRESH_INTERVAL_MS);
  }

  async disconnect() {
    this.closed = true;
    clearTimeout(this.syncTimer);
    clearTimeout(this.graceTimer);
    clearInterval(this.refreshTimer);
    this.video.stop();
    await this.room.disconnect();
  }

  async leave() {
    await this.disconnect();
    await this.post("leave");
    clearSession(this.session.code);
  }

  reorder(order) {
    return this.post("reorder", { order });
  }

  transferHost(identity) {
    return this.post("host", { identity });
  }

  setCameraEnabled(on) {
    return this.video.setCameraEnabled(on);
  }

  getVideoElement(identity) {
    return this.video.getVideo(identity);
  }

  patch(update) {
    this.snapshot = { ...this.snapshot, ...update };
    for (const listener of this.listeners) listener();
  }

  // Ignores API responses that are older than the state we already have.
  adoptState(state) {
    if (!state) return;
    if (this.snapshot.state && state.rev < this.snapshot.state.rev) return;
    this.patch({ state });
  }

  updatePresence() {
    const ids = [this.room.localParticipant.identity, ...this.room.remoteParticipants.keys()];
    this.patch({ present: ids.filter((id) => id.startsWith(IDENTITY_PREFIX)) });
  }

  // Only the host (or anyone, if the host is gone) asks the server to sync, to avoid flooding the API.
  shouldDriveSync() {
    const state = this.snapshot.state;
    if (!state || !state.hostIdentity) return true;
    return state.hostIdentity === this.session.identity || !this.snapshot.present.includes(state.hostIdentity);
  }

  scheduleSync() {
    if (this.closed || this.syncTimer) return;
    this.syncTimer = setTimeout(() => {
      this.syncTimer = null;
      this.syncNow();
    }, SYNC_DEBOUNCE_MS);
  }

  onPresenceChanged() {
    this.updatePresence();
    if (this.shouldDriveSync()) this.scheduleSync();
  }

  onMetadata(raw) {
    const state = parsePublicState(raw);
    if (!state) return;
    this.adoptState(state);
    this.checkConsistency();
    this.scheduleGraceExpiry();
  }

  // If the stack disagrees with who is actually connected, ask the server to fix it.
  checkConsistency() {
    const state = this.snapshot.state;
    if (!state || !this.shouldDriveSync()) return;
    const inStack = new Set(state.stack.filter((e) => e.absentSince === undefined).map((e) => e.identity));
    const present = new Set(this.snapshot.present);
    const consistent = inStack.size === present.size && [...present].every((id) => inStack.has(id));
    const now = Date.now();
    if (!consistent && now - this.lastConsistencySync > CONSISTENCY_SYNC_MIN_INTERVAL_MS) {
      this.lastConsistencySync = now;
      this.scheduleSync();
    }
  }

  // Re-sync when someone's reconnect grace period runs out, so they get removed.
  scheduleGraceExpiry() {
    clearTimeout(this.graceTimer);
    this.graceTimer = null;
    const absent = this.snapshot.state?.stack.filter((e) => e.absentSince !== undefined) ?? [];
    if (absent.length === 0 || this.closed) return;
    const earliest = Math.min(...absent.map((e) => e.absentSince));
    const delay = Math.max(earliest + RECONNECT_GRACE_MS + 500 - Date.now(), 500);
    this.graceTimer = setTimeout(() => {
      this.graceTimer = null;
      if (this.shouldDriveSync()) this.syncNow();
    }, delay);
  }

  syncNow() {
    return this.post("sync");
  }

  capture(body) {
    return this.post("capture", body);
  }

  async refreshToken() {
    try {
      const res = await fetch("/api/token/refresh", {
        method: "POST",
        headers: { authorization: `Bearer ${this.session.token}` },
      });
      if (!res.ok) return;
      const { token } = await res.json();
      this.session = { ...this.session, token };
      saveSession(this.session);
    } catch {}
  }

  async post(path, body) {
    try {
      const sentAt = Date.now();
      const res = await fetch(`/api/rooms/${encodeURIComponent(this.session.code)}/${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${this.session.token}`, "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json().catch(() => null);
      if (Number.isFinite(data?.serverTime)) this.clockOffset = data.serverTime - (sentAt + Date.now()) / 2;
      this.adoptState(data?.state);
      if (res.ok) return { ok: true };
      if (res.status === 404) this.patch({ ended: true, notice: "This meeting has ended." });
      return { ok: false, message: data?.error?.message ?? `Request failed (${res.status})` };
    } catch {
      return { ok: false, message: "Network error. Check your connection." };
    }
  }
}
