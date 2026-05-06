import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  apiCreateWorkout,
  apiDeleteWorkout,
  apiGenerateWorkout,
  apiGetExercises,
  apiGetWorkoutComments,
  apiGetStreak,
  apiGetWorkouts,
  apiUpdateWorkout
} from "../api/workouts.js";

const CARDIO_MILES_EXERCISES = new Set(["run", "treadmill run", "stationary bike"]);

function getTimeBasedWorkoutTitle(now = new Date()) {
  const hour = now.getHours();
  if (hour >= 5 && hour < 12) {
    return "Morning Workout";
  }
  if (hour >= 12 && hour < 17) {
    return "Afternoon Workout";
  }
  if (hour >= 17 && hour < 21) {
    return "Evening Workout";
  }
  return "Nighttime Workout";
}

function getTodayLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeInitialEntry() {
  return {
    row_id: Date.now() + Math.random(),
    exercise_id: "",
    value: "",
    sets: "",
    notes: ""
  };
}

function createInitialFormState() {
  return {
    log_date: getTodayLocalDate(),
    title: getTimeBasedWorkoutTitle(),
    is_private: "public",
    description: "",
    notes: "",
    entries: [makeInitialEntry()]
  };
}

function formatDate(value) {
  if (!value) {
    return "Unknown date";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleDateString();
}

function summarizeExercises(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "No exercises";
  }
  const names = entries.map((entry) => entry.exercise_name).filter(Boolean);
  if (names.length <= 3) {
    return names.join(", ");
  }
  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

function normalizeCount(value) {
  return Number.isFinite(value) ? value : Number(value) || 0;
}

function formatDateForInput(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function RetroSelect({ value, options, placeholder, onChange, disabled = false }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    function handleOutsideClick(ev) {
      if (!rootRef.current) {
        return;
      }
      if (!rootRef.current.contains(ev.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const selected = options.find((option) => String(option.value) === String(value));
  const label = selected?.label || placeholder;

  return (
    <div className={`retro-select ${open ? "retro-select--open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="retro-select-trigger"
        onMouseDown={(ev) => {
          ev.preventDefault();
          if (!disabled) setOpen((prev) => !prev);
        }}
        disabled={disabled}
      >
        <span>{label}</span>
        <span className="retro-select-caret" aria-hidden>
          {open ? "▲" : "▼"}
        </span>
      </button>
      {open ? (
        <div className="retro-select-menu">
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              className={`retro-select-option ${
                String(option.value) === String(value) ? "retro-select-option--active" : ""
              }`}
              onMouseDown={(ev) => {
                ev.preventDefault();
                onChange(option.value);
                setOpen(false);
              }}
              disabled={option.disabled}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default function WorkoutsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const swipeDirection = location.state?.swipeDirection;
  const returnHomeSide =
    location.state?.homeEntrySide ||
    (swipeDirection === "left" ? "right" : swipeDirection === "right" ? "left" : "left");

  const [workouts, setWorkouts] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [commentsByLogId, setCommentsByLogId] = useState({});
  const [commentLoadingByLogId, setCommentLoadingByLogId] = useState({});
  const [commentErrorByLogId, setCommentErrorByLogId] = useState({});

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formState, setFormState] = useState(createInitialFormState);
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);
  const [editFormState, setEditFormState] = useState(null);
  const [editError, setEditError] = useState("");
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);
  const [deleteConfirmLog, setDeleteConfirmLog] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [isGeneratingWorkout, setIsGeneratingWorkout] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedWorkout, setGeneratedWorkout] = useState(null);

  const exercisesById = useMemo(() => {
    const map = new Map();
    for (const exercise of exercises) {
      map.set(exercise.exercise_id, exercise);
    }
    return map;
  }, [exercises]);

  const exerciseByName = useMemo(() => {
    const map = new Map();
    for (const exercise of exercises) {
      map.set(String(exercise.name || "").toLowerCase(), exercise);
    }
    return map;
  }, [exercises]);

  const exerciseGroups = useMemo(() => {
    const groups = new Map();
    for (const exercise of exercises) {
      const categoryName = exercise.category?.name || "Other";
      if (!groups.has(categoryName)) {
        groups.set(categoryName, []);
      }
      groups.get(categoryName).push(exercise);
    }
    return Array.from(groups.entries());
  }, [exercises]);

  const exerciseGroupsByCategory = useMemo(() => {
    const map = new Map();
    for (const [categoryName, group] of exerciseGroups) {
      map.set(categoryName, group);
    }
    return map;
  }, [exerciseGroups]);

  const categoryOptions = useMemo(
    () =>
      exerciseGroups.map(([categoryName]) => ({
        value: categoryName,
        label: categoryName
      })),
    [exerciseGroups]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitialData() {
      setLoading(true);
      setError("");
      try {
        const [workoutData, exerciseData, streakData] = await Promise.all([
          apiGetWorkouts(token),
          apiGetExercises(),
          apiGetStreak(token)
        ]);
        if (cancelled) {
          return;
        }
        setWorkouts(Array.isArray(workoutData) ? workoutData : []);
        setExercises(Array.isArray(exerciseData) ? exerciseData : []);
        setStreak(Number(streakData?.streak) || 0);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load workouts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function refreshStreak() {
    try {
      const data = await apiGetStreak(token);
      setStreak(Number(data?.streak) || 0);
    } catch {
      // keep existing streak on error
    }
  }

  function isCardioExercise(exerciseId) {
    const exercise = exercisesById.get(Number(exerciseId));
    return String(exercise?.category?.name || "").toLowerCase() === "cardio";
  }

  function getCardioUnitByExerciseName(exerciseName) {
    const lowered = String(exerciseName || "").toLowerCase();
    if (CARDIO_MILES_EXERCISES.has(lowered)) {
      return "miles";
    }
    return "minutes";
  }

  function getCardioUnitFromExerciseId(exerciseId) {
    const exercise = exercisesById.get(Number(exerciseId));
    return getCardioUnitByExerciseName(exercise?.name);
  }

  async function refreshWorkouts() {
    const data = await apiGetWorkouts(token);
    setWorkouts(Array.isArray(data) ? data : []);
  }

  async function handleToggleWorkout(log) {
    const isOpen = expandedLogId === log.log_id;
    if (isOpen) {
      setExpandedLogId(null);
      return;
    }

    setExpandedLogId(log.log_id);
    if (log.is_private === 1 || commentsByLogId[log.log_id]) {
      return;
    }

    setCommentLoadingByLogId((prev) => ({ ...prev, [log.log_id]: true }));
    setCommentErrorByLogId((prev) => ({ ...prev, [log.log_id]: "" }));
    try {
      const response = await apiGetWorkoutComments(token, log.log_id);
      setCommentsByLogId((prev) => ({ ...prev, [log.log_id]: response.comments || [] }));
    } catch (err) {
      setCommentErrorByLogId((prev) => ({
        ...prev,
        [log.log_id]: err.message || "Unable to load comments."
      }));
    } finally {
      setCommentLoadingByLogId((prev) => ({ ...prev, [log.log_id]: false }));
    }
  }

  function updateEntry(setter, rowId, patch) {
    setter((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => {
        if (entry.row_id !== rowId) {
          return entry;
        }
        return { ...entry, ...patch };
      })
    }));
  }

  function updateEntryCategory(setter, rowId, categoryName) {
    setter((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => {
        if (entry.row_id !== rowId) {
          return entry;
        }
        return { ...entry, category_name: categoryName, exercise_id: "", sets: "" };
      })
    }));
  }

  function updateEntryExercise(setter, rowId, exerciseId) {
    setter((prev) => ({
      ...prev,
      entries: prev.entries.map((entry) => {
        if (entry.row_id !== rowId) {
          return entry;
        }
        const next = { ...entry, exercise_id: exerciseId };
        const selectedExercise = exercisesById.get(Number(exerciseId));
        if (String(selectedExercise?.category?.name || "").toLowerCase() === "cardio") {
          next.sets = "";
        }
        return next;
      })
    }));
  }

  function addEntryRow(setter) {
    setter((prev) => ({
      ...prev,
      entries: [...prev.entries, { ...makeInitialEntry(), category_name: "" }]
    }));
  }

  function removeEntryRow(setter, rowId) {
    setter((prev) => {
      if (prev.entries.length <= 1) {
        return prev;
      }
      return {
        ...prev,
        entries: prev.entries.filter((entry) => entry.row_id !== rowId)
      };
    });
  }

  function resetForm() {
    setFormState(createInitialFormState());
    setFormError("");
  }

  function resetGenerateState() {
    setGeneratePrompt("");
    setIsGeneratingWorkout(false);
    setGenerateError("");
    setGeneratedWorkout(null);
  }

  function buildFormFromWorkout(log) {
    const entries = (log.entries || []).map((entry) => {
      const exercise = exerciseByName.get(String(entry.exercise_name || "").toLowerCase());
      return {
        row_id: Date.now() + Math.random(),
        category_name: exercise?.category?.name || "",
        exercise_id: exercise?.exercise_id ? String(exercise.exercise_id) : "",
        value: entry.value ?? "",
        sets: entry.sets ?? "",
        notes: entry.notes ?? ""
      };
    });
    return {
      log_date: formatDateForInput(log.log_date),
      title: log.title || "",
      is_private: Number(log.is_private) === 1 ? "private" : "public",
      description: log.description || "",
      notes: log.notes || "",
      entries: entries.length ? entries : [{ ...makeInitialEntry(), category_name: "" }]
    };
  }

  function buildPayloadFromForm(state, setErrorMessage) {
    const title = state.title.trim();
    if (!title) {
      setErrorMessage("Title is required.");
      return null;
    }
    if (!state.log_date) {
      setErrorMessage("Date is required.");
      return null;
    }
    if (!state.entries.length) {
      setErrorMessage("Add at least one exercise entry.");
      return null;
    }

    const entries = [];
    for (const entry of state.entries) {
      const exerciseId = Number(entry.exercise_id);
      if (!Number.isFinite(exerciseId) || exerciseId <= 0) {
        setErrorMessage("Each entry needs an exercise.");
        return null;
      }
      const isCardio = isCardioExercise(exerciseId);
      const hasValue = String(entry.value).trim() !== "";
      const value = hasValue ? Number(entry.value) : null;
      if (hasValue && !Number.isFinite(value)) {
        setErrorMessage("Value must be a number.");
        return null;
      }
      if (isCardio && value == null) {
        setErrorMessage("Cardio entries require a value.");
        return null;
      }
      const hasSets = String(entry.sets).trim() !== "";
      const sets = hasSets ? Number(entry.sets) : null;
      if (hasSets && !Number.isFinite(sets)) {
        setErrorMessage("Sets must be a number.");
        return null;
      }
      entries.push({
        exercise_id: exerciseId,
        value,
        sets: isCardio ? null : sets,
        notes: entry.notes.trim() || null
      });
    }

    return {
      log_date: state.log_date,
      is_private: state.is_private === "private" ? 1 : 0,
      title,
      description: state.description.trim() || null,
      notes: state.notes.trim() || null,
      entries
    };
  }

  async function handleCreateWorkout(ev) {
    ev.preventDefault();
    setFormError("");

    const payload = buildPayloadFromForm(formState, setFormError);
    if (!payload) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiCreateWorkout(token, payload);
      await refreshWorkouts();
      await refreshStreak();
      setShowCreateForm(false);
      resetForm();
    } catch (err) {
      setFormError(err.message || "Failed to create workout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEditingWorkout(log) {
    setShowCreateForm(false);
    setFormError("");
    setEditingLogId(log.log_id);
    setEditError("");
    setEditFormState(buildFormFromWorkout(log));
  }

  function stopEditingWorkout() {
    setEditingLogId(null);
    setEditFormState(null);
    setEditError("");
  }

  async function handleUpdateWorkout(ev) {
    ev.preventDefault();
    if (!editFormState || !editingLogId) {
      return;
    }
    setEditError("");
    const payload = buildPayloadFromForm(editFormState, setEditError);
    if (!payload) {
      return;
    }
    setIsEditSubmitting(true);
    try {
      await apiUpdateWorkout(token, editingLogId, payload);
      await refreshWorkouts();
      stopEditingWorkout();
    } catch (err) {
      setEditError(err.message || "Failed to update workout.");
    } finally {
      setIsEditSubmitting(false);
    }
  }

  function requestDeleteWorkout(log) {
    setDeleteConfirmLog({ log_id: log.log_id, title: log.title });
  }

  function cancelDeleteWorkout() {
    setDeleteConfirmLog(null);
  }

  async function confirmDeleteWorkout() {
    if (!deleteConfirmLog) {
      return;
    }
    const logId = deleteConfirmLog.log_id;
    setDeletingLogId(logId);
    setError("");
    try {
      await apiDeleteWorkout(token, logId);
      if (expandedLogId === logId) {
        setExpandedLogId(null);
      }
      if (editingLogId === logId) {
        stopEditingWorkout();
      }
      await refreshWorkouts();
      await refreshStreak();
    } catch (err) {
      setError(err.message || "Failed to delete workout.");
    } finally {
      setDeleteConfirmLog(null);
      setDeletingLogId(null);
    }
  }

  function openGenerateWorkoutModal() {
    resetGenerateState();
    setShowGenerateModal(true);
  }

  function closeGenerateWorkoutModal() {
    setShowGenerateModal(false);
    resetGenerateState();
  }

  async function handleGenerateWorkout(ev) {
    ev.preventDefault();
    const prompt = generatePrompt.trim();
    if (!prompt) {
      setGenerateError("Please describe what sort of workout you are looking for.");
      return;
    }

    setGenerateError("");
    setGeneratedWorkout(null);
    setIsGeneratingWorkout(true);
    try {
      const response = await apiGenerateWorkout(token, prompt);
      if (!Array.isArray(response?.sections) || response.sections.length === 0) {
        throw new Error("Generated workout was empty.");
      }
      setGeneratedWorkout(response);
    } catch (err) {
      setGenerateError(err.message || "Failed to generate workout.");
    } finally {
      setIsGeneratingWorkout(false);
    }
  }

  function handleAcceptGeneratedWorkout() {
    if (!generatedWorkout) {
      return;
    }

    const generatedEntries = [];
    for (const section of generatedWorkout.sections) {
      for (const exercise of section.exercises || []) {
        const mapped = exercisesById.get(Number(exercise.exercise_id));
        generatedEntries.push({
          row_id: Date.now() + Math.random(),
          category_name: mapped?.category?.name || exercise.category || "",
          exercise_id: String(exercise.exercise_id),
          value: "",
          sets: String(exercise.sets),
          notes: `Reps: ${exercise.reps} | Rest: ${exercise.rest}`
        });
      }
    }

    if (generatedEntries.length === 0) {
      setGenerateError("No valid exercises were generated.");
      return;
    }

    const nextFormState = createInitialFormState();
    setFormState({
      ...nextFormState,
      title: generatedWorkout.workout_title || nextFormState.title,
      description: generatedWorkout.workout_description || "",
      entries: generatedEntries
    });
    setFormError("");
    setShowCreateForm(true);
    closeGenerateWorkoutModal();
  }

  function renderWorkoutForm({
    state,
    setState,
    onSubmit,
    errorMessage,
    isSaving,
    submitLabel,
    onCancel
  }) {
    return (
      <form className="retro-form" onSubmit={onSubmit}>
        <label className="retro-field">
          <span className="retro-label">Title</span>
          <input
            className="retro-input"
            value={state.title}
            onChange={(ev) => setState((prev) => ({ ...prev, title: ev.target.value }))}
            required
            maxLength={100}
          />
        </label>

        <label className="retro-field">
          <span className="retro-label">Visibility</span>
          <RetroSelect
            value={state.is_private}
            placeholder="Select visibility"
            options={[
              { value: "public", label: "Public" },
              { value: "private", label: "Private" }
            ]}
            onChange={(value) => setState((prev) => ({ ...prev, is_private: value }))}
          />
        </label>

        <label className="retro-field">
          <span className="retro-label">Date</span>
          <input
            className="retro-input"
            type="date"
            value={state.log_date}
            onChange={(ev) => setState((prev) => ({ ...prev, log_date: ev.target.value }))}
            required
          />
        </label>

        <label className="retro-field">
          <span className="retro-label">Description</span>
          <textarea
            className="retro-input retro-workout-textarea"
            value={state.description}
            onChange={(ev) => setState((prev) => ({ ...prev, description: ev.target.value }))}
            maxLength={1000}
          />
        </label>

        <label className="retro-field">
          <span className="retro-label">Notes</span>
          <textarea
            className="retro-input retro-workout-textarea"
            value={state.notes}
            onChange={(ev) => setState((prev) => ({ ...prev, notes: ev.target.value }))}
            maxLength={2000}
          />
        </label>

        <div className="retro-workout-entry-section">
          <p className="retro-label retro-workout-entry-title">Entries</p>
          {state.entries.map((entry) => {
            const selected = exercisesById.get(Number(entry.exercise_id));
            const isCardio = String(selected?.category?.name || "").toLowerCase() === "cardio";
            const cardioUnit = getCardioUnitFromExerciseId(entry.exercise_id);
            const exerciseOptions = (exerciseGroupsByCategory.get(entry.category_name) || []).map(
              (exercise) => ({
                value: String(exercise.exercise_id),
                label: exercise.name
              })
            );

            return (
              <div key={entry.row_id} className="retro-workout-entry-row">
                <label className="retro-field">
                  <span className="retro-label">Category</span>
                  <RetroSelect
                    value={entry.category_name}
                    placeholder="Select category"
                    options={categoryOptions}
                    onChange={(categoryName) =>
                      updateEntryCategory(setState, entry.row_id, categoryName)
                    }
                  />
                </label>

                <label className="retro-field">
                  <span className="retro-label">Exercise</span>
                  <RetroSelect
                    value={entry.exercise_id}
                    placeholder={
                      entry.category_name ? "Select exercise" : "Select a category first"
                    }
                    options={exerciseOptions}
                    disabled={!entry.category_name}
                    onChange={(exerciseId) =>
                      updateEntryExercise(setState, entry.row_id, String(exerciseId))
                    }
                  />
                </label>

                <label className="retro-field">
                  <span className="retro-label">
                    {isCardio ? `Value (${cardioUnit})` : "Value"}
                  </span>
                  <input
                    className="retro-input"
                    type="number"
                    step="0.1"
                    min="0"
                    value={entry.value}
                    onChange={(ev) => updateEntry(setState, entry.row_id, { value: ev.target.value })}
                    required={isCardio}
                  />
                </label>

                {!isCardio ? (
                  <label className="retro-field">
                    <span className="retro-label">Sets</span>
                    <input
                      className="retro-input"
                      type="number"
                      step="1"
                      min="0"
                      value={entry.sets}
                      onChange={(ev) => updateEntry(setState, entry.row_id, { sets: ev.target.value })}
                    />
                  </label>
                ) : (
                  <p className="retro-hint retro-cardio-hint">Cardio uses value only ({cardioUnit}).</p>
                )}

                <label className="retro-field">
                  <span className="retro-label">Entry Notes</span>
                  <input
                    className="retro-input"
                    value={entry.notes}
                    onChange={(ev) => updateEntry(setState, entry.row_id, { notes: ev.target.value })}
                    maxLength={1000}
                  />
                </label>

                <div className="retro-actions">
                  <button
                    type="button"
                    className="retro-btn retro-btn--danger retro-btn--small"
                    onClick={() => removeEntryRow(setState, entry.row_id)}
                    disabled={state.entries.length <= 1}
                  >
                    Remove Entry
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {errorMessage ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {errorMessage}
          </div>
        ) : null}

        <div className="retro-actions">
          <button
            type="button"
            className="retro-btn retro-btn--ghost retro-btn--small"
            onClick={() => addEntryRow(setState)}
          >
            Add Another Entry
          </button>
          {onCancel ? (
            <button
              type="button"
              className="retro-btn retro-btn--ghost retro-btn--small"
              onClick={onCancel}
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            className="retro-btn retro-btn--primary retro-btn--small"
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : submitLabel}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div
      className={`retro-page retro-section retro-workouts-page retro-scene ${
        swipeDirection === "left"
          ? "retro-scene--swipe-left"
          : swipeDirection === "right"
            ? "retro-scene--swipe-right"
            : ""
      }`}
    >
      <div className="retro-cloud retro-cloud--1" aria-hidden />
      <div className="retro-cloud retro-cloud--2" aria-hidden />
      <div className="retro-cloud retro-cloud--3" aria-hidden />
      <div className="retro-cloud retro-cloud--4" aria-hidden />
      <div className="retro-cloud retro-cloud--5" aria-hidden />
      <div className="retro-cloud retro-cloud--6" aria-hidden />
      <div className="retro-cloud retro-cloud--7" aria-hidden />
      <div className="retro-cloud retro-cloud--8" aria-hidden />
      <div className="retro-hill" aria-hidden />

      <div className="retro-home-hud">
        <p className="retro-brand retro-brand--home">Jim</p>
        <div className="retro-workouts-streak-hud" aria-label={`Current workout streak ${streak} days`}>
          <span className="retro-workouts-streak-label">current workout streak:</span>
          <span className="retro-workouts-streak-value">
            <span className="retro-workouts-streak-count">{streak}</span>
            <img className="retro-workouts-streak-icon" src="/sprites/fire_streak.png" alt="" aria-hidden />
          </span>
        </div>
        <div className="retro-home-hud-actions">
          <button
            type="button"
            className="retro-btn retro-btn--ghost retro-btn--small"
            onClick={() => navigate("/home", { state: { homeEntrySide: returnHomeSide } })}
          >
            Back
          </button>
        </div>
      </div>

      <div className="retro-workouts-shell">
        <div className="retro-workouts-header">
          <h1 className="retro-title">Workouts</h1>
          <div className="retro-workout-header-actions">
            <button
              type="button"
              className="retro-btn retro-btn--ghost retro-btn--small"
              onClick={openGenerateWorkoutModal}
            >
              Generate Workout
            </button>
            <button
              type="button"
              className="retro-btn retro-btn--primary retro-btn--small"
              onClick={() => {
                setShowCreateForm((prev) => {
                  const next = !prev;
                  if (!next) {
                    resetForm();
                  }
                  return next;
                });
              }}
            >
              {showCreateForm ? "Close Add Workout" : "Add Workout"}
            </button>
          </div>
        </div>

        {error ? (
          <div className="retro-banner retro-banner--error" role="alert">
            {error}
          </div>
        ) : null}

        {showCreateForm ? (
          <div className="retro-panel retro-panel--wide retro-workout-form-panel retro-workout-form-panel--fullscreen">
            <h2 className="retro-title retro-workout-subtitle">Add Workout</h2>
            {renderWorkoutForm({
              state: formState,
              setState: setFormState,
              onSubmit: handleCreateWorkout,
              errorMessage: formError,
              isSaving: isSubmitting,
              submitLabel: "Save Workout"
            })}
          </div>
        ) : null}

        {!showCreateForm ? (
          <div className="retro-workout-list">
            {loading ? (
              <div className="retro-empty-field retro-workout-empty">
                <p>Loading workouts...</p>
              </div>
            ) : workouts.length === 0 ? (
              <div className="retro-empty-field retro-workout-empty">
                <p>No workouts logged yet.</p>
              </div>
            ) : (
              workouts.map((log) => {
                const isOpen = expandedLogId === log.log_id;
                const isPrivate = Number(log.is_private) === 1;
                const comments = commentsByLogId[log.log_id] || [];
                return (
                  <article key={log.log_id} className="retro-workout-card">
                    <button
                      type="button"
                      className="retro-workout-toggle"
                      onClick={() => handleToggleWorkout(log)}
                    >
                      <span className="retro-workout-card-title">{log.title}</span>
                      <span className="retro-workout-date">{formatDate(log.log_date)}</span>
                      <span className="retro-workout-summary">{summarizeExercises(log.entries)}</span>
                      {!isPrivate ? (
                        <span className="retro-workout-engagement">
                          Hype: {normalizeCount(log.hype_count)} | Comments:{" "}
                          {normalizeCount(log.comment_count)}
                        </span>
                      ) : null}
                    </button>

                    {isOpen ? (
                      <div className="retro-workout-detail">
                        {editingLogId === log.log_id && editFormState ? (
                          <div className="retro-panel retro-panel--wide retro-workout-edit-panel">
                            <h2 className="retro-title retro-workout-subtitle">Edit Workout</h2>
                            {renderWorkoutForm({
                              state: editFormState,
                              setState: setEditFormState,
                              onSubmit: handleUpdateWorkout,
                              errorMessage: editError,
                              isSaving: isEditSubmitting,
                              submitLabel: "Save Changes",
                              onCancel: stopEditingWorkout
                            })}
                          </div>
                        ) : (
                          <>
                            <div className="retro-actions">
                              <button
                                type="button"
                                className="retro-btn retro-btn--ghost retro-btn--small"
                                onClick={() => startEditingWorkout(log)}
                                disabled={deletingLogId === log.log_id}
                              >
                                Edit Workout
                              </button>
                              <button
                                type="button"
                                className="retro-btn retro-btn--danger retro-btn--small"
                                onClick={() => requestDeleteWorkout(log)}
                                disabled={deletingLogId === log.log_id}
                              >
                                {deletingLogId === log.log_id ? "Deleting..." : "Delete Workout"}
                              </button>
                            </div>
                            {log.description ? (
                              <p className="retro-workout-copy">{log.description}</p>
                            ) : null}
                            {log.notes ? <p className="retro-workout-copy">{log.notes}</p> : null}

                            <div className="retro-workout-entry-list">
                              {log.entries?.map((entry) => {
                                const byName = exerciseByName.get(
                                  String(entry.exercise_name || "").toLowerCase()
                                );
                                const isCardio =
                                  String(byName?.category?.name || "").toLowerCase() === "cardio";
                                const cardioUnit = getCardioUnitByExerciseName(entry.exercise_name);
                                return (
                                  <div key={entry.entry_id} className="retro-workout-entry-item">
                                    <p className="retro-workout-entry-name">{entry.exercise_name}</p>
                                    <p className="retro-workout-entry-meta">
                                      {entry.value != null
                                        ? `Value: ${entry.value}${isCardio ? ` ${cardioUnit}` : ""}`
                                        : "Value: -"}{" "}
                                      | Sets: {entry.sets ?? "-"}
                                    </p>
                                    {entry.notes ? (
                                      <p className="retro-workout-entry-notes">{entry.notes}</p>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {!isPrivate ? (
                          <div className="retro-workout-comments">
                            <p className="retro-label">Comments</p>
                            {commentLoadingByLogId[log.log_id] ? (
                              <p className="retro-hint">Loading comments...</p>
                            ) : commentErrorByLogId[log.log_id] ? (
                              <div className="retro-banner retro-banner--error">
                                {commentErrorByLogId[log.log_id]}
                              </div>
                            ) : comments.length === 0 ? (
                              <p className="retro-hint">No comments yet.</p>
                            ) : (
                              comments.map((comment) => (
                                <div key={comment.comment_id} className="retro-workout-comment-item">
                                  <p className="retro-workout-comment-user">
                                    {comment.user?.username || "Player"}
                                  </p>
                                  <p className="retro-workout-comment-text">{comment.comment}</p>
                                </div>
                              ))
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {deleteConfirmLog ? (
        <div className="retro-modal-backdrop" role="presentation">
          <div
            className="retro-panel retro-modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retro-delete-workout-title"
          >
            <h2 id="retro-delete-workout-title" className="retro-title">
              Delete Workout?
            </h2>
            <p className="retro-hint retro-modal-copy">
              Remove "{deleteConfirmLog.title}" and all of its entries permanently?
            </p>
            <div className="retro-actions">
              <button
                type="button"
                className="retro-btn retro-btn--ghost retro-btn--small"
                onClick={cancelDeleteWorkout}
                disabled={deletingLogId === deleteConfirmLog.log_id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="retro-btn retro-btn--danger retro-btn--small"
                onClick={confirmDeleteWorkout}
                disabled={deletingLogId === deleteConfirmLog.log_id}
              >
                {deletingLogId === deleteConfirmLog.log_id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showGenerateModal ? (
        <div className="retro-modal-backdrop" role="presentation">
          <div
            className="retro-panel retro-modal-panel retro-generate-workout-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="retro-generate-workout-title"
          >
            <h2 id="retro-generate-workout-title" className="retro-title">
              Generate Workout
            </h2>
            <form className="retro-form retro-generate-workout-form" onSubmit={handleGenerateWorkout}>
              <label className="retro-field">
                <span className="retro-label">Workout prompt</span>
                <textarea
                  className="retro-input retro-workout-textarea"
                  placeholder="What sort of workout are you looking for today?"
                  value={generatePrompt}
                  onChange={(ev) => setGeneratePrompt(ev.target.value)}
                  maxLength={1200}
                />
              </label>

              {generateError ? (
                <div className="retro-banner retro-banner--error" role="alert">
                  {generateError}
                </div>
              ) : null}

              <div className="retro-actions">
                <button
                  type="button"
                  className="retro-btn retro-btn--ghost retro-btn--small"
                  onClick={closeGenerateWorkoutModal}
                  disabled={isGeneratingWorkout}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="retro-btn retro-btn--primary retro-btn--small"
                  disabled={isGeneratingWorkout}
                >
                  {isGeneratingWorkout ? "Generating..." : "Generate"}
                </button>
              </div>
            </form>

            {generatedWorkout ? (
              <div className="retro-generate-preview">
                <p className="retro-label retro-generate-preview-title">{generatedWorkout.workout_title}</p>
                <p className="retro-workout-copy">{generatedWorkout.workout_description}</p>
                <div className="retro-generate-preview-sections">
                  {generatedWorkout.sections.map((section, sectionIndex) => (
                    <div
                      key={`${section.section_name}-${sectionIndex}`}
                      className="retro-generate-preview-section"
                    >
                      <p className="retro-label">{section.section_name}</p>
                      <div className="retro-generate-preview-list">
                        {section.exercises.map((exercise, exerciseIndex) => (
                          <p
                            key={`${section.section_name}-${exercise.exercise_id}-${exerciseIndex}`}
                            className="retro-generate-preview-item"
                          >
                            {exercise.exercise_name} - {exercise.sets} sets - {exercise.reps} reps - Rest:{" "}
                            {exercise.rest}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="retro-actions">
                  <button
                    type="button"
                    className="retro-btn retro-btn--primary retro-btn--small"
                    onClick={handleAcceptGeneratedWorkout}
                  >
                    Save Workout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
