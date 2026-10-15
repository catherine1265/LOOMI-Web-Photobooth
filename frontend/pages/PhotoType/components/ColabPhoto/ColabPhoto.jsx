
import { useLayoutEffect, useRef, useState } from "react";
import "./style/ColabPhoto.css";
import Navbar from "../../../Navbar/tampilan/Navbar";

import {
  createMeeting,
  joinMeeting,
  loadSession,
  saveSession,
} from "../../../../roomClient.js";

import { CopyButton, navigate } from "../../../../ui.jsx";
import {
  NAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "../../../../../lib/config.js";

const NOTCH_R = 24;
const PITCH_X = 75;
const PITCH_Y = 70;
const EDGE_GAP = 44;

function countNotches(length, pitch) {
  let n = Math.round((length - EDGE_GAP * 2) / pitch);

  while (
    n > 0 &&
    (length - EDGE_GAP * 2) / n < NOTCH_R * 2 + 6
  ) {
    n--;
  }

  return Math.max(n, 0);
}

function buildTicketPath(w, h) {
  const r = NOTCH_R;
  const nx = countNotches(w, PITCH_X);
  const ny = countNotches(h, PITCH_Y);

  const sx = nx ? (w - EDGE_GAP * 2) / nx : 0;
  const sy = ny ? (h - EDGE_GAP * 2) / ny : 0;

  const cx = (i) => EDGE_GAP + sx * (i + 0.5);
  const cy = (i) => EDGE_GAP + sy * (i + 0.5);

  let d = "M0 0";

  for (let i = 0; i < nx; i++) {
    d += ` H${cx(i) - r} A${r} ${r} 0 0 0 ${cx(i) + r} 0`;
  }
  d += ` H${w}`;

  for (let i = 0; i < ny; i++) {
    d += ` V${cy(i) - r} A${r} ${r} 0 0 0 ${w} ${cy(i) + r}`;
  }
  d += ` V${h}`;

  for (let i = nx - 1; i >= 0; i--) {
    d += ` H${cx(i) + r} A${r} ${r} 0 0 0 ${cx(i) - r} ${h}`;
  }
  d += " H0";

  for (let i = ny - 1; i >= 0; i--) {
    d += ` V${cy(i) + r} A${r} ${r} 0 0 0 0 ${cy(i) - r}`;
  }

  return d + " Z";
}

function TicketFrame() {
  const ref = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateSize = () => {
      setSize({
        w: element.clientWidth,
        h: element.clientHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="colab__frame" ref={ref} aria-hidden="true">
      {size.w > 0 && size.h > 0 && (
        <svg
          width={size.w}
          height={size.h}
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="none"
        >
          <path d={buildTicketPath(size.w, size.h)} />
        </svg>
      )}
    </div>
  );
}

function Sparkle({ className = "" }) {
  return (
    <svg
      className={`colab__sparkle ${className}`}
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <path
        d="M50 2 L53.8 40.8 L71.2 28.8 L59.2 46.2 L98 50 L59.2 53.8 L71.2 71.2 L53.8 59.2 L50 98 L46.2 59.2 L28.8 71.2 L40.8 53.8 L2 50 L40.8 46.2 L28.8 28.8 L46.2 40.8Z"
        fill="#f7e9b0"
        stroke="#652b2b"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 16.5V20h3.5L19 8.5 15.5 5 4 16.5Z"
        fill="currentColor"
      />
      <path
        d="m14.5 6 3.5 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {visible ? (
        <>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6a2 2 0 002.8 2.8" />
          <path d="M9.9 5.2A11 11 0 0112 5c5.5 0 9 7 9 7a15 15 0 01-3.1 3.8" />
          <path d="M6.2 6.2C3.9 7.8 3 12 3 12s3.5 7 9 7a10 10 0 003.1-.5" />
        </>
      ) : (
        <>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </>
      )}
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function FormField({
  label,
  name,
  type = "text",
  value,
  onChange,
  onClear,
  autoComplete,
  required = true,
  maxLength,
  minLength,
  pattern,
  inputMode,
  placeholder = "",
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  const hasValue = value.length > 0;

  const inputType =
    isPassword && showPassword ? "text" : type;

  return (
    <label className="colab__field" htmlFor={name}>
      <span className="colab__field-label">{label}</span>

      <span className="colab__input-wrap">
        <input
          id={name}
          name={name}
          className="colab__input"
          type={inputType}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          pattern={pattern}
          inputMode={inputMode}
          placeholder={placeholder}
        />

        {isPassword && hasValue ? (
          <button
            type="button"
            className="colab__field-action"
            onClick={() =>
              setShowPassword((previous) => !previous)
            }
            aria-label={
              showPassword ? "Hide password" : "Show password"
            }
            aria-pressed={showPassword}
            title={
              showPassword ? "Hide password" : "Show password"
            }
          >
            <EyeIcon visible={showPassword} />
          </button>
        ) : !isPassword && hasValue && onClear ? (
          <button
            type="button"
            className="colab__field-action"
            onClick={onClear}
            aria-label={`Clear ${label}`}
            title={`Clear ${label}`}
          >
            <ClearIcon />
          </button>
        ) : (
          <span className="colab__edit-icon">
            <PencilIcon />
          </span>
        )}
      </span>
    </label>
  );
}

export default function ColabPhoto({ onBack }) {
  const [createName, setCreateName] = useState("");
  const [createPassword, setCreatePassword] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [joinName, setJoinName] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);

  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");
  const [created, setCreated] = useState(null);

  async function handleCreate(event) {
    event.preventDefault();
    setCreateError("");

    const name = createName.trim();

    if (!name || name.length > NAME_MAX_LENGTH) {
      setCreateError(
        `Name must contain 1–${NAME_MAX_LENGTH} characters.`
      );
      return;
    }

    if (
      createPassword.length < PASSWORD_MIN_LENGTH ||
      createPassword.length > 128
    ) {
      setCreateError(
        `Password must contain ${PASSWORD_MIN_LENGTH}–128 characters.`
      );
      return;
    }

    setCreating(true);

    try {
      const session = await createMeeting({
        name,
        password: createPassword,
      });

      saveSession(session);
      setCreated({
        session,
        password: createPassword,
      });
    } catch (error) {
      setCreateError(
        error.message ||
          "Could not create the meeting. Please try again."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(event) {
    event.preventDefault();
    setJoinError("");

    const code = joinCode.replace(/\s+/g, "");
    const name = joinName.trim();

    if (!/^\d{4,10}$/.test(code)) {
      setJoinError("Enter a valid meeting code.");
      return;
    }

    if (!name || name.length > NAME_MAX_LENGTH) {
      setJoinError(
        `Name must contain 1–${NAME_MAX_LENGTH} characters.`
      );
      return;
    }

    if (!joinPassword) {
      setJoinError("Please enter the meeting password.");
      return;
    }

    setJoining(true);

    try {
      const previous = loadSession(code);

      const session = await joinMeeting({
        code,
        password: joinPassword,
        name,
        identity: previous?.identity,
        rejoinKey: previous?.rejoinKey,
      });

      saveSession(session);
      navigate(`/room/${session.code}`);
    } catch (error) {
      setJoinError(
        error.message ||
          "Could not join the meeting. Please try again."
      );
    } finally {
      setJoining(false);
    }
  }

  const invite = created
    ? `Meeting code: ${created.session.code}, password: ${created.password}`
    : "";

  return (
    <main className="colab-page">
      <Navbar />

      <section className="colab-layout">
        <div className="colab-heading">
          <span>CHOOSE YOUR PHOTO TYPE</span>
        </div>

        <div className="colab__ticket">
          <TicketFrame />

          <Sparkle className="colab__sparkle--left" />
          <Sparkle className="colab__sparkle--right" />

          <div className="colab__panels">
            <section className="colab__panel">
              <h1 className="colab__panel-title">
                Creating Meeting
              </h1>

              {created ? (
                <div className="colab__created-result">
                  <p>Meeting created successfully!</p>

                  <p className="colab__created-label">
                    Meeting code
                  </p>
                  <p className="colab__created-code">
                    {created.session.code}
                  </p>

                  <p className="colab__created-label">
                    Invite information
                  </p>
                  <textarea
                    className="colab__invite"
                    value={invite}
                    readOnly
                    rows={2}
                    onFocus={(event) =>
                      event.currentTarget.select()
                    }
                  />

                  <CopyButton
                    text={invite}
                    label="Copy invite"
                  />

                  <button
                    className="colab__submit"
                    type="button"
                    onClick={() =>
                      navigate(
                        `/room/${created.session.code}`
                      )
                    }
                  >
                    ENTER ROOM
                  </button>
                </div>
              ) : (
                <form
                  className="colab__form"
                  onSubmit={handleCreate}
                >
                  <FormField
                    label="display name"
                    name="create-display-name"
                    value={createName}
                    onChange={(event) =>
                      setCreateName(event.target.value)
                    }
                    onClear={() => setCreateName("")}
                    autoComplete="nickname"
                    maxLength={NAME_MAX_LENGTH}
                  />

                  <FormField
                    label="Password"
                    name="create-password"
                    type="password"
                    value={createPassword}
                    onChange={(event) =>
                      setCreatePassword(event.target.value)
                    }
                    autoComplete="new-password"
                    minLength={PASSWORD_MIN_LENGTH}
                    maxLength={128}
                  />

                  {createError && (
                    <p className="colab__notice" role="alert">
                      {createError}
                    </p>
                  )}

                  <button
                    className="colab__submit"
                    type="submit"
                    disabled={creating}
                  >
                    {creating ? "CREATING..." : "CREATE"}
                  </button>
                </form>
              )}
            </section>

            <section className="colab__panel">
              <h2 className="colab__panel-title">
                Join Meeting
              </h2>

              <form
                className="colab__form"
                onSubmit={handleJoin}
              >
                <FormField
                  label="code"
                  name="join-room-code"
                  value={joinCode}
                  onChange={(event) =>
                    setJoinCode(
                      event.target.value.replace(/\D/g, "")
                    )
                  }
                  onClear={() => setJoinCode("")}
                  autoComplete="off"
                  inputMode="numeric"
                  pattern="[0-9]{4,10}"
                  maxLength={10}
                  placeholder="Meeting code"
                />

                <FormField
                  label="display name"
                  name="join-display-name"
                  value={joinName}
                  onChange={(event) =>
                    setJoinName(event.target.value)
                  }
                  onClear={() => setJoinName("")}
                  autoComplete="nickname"
                  maxLength={NAME_MAX_LENGTH}
                />

                <FormField
                  label="Password"
                  name="join-password"
                  type="password"
                  value={joinPassword}
                  onChange={(event) =>
                    setJoinPassword(event.target.value)
                  }
                  autoComplete="current-password"
                  maxLength={128}
                />

                {joinError && (
                  <p className="colab__notice" role="alert">
                    {joinError}
                  </p>
                )}

                <button
                  className="colab__submit"
                  type="submit"
                  disabled={joining}
                >
                  {joining ? "JOINING..." : "JOIN"}
                </button>
              </form>
            </section>
          </div>
        </div>

        {onBack && (
          <button
            type="button"
            className="colab__back"
            onClick={onBack}
          >
            Back to Photo Types
          </button>
        )}
      </section>
    </main>
  );
}
