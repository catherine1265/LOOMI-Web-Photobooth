import LandingPage from "./pages/LandingPage/LandingPage";
import PhotoType from "./pages/PhotoType/PhotoType";
import ColabPhoto from "./pages/PhotoType/components/ColabPhoto/ColabPhoto";
import SelfPhoto from "./pages/PhotoType/components/SelfPhoto/SelfPhoto";
import EditPage from "./pages/EditPage/EditPage";
import FrameType from "./pages/PhotoType/components/FrameType/FrameType";
import UploadPhoto from "./pages/PhotoType/components/UploadPhoto/UploadPhoto";
import ResultPhoto from "./pages/ResultPhoto/ResultPhoto.jsx";

import { StrictMode, useEffect, useId, useState } from "react";
import { createRoot } from "react-dom/client";

import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../lib/config.js";

import { RoomScreen } from "./RoomScreen.jsx";

import {
  createMeeting,
  joinMeeting,
  loadSession,
  saveSession,
} from "./roomClient.js";

import {
  CopyButton,
  inputClass,
  navigate,
  primaryButton,
} from "./ui.jsx";

import "./index.css";

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [search, setSearch] = useState(window.location.search);
  const [afterFrameType, setAfterFrameType] = useState(null);
  const [frameType, setFrameType] = useState(null);

  useEffect(() => {
    const onPop = () => {
      setPath(window.location.pathname);
      setSearch(window.location.search);
    };

    window.addEventListener("popstate", onPop);

    return () => {
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  const match = /^\/room\/([^/]+)\/?$/.exec(path);
  const code = match ? decodeURIComponent(match[1]) : null;

  const isLandingPage =
    (path === "/" || path === "") &&
    !new URLSearchParams(search).has("join");

  const isPhotoType = path === "/photo-type";
  const isSelfPhoto = path === "/self-photo";
  const isColabPhoto = path === "/colab-photo";
  const isFrameType = path === "/frame-type";
  const isEdit = path === "/edit";
  const isUploadPhoto = path === "/upload-photo";
  const isResultPhoto = path === "/result-photo";

  function navigateInternal(nextPath) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    setSearch("");
  }

  function chooseFrameThen(nextPath) {
    setAfterFrameType(nextPath);
    navigateInternal("/frame-type");
  }

  useEffect(() => {
    document.title = code
      ? `Meeting ${code} · LOOMI`
      : isLandingPage
        ? "LOOMI — Make Memories Together"
        : isSelfPhoto
          ? "LOOMI — Self Photo"
          : isColabPhoto
            ? "LOOMI — Colab Photo"
            : isUploadPhoto
              ? "LOOMI — Upload Photo"
              : isEdit
                ? "LOOMI — Edit Photo"
                : isFrameType
                  ? "LOOMI — Choose Frame Type"
                  : isPhotoType
                    ? "LOOMI — Choose Photo Type"
                    : isResultPhoto
                      ? "LOOMI — Your Photo"
                      : "LOOMI";
  }, [
    code,
    isLandingPage,
    isSelfPhoto,
    isColabPhoto,
    isUploadPhoto,
    isEdit,
    isFrameType,
    isPhotoType,
    isResultPhoto,
  ]);

  if (code) {
    return (
      <RoomScreen
        key={code}
        code={code}
        frameType={frameType}
        onDone={() => navigateInternal("/edit")}
      />
    );
  }

  if (isLandingPage) {
    return (
      <LandingPage
        onGetStarted={() => navigateInternal("/photo-type")}
        onSelfPhoto={() => navigateInternal("/self-photo")}
        onColabPhoto={() => navigateInternal("/colab-photo")}
      />
    );
  }

  if (isSelfPhoto) {
    return (
      <SelfPhoto
        frameType={frameType}
        onDone={() => navigateInternal("/edit")}
        onBack={() => navigateInternal("/photo-type")}
      />
    );
  }

  if (isColabPhoto) {
    return (
      <ColabPhoto
        onEnterRoom={(roomCode) =>
          chooseFrameThen(`/room/${roomCode}`)
        }
        onBack={() => navigateInternal("/photo-type")}
      />
    );
  }

  if (isUploadPhoto) {
    return (
      <UploadPhoto
        frameType={frameType}
        onContinue={() => navigateInternal("/edit")}
        onBack={() => chooseFrameThen("/upload-photo")}
      />
    );
  }

  if (isEdit) {
    return (
      <EditPage
        onEmpty={() => navigateInternal("/photo-type")}
        onRetake={(id) => {
          if (id) {
            setFrameType(id);
          }

          navigateInternal("/self-photo");
        }}
        onDone={() => navigateInternal("/result-photo")}
      />
    );
  }

  if (isResultPhoto) {
    return (
      <ResultPhoto
        onGetAnother={() => {
          setFrameType(null);
          navigateInternal("/photo-type");
        }}
      />
    );
  }

  if (isFrameType) {
    return (
      <FrameType
        onBack={() =>
          navigateInternal(
            afterFrameType?.startsWith("/room/")
              ? "/colab-photo"
              : "/photo-type"
          )
        }
        onSelect={(id) => {
          setFrameType(id);
          navigateInternal(afterFrameType ?? "/self-photo");
        }}
      />
    );
  }

  if (isPhotoType) {
    return (
      <PhotoType
        onBack={() => navigateInternal("/")}
        onSelfPhoto={() => chooseFrameThen("/self-photo")}
        onColabPhoto={() => navigateInternal("/colab-photo")}
        onEditPhoto={() => chooseFrameThen("/upload-photo")}
      />
    );
  }

  return <HomeScreen />;
}

// ---- Home screen (create / join) ----

function Field({ label, hint, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>

      {children(id, hintId)}

      {hint && (
        <p
          id={hintId}
          className="text-xs text-slate-500 dark:text-slate-400"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

function HomeScreen() {
  const [mode, setMode] = useState("create");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    const join = new URLSearchParams(
      window.location.search
    ).get("join");

    if (join && /^\d+$/.test(join)) {
      setMode("join");
      setCode(join);
    }
  }, []);

  function switchMode(next) {
    setMode(next);
    setError(null);
  }

  async function onCreate(e) {
    e.preventDefault();
    setError(null);

    if (password.length < PASSWORD_MIN_LENGTH) {
      setError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
      );
      return;
    }

    setBusy(true);

    try {
      const session = await createMeeting({ name, password });
      saveSession(session);
      setCreated({ session, password });
    } catch (err) {
      setError(err.message || "Could not create the meeting.");
    } finally {
      setBusy(false);
    }
  }

  async function onJoin(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const cleanCode = code.replace(/\s+/g, "");

    try {
      const previous = loadSession(cleanCode);

      const session = await joinMeeting({
        code: cleanCode,
        password,
        name,
        identity: previous?.identity,
        rejoinKey: previous?.rejoinKey,
      });

      saveSession(session);
      navigate(`/room/${session.code}`);
    } catch (err) {
      setError(err.message || "Could not join the meeting.");
      setBusy(false);
    }
  }

  if (created) {
    const invite = `Meeting code: ${created.session.code}, password: ${created.password}`;

    return (
      <HomeShell>
        <section
          aria-labelledby="created-title"
          className="space-y-5"
        >
          <h2
            id="created-title"
            className="text-lg font-semibold"
          >
            Meeting created
          </h2>

          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Meeting code
            </p>

            <p className="font-mono text-4xl font-bold tracking-[0.2em]">
              {created.session.code}
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="invite"
              className="block text-sm font-medium"
            >
              Invite text
            </label>

            <textarea
              id="invite"
              readOnly
              rows={2}
              value={invite}
              className={`${inputClass} resize-none font-mono text-sm`}
              onFocus={(e) => e.currentTarget.select()}
            />

            <CopyButton text={invite} label="Copy invite" />

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Share it privately. The password is not shown again
              once you leave this page.
            </p>
          </div>

          <button
            type="button"
            className={primaryButton}
            onClick={() => navigate(`/room/${created.session.code}`)}
          >
            Enter room
          </button>
        </section>
      </HomeShell>
    );
  }

  return (
    <HomeShell>
      <div
        role="tablist"
        aria-label="Meeting action"
        className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
      >
        {["create", "join"].map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            id={`tab-${m}`}
            aria-selected={mode === m}
            aria-controls={`panel-${m}`}
            onClick={() => switchMode(m)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === m
                ? "bg-white text-slate-900 shadow dark:bg-slate-950 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
            }`}
          >
            {m === "create" ? "Create meeting" : "Join meeting"}
          </button>
        ))}
      </div>

      <form
        id={`panel-${mode}`}
        role="tabpanel"
        aria-labelledby={`tab-${mode}`}
        onSubmit={mode === "create" ? onCreate : onJoin}
        className="space-y-4"
        noValidate
      >
        {mode === "join" && (
          <Field label="Meeting code">
            {(id) => (
              <input
                id={id}
                name="code"
                inputMode="numeric"
                autoComplete="off"
                required
                pattern="[0-9 ]*"
                placeholder="123456"
                value={code}
                onChange={(e) =>
                  setCode(e.target.value.replace(/[^\d ]/g, ""))
                }
                className={`${inputClass} font-mono tracking-widest`}
              />
            )}
          </Field>
        )}

        <Field label="Your display name">
          {(id) => (
            <input
              id={id}
              name="name"
              autoComplete="nickname"
              required
              maxLength={NAME_MAX_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          )}
        </Field>

        <Field
          label={mode === "create" ? "Choose a password" : "Password"}
          hint={
            mode === "create"
              ? `At least ${PASSWORD_MIN_LENGTH} characters.`
              : undefined
          }
        >
          {(id, hintId) => (
            <div className="relative">
              <input
                id={id}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "create"
                    ? "new-password"
                    : "current-password"
                }
                required
                minLength={
                  mode === "create"
                    ? PASSWORD_MIN_LENGTH
                    : undefined
                }
                aria-describedby={hintId}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${inputClass} pr-20`}
              />

              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-pressed={showPassword}
                className="absolute inset-y-1 right-1 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          )}
        </Field>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className={primaryButton}
        >
          {busy
            ? "Please wait…"
            : mode === "create"
              ? "Create meeting"
              : "Join meeting"}
        </button>
      </form>
    </HomeShell>
  );
}

function HomeShell({ children }) {
  return (
    <main className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-md flex-col justify-center px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Venture Creation
        </h1>

        <p className="mt-2 text-slate-600 dark:text-slate-400">
          A photobooth video room: everyone's camera, layered into one picture.
        </p>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {children}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);