import React, {
  createContext,
   useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { supabase } from "./lib/supabase";
import {
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  CircleAlert,
  Clock3,
  Plus,
  Sparkles,
} from "lucide-react";
import Button from "./components/Button";
import InputField from "./components/InputField";
import StatusCard from "./components/StatusCard";
import PageShell from "./components/PageShell";
import ProgressCircle from "./third-party/ProgressCircle";
import {
  assignmentRisk,
  buildPlan,
  calculateRisk,
  DAILY_CAPACITY_HOURS,
  dueLabel,
  hoursFromProgress,
  planTotalHours,
  progressOf,
  remainingHours,
  STUDY_WEEK_HOURS,
  totalRemainingHours,
  weeklyWorkload,
  workloadPercent,
} from "./utils/workload";

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

const statusSlug = (status) =>
  (status || "Not started").toLowerCase().replace(/[^a-z]+/g, "-");

// --------------------------------------------------
// APP PROVIDER — SUPABASE DATA AND AUTHENTICATION
// --------------------------------------------------

function AppProvider({ children }) {
  const [assignments, setAssignments] = useState([]);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    let active = true;

    const applySession = (session) => {
      if (!active) return;

      const authUser = session?.user;

      setUser(
        authUser
          ? {
              id: authUser.id,
              name:
                authUser.user_metadata?.full_name ||
                authUser.email?.split("@")[0] ||
                "Student",
              email: authUser.email,
            }
          : null
      );

      setAuthLoading(false);
    };

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) {
        console.error("Could not restore Supabase session:", error.message);
        setAuthLoading(false);
        return;
      }

      applySession(data.session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAssignments() {
      if (!user?.id) {
        setAssignments([]);
        setAssignmentsLoading(false);
        return;
      }

      setAssignmentsLoading(true);

      try {
        const { data, error } = await supabase
          .from("assignments")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!active) return;

        setAssignments(
          (data || []).map((row) => ({
            id: row.id,
            name: row.name,
            subject: row.subject,
            dueDate: row.due_date,
            estimatedHours: Number(row.estimated_hours),
            completedHours: Number(row.completed_hours),
            priority: row.priority,
            status: row.status,
            note: row.note || "",
          }))
        );
      } catch (error) {
        console.error(
          "Could not load assignments from Supabase:",
          error.message
        );

        if (active) {
          setSuccess({
            title: "Could not load assignments",
            message: error.message || "Please refresh and try again.",
          });
        }
      } finally {
        if (active) setAssignmentsLoading(false);
      }
    }

    loadAssignments();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const addAssignment = async (assignment) => {
    if (!user?.id) {
      throw new Error("Please log in before adding an assignment.");
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert({
        user_id: user.id,
        name: assignment.name.trim(),
        subject: assignment.subject.trim(),
        due_date: assignment.dueDate,
        estimated_hours: Number(assignment.estimatedHours),
        completed_hours: Number(assignment.completedHours || 0),
        priority: assignment.priority || "Medium",
        status: assignment.status || "Not started",
        note: assignment.note || "",
      })
      .select("*")
      .single();

    if (error) throw error;

    const savedAssignment = {
      id: data.id,
      name: data.name,
      subject: data.subject,
      dueDate: data.due_date,
      estimatedHours: Number(data.estimated_hours),
      completedHours: Number(data.completed_hours),
      priority: data.priority,
      status: data.status,
      note: data.note || "",
    };

    setAssignments((previous) => [savedAssignment, ...previous]);
    return savedAssignment;
  };

  const updateAssignment = async (id, patch) => {
    if (!user?.id) {
      throw new Error("Please log in before updating an assignment.");
    }

    const current = assignments.find(
      (item) => String(item.id) === String(id)
    );

    if (!current) {
      throw new Error("Assignment not found. Refresh and try again.");
    }

    const next = { ...current, ...patch };

    const { data, error } = await supabase
      .from("assignments")
      .update({
        name: next.name,
        subject: next.subject,
        due_date: next.dueDate,
        estimated_hours: Number(next.estimatedHours),
        completed_hours: Number(next.completedHours),
        priority: next.priority,
        status: next.status,
        note: next.note || "",
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;

    const savedAssignment = {
      id: data.id,
      name: data.name,
      subject: data.subject,
      dueDate: data.due_date,
      estimatedHours: Number(data.estimated_hours),
      completedHours: Number(data.completed_hours),
      priority: data.priority,
      status: data.status,
      note: data.note || "",
    };

    setAssignments((previous) =>
      previous.map((item) =>
        String(item.id) === String(id) ? savedAssignment : item
      )
    );

    return savedAssignment;
  };

  const logout = useCallback(async () => {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Logout failed:", error.message);
    throw error;
  }

  setAssignments([]);
  setSuccess(null);
}, []);
  const value = useMemo(
    () => ({
      assignments,
      user,
      logout,
      authLoading,
      assignmentsLoading,
      success,
      setUser,
      setSuccess,
      addAssignment,
      updateAssignment,
      resetDemo: () => setSuccess(null),
    }),
    [assignments, user, logout , authLoading, assignmentsLoading, success]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// --------------------------------------------------
// PROTECTED ROUTES
// --------------------------------------------------

function Protected({ children }) {
  const { user, authLoading } = useApp();

  if (authLoading) {
    return (
      <div className="auth-shell">
        <div className="auth-panel">Checking your session...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// --------------------------------------------------
// AUTHENTICATION LAYOUT
// --------------------------------------------------

function AuthLayout({
  title,
  subtitle,
  children,
  switchText,
  switchTo,
}) {
  const navigate = useNavigate();

  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-hero-card">
          <span className="micro-pill">EARLY WARNING SYSTEM</span>
          <h2>See the pressure before the deadline does.</h2>
          <p>
            DeadlineMap turns due dates, estimated effort and progress into a
            transparent workload forecast and next action.
          </p>

          <div className="hero-stat">
            <div>
              <span>Current workload</span>
              <strong>74%</strong>
            </div>
            <div className="mini-bar">
              <span style={{ width: "74%" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="auth-panel">
        <div className="auth-brand">
          <div className="brand-icon">D</div>
          <strong>DeadlineMap</strong>
        </div>

        <div className="auth-content">
          <span className="eyebrow">STUDENT WORKLOAD INTELLIGENCE</span>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>

          {children}

          <p className="auth-switch">
            {switchText}{" "}
            <button onClick={() => navigate(switchTo)}>
              {switchTo === "/login" ? "Login" : "Create an account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// --------------------------------------------------
// SIGNUP
// --------------------------------------------------

function SignUp() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirm
    ) {
      setError("Please complete all required fields.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    setBusy(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: { full_name: form.name.trim() },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (data.session) {
        navigate("/dashboard");
      } else {
        setError(
          "Account created. Check your email to confirm your account, then log in."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to create your account.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Create your workload map"
      subtitle="Set up a lightweight planning space for your next study week."
      switchText="Already have an account?"
      switchTo="/login"
    >
      <form className="stack-lg" onSubmit={submit}>
        <InputField
          label="Full name"
          required
          value={form.name}
          onChange={(v) => setForm({ ...form, name: v })}
          placeholder="Enter your full name"
        />
        <InputField
          label="University email"
          type="email"
          required
          value={form.email}
          onChange={(v) => setForm({ ...form, email: v })}
          placeholder="student@university.edu"
        />
        <InputField
          label="Password"
          type="password"
          required
          value={form.password}
          onChange={(v) => setForm({ ...form, password: v })}
          placeholder="Create a password"
        />
        <InputField
          label="Confirm password"
          type="password"
          required
          value={form.confirm}
          onChange={(v) => setForm({ ...form, confirm: v })}
          placeholder="Enter password again"
        />

        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}

        <Button type="submit" icon={ArrowRight} disabled={busy}>
          {busy ? "Creating account..." : "Create an account"}
        </Button>
      </form>
    </AuthLayout>
  );
}

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Enter both email and password to continue.");
      return;
    }

    setBusy(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Unable to log in.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Pick up where you left off and see what needs your attention this week."
      switchText="New to DeadlineMap?"
      switchTo="/signup"
    >
      <form className="stack-lg" onSubmit={submit}>
        <InputField
          label="University email"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="student@university.edu"
        />
        <InputField
          label="Password"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Enter password"
        />

        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}

        <Button type="submit" icon={ArrowRight} disabled={busy}>
          {busy ? "Logging in..." : "Login"}
        </Button>
      </form>
    </AuthLayout>
  );
}

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function Dashboard() {
  const { assignments, user, logout , assignmentsLoading } = useApp();
  const navigate = useNavigate();

  const risk = calculateRisk(assignments);
  const remaining = totalRemainingHours(assignments);
  const workload = workloadPercent(assignments);
  const plan = buildPlan(assignments);
  const plannedHours = planTotalHours(plan);

  const dueSoon = assignments.filter((a) => {
    const { daysLeft } = assignmentRisk(a, assignments);
    return daysLeft >= 0 && daysLeft <= 3;
  }).length;

  const topContributor = [...risk.breakdown].sort(
    (a, b) => b.points - a.points
  )[0];

  return (
    <PageShell
      title="Your workload at a glance"
      eyebrow="DASHBOARD"
      action={
  <div style={{ display: "flex", gap: "8px" }}>
    <Button
      icon={Plus}
      onClick={() => navigate("/add-assignment")}
    >
      Add assignment
    </Button>

    <Button
      variant="secondary"
      onClick={async () => {
        try {
          await logout();
          navigate("/login", { replace: true });
        } catch (error) {
          alert("Logout failed. Please try again.");
        }
      }}
    >
      Logout
    </Button>
  </div>
}     
    >
      <section className="welcome-row">
        <div>
          <span className="eyebrow">
            GOOD MORNING, {user?.name || "STUDENT"}
          </span>
          <h2>Make the next week feel manageable.</h2>
          <p className="muted">
            Capture the work, understand the pressure, then act before it compounds.
          </p>
        </div>

        <div className={`risk-chip risk-chip-${risk.level.toLowerCase()}`}>
          <CircleAlert size={16} />
          <span>
            {risk.level === "HIGH"
              ? "High workload risk"
              : `${risk.level} workload pressure`}
          </span>
        </div>
      </section>

      <div className="stats-grid">
        <StatusCard
          title="Remaining effort"
          value={`${remaining}h`}
          status={workload > 70 ? "warning" : "good"}
          change={plannedHours ? `-${plannedHours}` : undefined}
          icon={Clock3}
          description={`Today's plan can clear ${plannedHours}h of it`}
        />
        <StatusCard
          title="Current workload"
          value={`${workload}%`}
          status={workload > 70 ? "warning" : "good"}
          badge={`${risk.level} risk`}
          tone={risk.level}
          icon={CircleAlert}
          description={`Against a ${STUDY_WEEK_HOURS}h study-week budget`}
        />
        <StatusCard
          title={`Next ${dueSoon === 1 ? "deadline" : "deadlines"}`}
          value={dueSoon}
          status={dueSoon > 1 ? "warning" : "neutral"}
          badge={`${assignments.length} tracked`}
          tone="neutral"
          icon={CalendarDays}
          description="Due inside the three-day clustering window"
        />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">UPCOMING ASSIGNMENTS</span>
              <h3>What is on your plate?</h3>
            </div>
            <span className="panel-tag">
              {assignmentsLoading ? "Loading assignments..." : "Supabase data"}
            </span>
          </div>

          <div className="assignment-list">
            {assignments.length === 0 && !assignmentsLoading ? (
              <div className="empty-state">
                <p>No assignments yet.</p>
                <Button
                  icon={Plus}
                  onClick={() => navigate("/add-assignment")}
                >
                  Add your first assignment
                </Button>
              </div>
            ) : (
              assignments.map((assignment) => {
                const itemRisk = assignmentRisk(assignment, assignments);

                return (
                  <button
                    key={assignment.id}
                    className="assignment-row"
                    onClick={() => navigate(`/assignment/${assignment.id}`)}
                  >
                    <div
                      className={`assignment-dot priority-${assignment.priority.toLowerCase()}`}
                    />
                    <div className="assignment-main">
                      <strong>{assignment.name}</strong>
                      <span>{assignment.subject}</span>
                      <div className="assignment-sub">
                        <span className="due-text">
                          {dueLabel(assignment)}
                        </span>
                        <span
                          className={`status-pill status-pill-${statusSlug(assignment.status)}`}
                        >
                          {assignment.status}
                        </span>
                        <span
                          className={`status-pill status-pill-${itemRisk.level.toLowerCase()}`}
                        >
                          {itemRisk.level} risk
                        </span>
                      </div>
                    </div>
                    <div className="assignment-meta">
                      <strong>{progressOf(assignment)}%</strong>
                      <span>{remainingHours(assignment)}h left</span>
                      <ChevronRight size={18} />
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </section>

        <section className="panel featured-panel">
          <div className="feature-orb">
            <Sparkles size={22} />
          </div>
          <span className="eyebrow">RISK FORECAST</span>
          <h3>Don't just see a deadline. See the pressure behind it.</h3>
          <p>
            Deadline clustering, remaining effort and progress are combined into
            a transparent 0–100 planning heuristic.
          </p>
          <div className="feature-score">
            <strong>{risk.score}</strong>
            <span>/ 100</span>
          </div>

          {topContributor ? (
            <p className="muted">
              Biggest contributor: {topContributor.label} — {topContributor.points}{" "}
              of its {topContributor.weightPct} possible points.
            </p>
          ) : null}

          <Button to="/risk" icon={ArrowRight}>
            View risk analysis
          </Button>
        </section>
      </div>

      <section className="next-step-banner">
        <div>
          <span className="eyebrow">NEXT STEP</span>
          <strong>Open your weekly workload</strong>
          <span>
            Spot where the effort is concentrated before you choose what to work on.
          </span>
        </div>
        <Button variant="secondary" to="/workload" icon={ArrowRight}>
          View this week
        </Button>
      </section>
    </PageShell>
  );
}

// --------------------------------------------------
// ADD ASSIGNMENT
// --------------------------------------------------

function AddAssignment() {
  const navigate = useNavigate();
  const { addAssignment } = useApp();

  const [form, setForm] = useState({
    name: "",
    subject: "",
    dueDate: "2026-09-24",
    estimatedHours: "10",
    priority: "High",
    status: "Not started",
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    setErrors({});

    const nextErrors = {};

    if (!form.name.trim()) nextErrors.name = "Assignment name is required.";
    if (!form.subject.trim()) nextErrors.subject = "Subject is required.";
    if (!form.dueDate) nextErrors.dueDate = "Choose a due date.";

    if (!form.estimatedHours || Number(form.estimatedHours) <= 0) {
      nextErrors.estimatedHours = "Enter a positive number of hours.";
    }

    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);

    try {
      await addAssignment({
        name: form.name,
        subject: form.subject,
        dueDate: form.dueDate,
        estimatedHours: Number(form.estimatedHours),
        completedHours: 0,
        priority: form.priority,
        status: form.status,
        note: "",
      });
      navigate("/dashboard");
    } catch (error) {
      setErrors((previous) => ({
        ...previous,
        submit: error.message || "Could not save the assignment.",
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Add a new assignment"
      eyebrow="CAPTURE"
      action={
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={() => navigate("/dashboard")}
        >
          Back
        </Button>
      }
    >
      <div className="form-layout">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">ASSIGNMENT INPUTS</span>
              <h3>Give DeadlineMap the minimum data it needs.</h3>
            </div>
            <span className="privacy-note">Minimal by design</span>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <InputField
              label="Assignment name"
              required
              value={form.name}
              onChange={(v) => update({ name: v })}
              placeholder="e.g. Marketing Report"
              error={errors.name}
            />
            <InputField
              label="Subject"
              required
              value={form.subject}
              onChange={(v) => update({ subject: v })}
              placeholder="e.g. Marketing Strategy"
              error={errors.subject}
            />
            <InputField
              label="Due date"
              type="date"
              required
              value={form.dueDate}
              onChange={(v) => update({ dueDate: v })}
              error={errors.dueDate}
              hint="Clustered due dates push the forecast up."
            />
            <InputField
              label="Estimated effort (hours)"
              type="number"
              min="0.5"
              step="0.5"
              required
              value={form.estimatedHours}
              onChange={(v) => update({ estimatedHours: v })}
              error={errors.estimatedHours}
              hint="Realistic estimates keep the forecast meaningful."
            />
            <InputField
              label="Priority"
              options={["High", "Medium", "Low"]}
              value={form.priority}
              onChange={(v) => update({ priority: v })}
            />
            <InputField
              label="Status"
              options={["Not started", "In progress", "Completed"]}
              value={form.status}
              onChange={(v) => update({ status: v })}
            />

            {errors.submit && (
              <p role="alert" className="form-error">
                {errors.submit}
              </p>
            )}

            <div className="form-actions">
              <Button type="submit" icon={Check} disabled={saving}>
                {saving ? "Saving..." : "Save assignment"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>

        <aside className="panel insight-panel">
          <span className="eyebrow">WHY THIS MATTERS</span>
          <h3>Workload is not the same as a list of dates.</h3>
          <p>
            Estimated effort and progress give DeadlineMap enough context to
            explain when a week is becoming overloaded.
          </p>
          <div className="insight-mini">
            <Clock3 size={18} />
            <span>
              Risk = deadline clustering 40% + remaining effort 35% + progress
              deficit 25%. The forecast is a planning aid, not a diagnosis.
            </span>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// ASSIGNMENT DETAILS
// --------------------------------------------------

function AssignmentDetails() {
  const { id } = useParams();
  const { assignments } = useApp();
  const assignment = assignments.find((a) => String(a.id) === String(id));
  const navigate = useNavigate();

  if (!assignment) return <Navigate to="/dashboard" replace />;

  const itemRisk = assignmentRisk(assignment, assignments);

  return (
    <PageShell
      title={assignment.name}
      eyebrow="ASSIGNMENT DETAILS"
      action={
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={() => navigate("/dashboard")}
        >
          Back
        </Button>
      }
    >
      <section className="panel detail-hero">
        <div className="detail-head">
          <div>
            <span className="eyebrow">{assignment.subject}</span>
            <h2>{assignment.name}</h2>
            <p className="muted">{dueLabel(assignment)}</p>
          </div>

          <div className="detail-pills">
            <span
              className={`priority-pill priority-${assignment.priority.toLowerCase()}`}
            >
              {assignment.priority} priority
            </span>
            <span
              className={`status-pill status-pill-${statusSlug(assignment.status)}`}
            >
              {assignment.status}
            </span>
            <span
              className={`status-pill status-pill-${itemRisk.level.toLowerCase()}`}
            >
              {itemRisk.level} risk
            </span>
          </div>
        </div>

        <div className="detail-progress-row">
          <div>
            <span className="progress-caption">Current progress</span>
            <strong>{progressOf(assignment)}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progressOf(assignment)}%` }} />
          </div>
        </div>

        <div className="detail-metrics">
          <StatusCard
            title="Estimated"
            value={`${assignment.estimatedHours}h`}
            icon={Clock3}
            description="Total effort"
          />
          <StatusCard
            title="Completed"
            value={`${assignment.completedHours}h`}
            status="good"
            badge="Logged"
            tone="good"
            description="Logged so far"
          />
          <StatusCard
            title="Remaining"
            value={`${remainingHours(assignment)}h`}
            status="warning"
            badge="To plan"
            tone="warning"
            description="Still to plan"
          />
          <StatusCard
            title="Item risk"
            value={itemRisk.score}
            status={itemRisk.level === "HIGH" ? "warning" : "neutral"}
            badge={itemRisk.level}
            tone={itemRisk.level}
            icon={CircleAlert}
            description={itemRisk.note}
          />
        </div>

        <div className="action-callout">
          <div>
            <span className="eyebrow">NEXT ACTION</span>
            <strong>
              {assignment.note || "Set the next focused work block."}
            </strong>
          </div>
          <Button
            to={`/assignment/${assignment.id}/progress`}
            icon={ArrowRight}
          >
            Update progress
          </Button>
        </div>
      </section>
    </PageShell>
  );
}

// --------------------------------------------------
// UPDATE PROGRESS
// --------------------------------------------------

function UpdateProgress() {
  const { id } = useParams();
  const { assignments, updateAssignment, setSuccess } = useApp();
  const assignment = assignments.find((a) => String(a.id) === String(id));
  const navigate = useNavigate();

  const [progress, setProgress] = useState(
    assignment ? progressOf(assignment).toString() : "0"
  );
  const [hours, setHours] = useState(
    assignment ? assignment.completedHours.toString() : "0"
  );
  const [status, setStatus] = useState(
    assignment?.status || "In progress"
  );
  const [note, setNote] = useState(assignment?.note || "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (!assignment) return <Navigate to="/dashboard" replace />;

  const onProgressChange = (value) => {
    setProgress(value);
    setHours(String(hoursFromProgress(value, assignment.estimatedHours)));
    setError("");
  };

  const onHoursChange = (value) => {
    setHours(value);
    setProgress(
      String(
        progressOf({
          ...assignment,
          completedHours: Number(value) || 0,
        })
      )
    );
    setError("");
  };

  const draft = {
    ...assignment,
    completedHours: Number(hours) || 0,
  };
  const projected = assignmentRisk(draft, assignments);

  const submit = async (e) => {
    e.preventDefault();

    const requested = Number(hours);

    if (!Number.isFinite(requested) || requested < 0) {
      setError("Enter the hours completed as a number.");
      return;
    }

    if (requested > assignment.estimatedHours) {
      setError(
        `Hours cannot exceed the ${assignment.estimatedHours}h estimate.`
      );
      return;
    }

    const requestedProgress = Number(progress);
    if (
      !Number.isFinite(requestedProgress) ||
      requestedProgress < 0 ||
      requestedProgress > 100
    ) {
      setError("Progress must be between 0 and 100.");
      return;
    }

    const completed = Number(requested.toFixed(1));
    const nextStatus =
      completed >= assignment.estimatedHours ? "Completed" : status;

    setSaving(true);
    setError("");

    try {
      await updateAssignment(id, {
        completedHours: completed,
        status: nextStatus,
        note,
      });

      setSuccess({
        title: "Progress updated",
        message: `${assignment.name} progress was saved successfully.`,
      });

      navigate(`/assignment/${id}`);
    } catch (err) {
      setError(err.message || "Could not save progress.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      title="Update your progress"
      eyebrow="PROGRESS"
      action={
        <Button
          variant="ghost"
          icon={ArrowLeft}
          onClick={() => navigate(`/assignment/${id}`)}
        >
          Back
        </Button>
      }
    >
      <div className="form-layout">
        <section className="panel form-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">{assignment.name}</span>
              <h3>
                Log the work completed so the forecast stays meaningful.
              </h3>
            </div>
            <span className="panel-tag">{assignment.status}</span>
          </div>

          <form className="form-grid" onSubmit={submit}>
            <InputField
              label="Current progress (%)"
              type="number"
              min="0"
              max="100"
              step="1"
              required
              value={progress}
              onChange={onProgressChange}
              hint="Updates the hours field automatically."
            />
            <InputField
              label="Hours completed"
              type="number"
              min="0"
              max={assignment.estimatedHours}
              step="0.1"
              required
              value={hours}
              onChange={onHoursChange}
              error={error}
              hint={`Out of ${assignment.estimatedHours}h estimated.`}
            />
            <InputField
              label="Status"
              options={["Not started", "In progress", "Completed"]}
              value={status}
              onChange={setStatus}
            />
            <InputField
              label="Optional note"
              multiline
              wide
              value={note}
              onChange={setNote}
              placeholder="What is the next useful step?"
            />

            <div className="form-actions">
              <Button type="submit" icon={Check} disabled={saving}>
                {saving ? "Saving..." : "Save progress"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate(`/assignment/${id}`)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </section>

        <aside className="panel live-preview">
          <span className="eyebrow">LIVE PREVIEW</span>
          <ProgressCircle
            value={Number(progress || 0)}
            label="complete"
            tone={Number(progress) >= 100 ? "good" : "navy"}
          />

          <div>
            <strong>
              {Math.max(
                0,
                Number(
                  (
                    assignment.estimatedHours - Number(hours || 0)
                  ).toFixed(1)
                )
              )}
              h remaining
            </strong>
            <span>will flow into the workload forecast.</span>
          </div>

          <StatusCard
            compact
            title="Projected item risk"
            value={projected.score}
            status={projected.level === "HIGH" ? "warning" : "neutral"}
            badge={projected.level}
            tone={projected.level}
            description={projected.note}
          />
        </aside>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// WEEKLY WORKLOAD
// --------------------------------------------------

function Workload() {
  const { assignments } = useApp();
  const data = weeklyWorkload(assignments);
  const risk = calculateRisk(assignments);
  const peak = [...data].sort((a, b) => b.hours - a.hours)[0];
  const navigate = useNavigate();
  const max = Math.max(1, ...data.map((d) => d.hours));
  const weekHours = totalRemainingHours(assignments);
  const capacityPct = workloadPercent(assignments);
  const overloaded = peak ? peak.hours > DAILY_CAPACITY_HOURS : false;

  return (
    <PageShell
      title="Your week, visualised"
      eyebrow="WEEKLY WORKLOAD"
      action={
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard")}
          icon={ArrowLeft}
        >
          Dashboard
        </Button>
      }
    >
      <div className="week-summary">
        <StatusCard
          title="Remaining this week"
          value={`${weekHours}h`}
          status={capacityPct > 70 ? "warning" : "good"}
          icon={Clock3}
          description={`${capacityPct}% of the ${STUDY_WEEK_HOURS}h study-week budget`}
        />
        <StatusCard
          title="Peak day"
          value={peak?.day || "—"}
          status={overloaded ? "warning" : "good"}
          badge={overloaded ? "Over target" : "On target"}
          tone={overloaded ? "warning" : "good"}
          description={`${peak?.hours ?? 0}h estimated against a ${DAILY_CAPACITY_HOURS}h/day target`}
        />
        <StatusCard
          title="Workload risk"
          value={risk.score}
          status={risk.level === "HIGH" ? "warning" : "neutral"}
          badge={risk.level}
          tone={risk.level}
          icon={CircleAlert}
          description="Same transparent rule set as the risk forecast"
        />
      </div>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">WORKLOAD DISTRIBUTION</span>
            <h3>Where your remaining effort lands</h3>
          </div>
          <div className={`risk-chip risk-chip-${risk.level.toLowerCase()}`}>
            <CircleAlert size={15} />
            {risk.level} pressure
          </div>
        </div>

        <div className="chart-card">
          {data.map((d) => (
            <div
              className={`bar-column ${d.day === peak?.day ? "peak" : ""}`}
              key={d.day}
            >
              <div className="bar-value">{d.hours}h</div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ height: `${(d.hours / max) * 100}%` }}
                />
              </div>
              <span>{d.day}</span>
            </div>
          ))}
        </div>

        <div className="week-capacity">
          <ProgressCircle
            value={capacityPct}
            size={116}
            strokeWidth={10}
            label="of budget"
            tone={capacityPct > 70 ? "medium" : "good"}
          />

          <div>
            <span className="eyebrow">CAPACITY CHECK</span>
            <strong>
              {weekHours}h of {STUDY_WEEK_HOURS}h committed
            </strong>
            <p>
              {peak
                ? overloaded
                  ? `${peak.day} is your pressure point: ${peak.hours}h is estimated there against a ${DAILY_CAPACITY_HOURS}h/day target.`
                  : `${peak.day} carries the most effort at ${peak.hours}h, still inside the ${DAILY_CAPACITY_HOURS}h/day target.`
                : "Add an assignment to see how your remaining effort is distributed."}{" "}
              The ring shows how much of the four-day study-week budget your
              remaining work already uses.
            </p>
          </div>

          <Button onClick={() => navigate("/risk")} icon={ArrowRight}>
            View risk analysis
          </Button>
        </div>
      </section>
    </PageShell>
  );
}

// --------------------------------------------------
// RISK FORECAST
// --------------------------------------------------

function RiskForecast() {
  const { assignments } = useApp();
  const risk = calculateRisk(assignments);
  const navigate = useNavigate();
  const tone = risk.level.toLowerCase();

  return (
    <PageShell
      title="Workload intelligence"
      eyebrow="RISK FORECAST"
      action={
        <Button
          variant="ghost"
          onClick={() => navigate("/workload")}
          icon={ArrowLeft}
        >
          Back to week
        </Button>
      }
    >
      <div className="risk-layout">
        <section className={`panel risk-card risk-${tone}`}>
          <div className="risk-head">
            <div>
              <span className="eyebrow">PREDICTED WORKLOAD RISK</span>
              <h2>
                {risk.level === "HIGH"
                  ? "High pressure ahead"
                  : `${risk.level} workload pressure`}
              </h2>
              <p>{risk.confidenceNote}</p>
            </div>

            <ProgressCircle
              value={risk.score}
              label="risk"
              size={156}
              strokeWidth={11}
              tone={tone}
            />
          </div>

          <div className="risk-breakdown">
            <span className="eyebrow">
              HOW THE {risk.score}/100 SCORE IS BUILT
            </span>

            {risk.breakdown.map((factor) => (
              <div className="breakdown-row" key={factor.key}>
                <div className="breakdown-top">
                  <strong>{factor.label}</strong>
                  <span className="breakdown-points">{factor.points} pts</span>
                </div>

                <div className="breakdown-track">
                  <span
                    className="breakdown-fill"
                    style={{
                      width: `${Math.max(
                        0,
                        Math.min(
                          100,
                          factor.weightPct
                            ? (factor.points / factor.weightPct) * 100
                            : 0
                        )
                      )}%`,
                    }}
                  />
                </div>

                <span className="breakdown-meta">
                  Weight {factor.weightPct}% — {factor.points} of{" "}
                  {factor.weightPct} possible points.
                  {factor.explanation ? ` ${factor.explanation}` : ""}
                </span>
              </div>
            ))}
          </div>

          <div className="action-callout">
            <div>
              <span className="eyebrow">RECOMMENDED NEXT STEP</span>
              <strong>
                {risk.level === "HIGH"
                  ? "Start with the highest-risk assignment."
                  : risk.level === "MEDIUM"
                    ? "Review your upcoming workload and plan focused study blocks."
                    : "Keep your progress updated and maintain your study plan."}
              </strong>
            </div>

            <Button
              onClick={() => navigate("/dashboard")}
              icon={ArrowRight}
            >
              Return to dashboard
            </Button>
          </div>
        </section>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// APP ROUTES
// --------------------------------------------------

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />

        <Route
          path="/dashboard"
          element={
            <Protected>
              <Dashboard />
            </Protected>
          }
        />

        <Route
          path="/add-assignment"
          element={
            <Protected>
              <AddAssignment />
            </Protected>
          }
        />

        <Route
          path="/assignment/:id"
          element={
            <Protected>
              <AssignmentDetails />
            </Protected>
          }
        />

        <Route
          path="/assignment/:id/progress"
          element={
            <Protected>
              <UpdateProgress />
            </Protected>
          }
        />

        <Route
          path="/workload"
          element={
            <Protected>
              <Workload />
            </Protected>
          }
        />

        <Route
          path="/risk"
          element={
            <Protected>
              <RiskForecast />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
