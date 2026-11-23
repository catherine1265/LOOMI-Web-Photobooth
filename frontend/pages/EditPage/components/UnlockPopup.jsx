import { useEffect, useRef, useState } from "react";
import { UnlockError, validateCode } from "../../../config/unlock.js";

const MAX_TRIES = 5;
const LOCK_SECONDS = 30;
const SUCCESS_MS = 1000;

export default function UnlockPopup({ onUnlock, onSkip }) {
  const inputRef = useRef(null);
  const [value, setValue] = useState("");
  const [tries, setTries] = useState(0);
  const [wrong, setWrong] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [failed, setFailed] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const locked = secondsLeft > 0;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!locked) return undefined;
    const timer = setInterval(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearInterval(timer);
  }, [locked]);

  useEffect(() => {
    if (!locked && tries >= MAX_TRIES) {
      setTries(0);
      setWrong(false);
      inputRef.current?.focus();
    }
  }, [locked, tries]);

  useEffect(() => {
    if (!success) return undefined;
    const timer = setTimeout(onUnlock, SUCCESS_MS);
    return () => clearTimeout(timer);
  }, [success, onUnlock]);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape" && !success) {
        event.preventDefault();
        onSkip();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [success, onSkip]);

  async function submit() {
    if (checking || success || locked || !value) return;
    setChecking(true);
    setFailed(false);
    let valid;
    try {
      valid = await validateCode(value);
    } catch (error) {
      setChecking(false);
      if (error instanceof UnlockError && error.retryAfter) {
        setTries(MAX_TRIES);
        setSecondsLeft(error.retryAfter);
      } else {
        setFailed(true);
      }
      return;
    }
    setChecking(false);

    if (valid) {
      setSuccess(true);
      return;
    }

    const nextTries = tries + 1;
    setTries(nextTries);
    setWrong(true);
    setShaking(true);
    if (nextTries >= MAX_TRIES) setSecondsLeft(LOCK_SECONDS);
  }

  function handleChange(event) {
    setValue(event.target.value.replace(/\s+/g, "").toUpperCase());
    setWrong(false);
    setFailed(false);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      void submit();
    }
  }

  // Keep Tab focus inside the dialog.
  function trapFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll("input, button")].filter(
      (element) => !element.disabled
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  let message = null;
  if (success) message = { text: "Watermark removed", tone: "ok" };
  else if (locked) message = { text: `Too many tries. Try again in ${secondsLeft}s`, tone: "error" };
  else if (failed) message = { text: "Something went wrong, try again", tone: "error" };
  else if (wrong) message = { text: "Wrong code, try again", tone: "error" };

  return (
    <div className="edit-unlock" role="presentation">
      <div
        className="edit-unlock__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-unlock-title"
        aria-describedby="edit-unlock-desc"
        onKeyDown={trapFocus}
      >
        <h2 id="edit-unlock-title" className="edit-unlock__title">
          Have a code?
        </h2>
        <p id="edit-unlock-desc" className="edit-unlock__desc">
          Enter your code to remove the LOOMI watermark.
        </p>

        <input
          ref={inputRef}
          className={`edit-text__input edit-unlock__input${shaking ? " edit-unlock__input--shake" : ""}`}
          type="text"
          value={value}
          placeholder="Enter code"
          maxLength={32}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={locked || success}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onAnimationEnd={() => setShaking(false)}
          aria-label="Code"
          aria-invalid={wrong}
        />

        <p
          className={`edit-unlock__message${message?.tone === "ok" ? " edit-unlock__message--ok" : ""}`}
          role="status"
          aria-live="polite"
        >
          {message?.text ?? " "}
        </p>

        <div className="edit-unlock__actions">
          <button type="button" className="edit-unlock__button" disabled={success} onClick={onSkip}>
            NO CODE
          </button>
          <button
            type="button"
            className="edit-unlock__button edit-unlock__button--primary"
            disabled={!value || locked || checking || success}
            onClick={() => void submit()}
          >
            ENTER CODE
          </button>
        </div>
      </div>
    </div>
  );
}
