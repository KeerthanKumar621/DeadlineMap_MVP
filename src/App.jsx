import React, { createContext, useContext, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronRight, CircleAlert, Clock3, Plus, Sparkles, Target } from 'lucide-react';
import Button from './components/Button';
import InputField from './components/InputField';
import StatusCard from './components/StatusCard';
import PageShell from './components/PageShell';
import ProgressCircle from './third-party/ProgressCircle';
import { seedAssignments } from './data/seed';
import {
  assignmentRisk,
  buildPlan,
  calculateRisk,
  DAILY_CAPACITY_HOURS,
  dueLabel,
  hoursFromProgress,
  planTotalHours,
  progressOf,
  projectRiskAfterPlan,
  remainingHours,
  STUDY_WEEK_HOURS,
  totalRemainingHours,
  weeklyWorkload,
  workloadPercent,
} from './utils/workload';

const AppContext = createContext(null);
const useApp = () => useContext(AppContext);

/** 'In progress' -> 'in-progress' (status indicator class names). */
const statusSlug = (status) => (status || 'Not started').toLowerCase().replace(/[^a-z]+/g, '-');

function AppProvider({ children }) {
  const [assignments, setAssignments] = useState(seedAssignments);
  const [user, setUser] = useState(null);
  const [success, setSuccess] = useState(null);

  const value = useMemo(() => ({
    assignments,
    user,
    success,
    setUser,
    setSuccess,
    resetDemo: () => {
      setAssignments(seedAssignments);
      setSuccess(null);
    },
    addAssignment: (assignment) => setAssignments((prev) => [...prev, { ...assignment, id: `${Date.now()}` }]),
    updateAssignment: (id, patch) => setAssignments((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a)),
  }), [assignments, user, success]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function Protected({ children }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AuthLayout({ title, subtitle, children, switchText, switchTo }) {
  const navigate = useNavigate();
  return (
    <div className="auth-shell">
      <div className="auth-visual">
        <div className="auth-hero-card">
          <span className="micro-pill">EARLY WARNING SYSTEM</span>
          <h2>See the pressure before the deadline does.</h2>
          <p>DeadlineMap turns due dates, estimated effort and progress into a transparent workload forecast and next action.</p>
          <div className="hero-stat"><div><span>Current workload</span><strong>74%</strong></div><div className="mini-bar"><span style={{ width: '74%' }} /></div></div>
        </div>
      </div>
      <div className="auth-panel">
        <div className="auth-brand"><div className="brand-icon">D</div><strong>DeadlineMap</strong></div>
        <div className="auth-content">
          <span className="eyebrow">STUDENT WORKLOAD INTELLIGENCE</span>
          <h1>{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <p className="auth-switch">{switchText} <button onClick={() => navigate(switchTo)}>{switchTo === '/login' ? 'Login' : 'Create an account'}</button></p>
        </div>
      </div>
    </div>
  );
}

function SignUp() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const { setUser } = useApp();
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.confirm) return setError('Please complete all required fields.');
    if (form.password !== form.confirm) return setError('Passwords do not match.');
    setUser({ name: form.name, email: form.email });
    navigate('/dashboard');
  };
  return (
    <AuthLayout title="Create your workload map" subtitle="Set up a lightweight planning space for your next study week." switchText="Already have an account?" switchTo="/login">
      <form className="stack-lg" onSubmit={submit}>
        <InputField label="Full name" required value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Enter your full name" />
        <InputField label="University email" type="email" required value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="student@university.edu" />
        <InputField label="Password" type="password" required value={form.password} onChange={(v) => setForm({ ...form, password: v })} placeholder="Create a password" />
        <InputField label="Confirm password" type="password" required value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} placeholder="Enter password again" error={error} />
        <Button type="submit" icon={ArrowRight}>Create an account</Button>
      </form>
    </AuthLayout>
  );
}

function Login() {
  const [email, setEmail] = useState('student@university.edu');
  const [password, setPassword] = useState('deadline');
  const [error, setError] = useState('');
  const { setUser } = useApp();
  const navigate = useNavigate();
  const submit = (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Enter both email and password to continue.');
    setUser({ name: 'Keerthan', email });
    navigate('/dashboard');
  };
  return (
    <AuthLayout title="Welcome back" subtitle="Pick up where you left off and see what needs your attention this week." switchText="New to DeadlineMap?" switchTo="/signup">
      <form className="stack-lg" onSubmit={submit}>
        <InputField label="University email" type="email" value={email} onChange={setEmail} placeholder="student@university.edu" />
        <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="Enter password" error={error} />
        <Button type="submit" icon={ArrowRight}>Login</Button>
        <div className="demo-hint"><strong>Demo access</strong><span>Any non-empty email/password will open the prototype.</span></div>
      </form>
    </AuthLayout>
  );
}

function Dashboard() {
  const { assignments, user } = useApp();
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
  const topContributor = [...risk.breakdown].sort((a, b) => b.points - a.points)[0];
  return (
    <PageShell title="Your workload at a glance" eyebrow="DASHBOARD" action={<Button icon={Plus} onClick={() => navigate('/add-assignment')}>Add assignment</Button>}>
      <section className="welcome-row">
        <div><span className="eyebrow">GOOD MORNING, {user?.name || 'STUDENT'}</span><h2>Make the next week feel manageable.</h2><p className="muted">Capture the work, understand the pressure, then act before it compounds.</p></div>
        <div className={`risk-chip risk-chip-${risk.level.toLowerCase()}`}><CircleAlert size={16} /><span>{risk.level === 'HIGH' ? 'High workload risk' : `${risk.level} workload pressure`}</span></div>
      </section>

      <div className="stats-grid">
        <StatusCard title="Remaining effort" value={`${remaining}h`} status={workload > 70 ? 'warning' : 'good'} change={plannedHours ? `-${plannedHours}` : undefined} icon={Clock3} description={`Today's plan can clear ${plannedHours}h of it`} />
        <StatusCard title="Current workload" value={`${workload}%`} status={workload > 70 ? 'warning' : 'good'} badge={`${risk.level} risk`} tone={risk.level} icon={CircleAlert} description={`Against a ${STUDY_WEEK_HOURS}h study-week budget`} />
        <StatusCard title={`Next ${dueSoon === 1 ? 'deadline' : 'deadlines'}`} value={dueSoon} status={dueSoon > 1 ? 'warning' : 'neutral'} badge={`${assignments.length} tracked`} tone="neutral" icon={CalendarDays} description="Due inside the three-day clustering window" />
      </div>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-heading"><div><span className="eyebrow">UPCOMING ASSIGNMENTS</span><h3>What is on your plate?</h3></div><span className="panel-tag">Live mock data</span></div>
          <div className="assignment-list">
            {assignments.map((assignment) => {
              const itemRisk = assignmentRisk(assignment, assignments);
              return (
                <button key={assignment.id} className="assignment-row" onClick={() => navigate(`/assignment/${assignment.id}`)}>
                  <div className={`assignment-dot priority-${assignment.priority.toLowerCase()}`} />
                  <div className="assignment-main">
                    <strong>{assignment.name}</strong>
                    <span>{assignment.subject}</span>
                    <div className="assignment-sub">
                      <span className="due-text">{dueLabel(assignment)}</span>
                      <span className={`status-pill status-pill-${statusSlug(assignment.status)}`}>{assignment.status}</span>
                      <span className={`status-pill status-pill-${itemRisk.level.toLowerCase()}`}>{itemRisk.level} risk</span>
                    </div>
                  </div>
                  <div className="assignment-meta"><strong>{progressOf(assignment)}%</strong><span>{remainingHours(assignment)}h left</span><ChevronRight size={18} /></div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="panel featured-panel">
          <div className="feature-orb"><Sparkles size={22} /></div>
          <span className="eyebrow">RISK FORECAST</span>
          <h3>Don't just see a deadline. See the pressure behind it.</h3>
          <p>Deadline clustering, remaining effort and progress are combined into a transparent 0-100 planning heuristic.</p>
          <div className="feature-score"><strong>{risk.score}</strong><span>/ 100</span></div>
          {topContributor ? (
            <p className="muted">Biggest contributor: {topContributor.label} - {topContributor.points} of its {topContributor.weightPct} possible points.</p>
          ) : null}
          <Button to="/risk" icon={ArrowRight}>View risk analysis</Button>
        </section>
      </div>

      <section className="next-step-banner">
        <div><span className="eyebrow">NEXT STEP</span><strong>Open your weekly workload</strong><span>Spot where the effort is concentrated before you choose what to work on.</span></div>
        <Button variant="secondary" to="/workload" icon={ArrowRight}>View this week</Button>
      </section>
    </PageShell>
  );
}

function AddAssignment() {
  const navigate = useNavigate();
  const { addAssignment } = useApp();
  const [form, setForm] = useState({ name: '', subject: '', dueDate: '2026-09-24', estimatedHours: '10', priority: 'High', status: 'Not started' });
  const [errors, setErrors] = useState({});
  const update = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const submit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Assignment name is required.';
    if (!form.subject.trim()) nextErrors.subject = 'Subject is required.';
    if (!form.dueDate) nextErrors.dueDate = 'Choose a due date.';
    if (!form.estimatedHours || Number(form.estimatedHours) <= 0) nextErrors.estimatedHours = 'Enter a positive number of hours.';
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    addAssignment({
      name: form.name,
      subject: form.subject,
      dueDate: form.dueDate,
      estimatedHours: Number(form.estimatedHours),
      completedHours: 0,
      priority: form.priority,
      status: form.status,
      note: '',
    });
    navigate('/dashboard');
  };
  return (
    <PageShell title="Add a new assignment" eyebrow="CAPTURE" action={<Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>Back</Button>}>
      <div className="form-layout">
        <section className="panel form-panel">
          <div className="panel-heading"><div><span className="eyebrow">ASSIGNMENT INPUTS</span><h3>Give DeadlineMap the minimum data it needs.</h3></div><span className="privacy-note">Minimal by design</span></div>
          <form className="form-grid" onSubmit={submit}>
            <InputField label="Assignment name" required value={form.name} onChange={(v) => update({ name: v })} placeholder="e.g. Marketing Report" error={errors.name} />
            <InputField label="Subject" required value={form.subject} onChange={(v) => update({ subject: v })} placeholder="e.g. Marketing Strategy" error={errors.subject} />
            <InputField label="Due date" type="date" required value={form.dueDate} onChange={(v) => update({ dueDate: v })} error={errors.dueDate} hint="Clustered due dates push the forecast up." />
            <InputField label="Estimated effort (hours)" type="number" min="0.5" step="0.5" required value={form.estimatedHours} onChange={(v) => update({ estimatedHours: v })} error={errors.estimatedHours} hint="Realistic estimates keep the forecast meaningful." />
            <InputField label="Priority" options={['High', 'Medium', 'Low']} value={form.priority} onChange={(v) => update({ priority: v })} />
            <InputField label="Status" options={['Not started', 'In progress', 'Completed']} value={form.status} onChange={(v) => update({ status: v })} />
            <div className="form-actions"><Button type="submit" icon={Check}>Save assignment</Button><Button variant="secondary" onClick={() => navigate('/dashboard')}>Cancel</Button></div>
          </form>
        </section>
        <aside className="panel insight-panel"><span className="eyebrow">WHY THIS MATTERS</span><h3>Workload is not the same as a list of dates.</h3><p>Estimated effort and progress give DeadlineMap enough context to explain when a week is becoming overloaded.</p><div className="insight-mini"><Clock3 size={18} /><span>Risk = deadline clustering 40% + remaining effort 35% + progress deficit 25%. The forecast is a planning aid, not a diagnosis.</span></div></aside>
      </div>
    </PageShell>
  );
}

function AssignmentDetails() {
  const { id } = useParams();
  const { assignments } = useApp();
  const assignment = assignments.find((a) => a.id === id);
  const navigate = useNavigate();
  if (!assignment) return <Navigate to="/dashboard" replace />;
  const itemRisk = assignmentRisk(assignment, assignments);
  return (
    <PageShell title={assignment.name} eyebrow="ASSIGNMENT DETAILS" action={<Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/dashboard')}>Back</Button>}>
      <section className="panel detail-hero">
        <div className="detail-head">
          <div><span className="eyebrow">{assignment.subject}</span><h2>{assignment.name}</h2><p className="muted">{dueLabel(assignment)}</p></div>
          <div className="detail-pills">
            <span className={`priority-pill priority-${assignment.priority.toLowerCase()}`}>{assignment.priority} priority</span>
            <span className={`status-pill status-pill-${statusSlug(assignment.status)}`}>{assignment.status}</span>
            <span className={`status-pill status-pill-${itemRisk.level.toLowerCase()}`}>{itemRisk.level} risk</span>
          </div>
        </div>
        <div className="detail-progress-row"><div><span className="progress-caption">Current progress</span><strong>{progressOf(assignment)}%</strong></div><div className="progress-track"><span style={{ width: `${progressOf(assignment)}%` }} /></div></div>
        <div className="detail-metrics">
          <StatusCard title="Estimated" value={`${assignment.estimatedHours}h`} icon={Clock3} description="Total effort" />
          <StatusCard title="Completed" value={`${assignment.completedHours}h`} status="good" badge="Logged" tone="good" description="Logged so far" />
          <StatusCard title="Remaining" value={`${remainingHours(assignment)}h`} status="warning" badge="To plan" tone="warning" description="Still to plan" />
          <StatusCard title="Item risk" value={itemRisk.score} status={itemRisk.level === 'HIGH' ? 'warning' : 'neutral'} badge={itemRisk.level} tone={itemRisk.level} icon={CircleAlert} description={itemRisk.note} />
        </div>
        <div className="action-callout"><div><span className="eyebrow">NEXT ACTION</span><strong>{assignment.note || 'Set the next focused work block.'}</strong></div><Button to={`/assignment/${assignment.id}/progress`} icon={ArrowRight}>Update progress</Button></div>
      </section>
    </PageShell>
  );
}

function UpdateProgress() {
  const { id } = useParams();
  const { assignments, updateAssignment, setSuccess } = useApp();
  const assignment = assignments.find((a) => a.id === id);
  const navigate = useNavigate();
  const [progress, setProgress] = useState(assignment ? progressOf(assignment).toString() : '0');
  const [hours, setHours] = useState(assignment ? assignment.completedHours.toString() : '0');
  const [status, setStatus] = useState(assignment?.status || 'In progress');
  const [note, setNote] = useState(assignment?.note || '');
  const [error, setError] = useState('');
  if (!assignment) return <Navigate to="/dashboard" replace />;

  // Percentage and hours stay in sync; completedHours is the stored truth.
  const onProgressChange = (value) => {
    setProgress(value);
    setHours(String(hoursFromProgress(value, assignment.estimatedHours)));
    setError('');
  };
  const onHoursChange = (value) => {
    setHours(value);
    setProgress(String(progressOf({ ...assignment, completedHours: Number(value) || 0 })));
    setError('');
  };

  const draft = { ...assignment, completedHours: Number(hours) || 0 };
  const projected = assignmentRisk(draft, assignments);

  const submit = (e) => {
    e.preventDefault();
    const requested = Number(hours);
    if (!Number.isFinite(requested) || requested < 0) return setError('Enter the hours completed as a number.');
    if (requested > assignment.estimatedHours) return setError(`Hours cannot exceed the ${assignment.estimatedHours}h estimate.`);
    const completed = Number(requested.toFixed(1));
    const nextStatus = completed >= assignment.estimatedHours ? 'Completed' : status;
    updateAssignment(id, { completedHours: completed, status: nextStatus, note });
    setSuccess({
      title: 'Progress updated',
      message: `${assignment.name} is now ${progressOf({ ...assignment, completedHours: completed })}% complete. Your workload forecast has been refreshed.`,
    });
    navigate(`/assignment/${id}`);
  };
  return (
    <PageShell title="Update your progress" eyebrow="PROGRESS" action={<Button variant="ghost" icon={ArrowLeft} onClick={() => navigate(`/assignment/${id}`)}>Back</Button>}>
      <div className="form-layout">
        <section className="panel form-panel">
          <div className="panel-heading"><div><span className="eyebrow">{assignment.name}</span><h3>Log the work completed so the forecast stays meaningful.</h3></div><span className="panel-tag">{assignment.status}</span></div>
          <form className="form-grid" onSubmit={submit}>
            <InputField label="Current progress (%)" type="number" min="0" max="100" step="1" required value={progress} onChange={onProgressChange} hint="Updates the hours field automatically." />
            <InputField label="Hours completed" type="number" min="0" max={assignment.estimatedHours} step="0.1" required value={hours} onChange={onHoursChange} error={error} hint={`Out of ${assignment.estimatedHours}h estimated.`} />
            <InputField label="Status" options={['Not started', 'In progress', 'Completed']} value={status} onChange={setStatus} />
            <InputField label="Optional note" multiline wide value={note} onChange={setNote} placeholder="What is the next useful step?" />
            <div className="form-actions"><Button type="submit" icon={Check}>Save progress</Button><Button variant="secondary" onClick={() => navigate(`/assignment/${id}`)}>Cancel</Button></div>
          </form>
        </section>
        <aside className="panel live-preview">
          <span className="eyebrow">LIVE PREVIEW</span>
          <ProgressCircle value={Number(progress || 0)} label="complete" tone={Number(progress) >= 100 ? 'good' : 'navy'} />
          <div><strong>{Math.max(0, Number((assignment.estimatedHours - Number(hours || 0)).toFixed(1)))}h remaining</strong><span>will flow into the workload forecast.</span></div>
          <StatusCard compact title="Projected item risk" value={projected.score} status={projected.level === 'HIGH' ? 'warning' : 'neutral'} badge={projected.level} tone={projected.level} description={projected.note} />
        </aside>
      </div>
    </PageShell>
  );
}

function Workload() {
  const { assignments } = useApp();
  const data = weeklyWorkload(assignments);
  const risk = calculateRisk(assignments);
  const peak = [...data].sort((a, b) => b.hours - a.hours)[0];
  const navigate = useNavigate();
  const max = Math.max(1, ...data.map((d) => d.hours));
  const weekHours = totalRemainingHours(assignments);
  const capacityPct = workloadPercent(assignments);
  const overloaded = peak.hours > DAILY_CAPACITY_HOURS;
  return (
    <PageShell title="Your week, visualised" eyebrow="WEEKLY WORKLOAD" action={<Button variant="ghost" onClick={() => navigate('/dashboard')} icon={ArrowLeft}>Dashboard</Button>}>
      <div className="week-summary">
        <StatusCard title="Remaining this week" value={`${weekHours}h`} status={capacityPct > 70 ? 'warning' : 'good'} icon={Clock3} description={`${capacityPct}% of the ${STUDY_WEEK_HOURS}h study-week budget`} />
        <StatusCard title="Peak day" value={peak.day} status={overloaded ? 'warning' : 'good'} badge={overloaded ? 'Over target' : 'On target'} tone={overloaded ? 'warning' : 'good'} description={`${peak.hours}h estimated against a ${DAILY_CAPACITY_HOURS}h/day target`} />
        <StatusCard title="Workload risk" value={risk.score} status={risk.level === 'HIGH' ? 'warning' : 'neutral'} badge={risk.level} tone={risk.level} icon={CircleAlert} description="Same transparent rule set as the risk forecast" />
      </div>
      <section className="panel">
        <div className="panel-heading"><div><span className="eyebrow">WORKLOAD DISTRIBUTION</span><h3>Where your remaining effort lands</h3></div><div className={`risk-chip risk-chip-${risk.level.toLowerCase()}`}><CircleAlert size={15} /> {risk.level} pressure</div></div>
        <div className="chart-card">
          {data.map((d) => (
            <div className={`bar-column ${d.day === peak.day ? 'peak' : ''}`} key={d.day}>
              <div className="bar-value">{d.hours}h</div>
              <div className="bar-track"><div className="bar-fill" style={{ height: `${(d.hours / max) * 100}%` }} /></div>
              <span>{d.day}</span>
            </div>
          ))}
        </div>
        <div className="week-capacity">
          <ProgressCircle value={capacityPct} size={116} strokeWidth={10} label="of budget" tone={capacityPct > 70 ? 'medium' : 'good'} />
          <div>
            <span className="eyebrow">CAPACITY CHECK</span>
            <strong>{weekHours}h of {STUDY_WEEK_HOURS}h committed</strong>
            <p>{overloaded ? `${peak.day} is your pressure point: ${peak.hours}h is estimated there against a ${DAILY_CAPACITY_HOURS}h/day target.` : `${peak.day} carries the most effort at ${peak.hours}h, still inside the ${DAILY_CAPACITY_HOURS}h/day target.`} The ring shows how much of the four-day study-week budget your remaining work already uses.</p>
          </div>
          <Button onClick={() => navigate('/risk')} icon={ArrowRight}>View risk analysis</Button>
        </div>
      </section>
    </PageShell>
  );
}

function RiskForecast() {
  const { assignments } = useApp();
  const risk = calculateRisk(assignments);
  const navigate = useNavigate();
  const tone = risk.level.toLowerCase();
  return (
    <PageShell title="Workload intelligence" eyebrow="RISK FORECAST" action={<Button variant="ghost" onClick={() => navigate('/workload')} icon={ArrowLeft}>Back to week</Button>}>
      <div className="risk-layout">
        <section className={`panel risk-card risk-${tone}`}>
          <div className="risk-head"><div><span className="eyebrow">PREDICTED WORKLOAD RISK</span><h2>{risk.level === 'HIGH' ? 'High pressure ahead' : `${risk.level} workload pressure`}</h2><p>{risk.confidenceNote}</p></div><ProgressCircle value={risk.score} label="risk" size={156} strokeWidth={11} tone={tone} /></div>
          <div className="risk-breakdown">
            <span className="eyebrow">HOW THE {risk.score}/100 SCORE IS BUILT</span>
            {risk.breakdown.map((factor) => (
              <div className="breakdown-row" key={factor.key}>
                <div className="breakdown-top"><strong>{factor.label}</strong><span className="breakdown-points">{factor.points} pts</span></div>
                <div className="breakdown-track"><span className="breakdown-fill" style={{ width: `${Math.round(factor.signal * 100)}%` }} /></div>
                <span className="breakdown-meta"><span className="breakdown-weight">Weight {factor.weightPct}%</span> - signal {Math.round(factor.signal * 100)}% - {factor.points} of {factor.weightPct} points. {factor.explanation}</span>
              </div>
            ))}
            <span className="breakdown-meta">Weighted total: {risk.breakdown.map((f) => f.points).join(' + ')} = {risk.score} / 100.</span>
          </div>
          <div className="risk-reasons"><span className="eyebrow">WHY YOUR RISK IS {risk.level}</span>{risk.factors.map((factor, i) => <div className="reason" key={i}><div className="reason-icon">{i + 1}</div><span>{factor}</span></div>)}</div>
        </section>
        <aside className="panel decision-panel"><span className="eyebrow">TURN WARNING INTO ACTION</span><h3>What should you work on first?</h3><p>DeadlineMap prioritises high-impact work blocks using the same transparent rule set as the forecast.</p><Button onClick={() => navigate('/plan')} icon={ArrowRight}>View recommended plan</Button><div className="decision-foot"><Target size={17} /><span>Focus on the next useful action, not a perfect prediction. The score is a planning heuristic, not a diagnosis.</span></div></aside>
      </div>
    </PageShell>
  );
}

function RecommendedPlan() {
  const { assignments, setSuccess } = useApp();
  const plan = buildPlan(assignments);
  const projection = projectRiskAfterPlan(assignments, plan);
  const navigate = useNavigate();
  const improves = projection.delta < 0;
  const accept = () => {
    const stillHigh = projection.after.level === 'HIGH';
    setSuccess({
      title: stillHigh ? 'Plan accepted - risk is still high' : 'Plan accepted',
      message: stillHigh
        ? `The accepted blocks clear ${projection.plannedHours}h, but the forecast only moves from ${projection.before.score} to ${projection.after.score}/100 (${projection.after.level}). Add capacity or reduce scope on the highest-risk assignment.`
        : `The accepted blocks clear ${projection.plannedHours}h and move the forecast from ${projection.before.score} to ${projection.after.score}/100 (${projection.after.level}).`,
      outcome: stillHigh ? 'failure' : 'success',
      before: { score: projection.before.score, level: projection.before.level },
      after: { score: projection.after.score, level: projection.after.level },
      plannedHours: projection.plannedHours,
    });
    navigate('/success');
  };
  return (
    <PageShell title="Recommended plan" eyebrow="PERSONALISED ACTIONS" action={<Button variant="ghost" onClick={() => navigate('/risk')} icon={ArrowLeft}>Back to risk</Button>}>
      <section className="panel plan-panel">
        <div className="plan-intro"><div><span className="eyebrow">TODAY</span><h2>Focus on the work that reduces pressure fastest.</h2><p className="muted">Ordered by priority first, then remaining effort. Every block is capped at the hours that assignment still needs.</p></div><div className={`plan-impact ${improves ? 'plan-impact-improved' : 'plan-impact-unchanged'}`}><span>Forecast after plan</span><strong>{projection.after.score}</strong><small>{projection.delta} risk points from {projection.before.score}</small></div></div>
        <div className="plan-list">
          {plan.map((item) => (
            <button key={item.id} className="plan-row" onClick={() => navigate(`/assignment/${item.id}`)}>
              <div className={`plan-time priority-${item.priority.toLowerCase()}`}>{item.block}</div>
              <div className="plan-main"><span>{item.subject}</span><strong>{item.name}</strong><small>Work for {item.duration}h - {item.remaining}h remaining</small><small className="plan-reason">Why: {item.reason}</small></div>
              <div className="plan-priority">{item.priority.toUpperCase()}</div>
              <ChevronRight size={18} />
            </button>
          ))}
          {!plan.length ? <div className="plan-empty">Every assignment is complete, so there is nothing left to schedule.</div> : null}
        </div>
        <div className="plan-summary">
          <div className="week-summary">
            <StatusCard title="Planned today" value={`${projection.plannedHours}h`} icon={Clock3} description={`Across ${plan.length} focus block${plan.length === 1 ? '' : 's'}`} />
            <StatusCard title="Forecast now" value={projection.before.score} status={projection.before.level === 'HIGH' ? 'warning' : 'neutral'} badge={projection.before.level} tone={projection.before.level} description="Before the plan is worked" />
            <StatusCard title="Forecast after" value={projection.after.score} status={projection.after.level === 'HIGH' ? 'warning' : 'good'} change={projection.delta ? `${projection.delta}` : undefined} description={`Risk level ${projection.after.level} if these blocks are completed`} />
          </div>
        </div>
        <div className="plan-actions"><Button icon={Check} onClick={accept}>Accept recommended plan</Button><Button variant="secondary" onClick={() => navigate('/dashboard')}>Keep planning</Button></div>
      </section>
    </PageShell>
  );
}

function Outcome() {
  const { success, resetDemo } = useApp();
  const navigate = useNavigate();
  const failed = success?.outcome === 'failure';
  return (
    <div className="success-shell">
      <div className={`success-card ${failed ? 'outcome-failure' : ''}`}>
        <div className="success-icon">{failed ? <CircleAlert size={30} /> : <Check size={34} />}</div>
        <span className="eyebrow">{failed ? 'ACTION NEEDED' : 'ACTION COMPLETE'}</span>
        <h1>{success?.title || 'Plan updated'}</h1>
        <p>{success?.message || 'Your action was completed successfully.'}</p>
        {success?.after ? (
          <div className="outcome-forecast">
            <StatusCard compact title="Forecast before" value={success.before.score} badge={success.before.level} tone={success.before.level} description="Transparent 0-100 planning heuristic" />
            <StatusCard compact title="Forecast after" value={success.after.score} badge={success.after.level} tone={success.after.level} description="If the accepted blocks are completed" />
            <StatusCard compact title="Work cleared" value={`${success.plannedHours}h`} status={failed ? 'warning' : 'good'} badge={failed ? 'Not enough' : 'On track'} tone={failed ? 'warning' : 'good'} description="Accepted focus blocks" />
          </div>
        ) : null}
        <div className="success-summary">
          <div><span>Next</span><strong>{failed ? 'Add capacity or reduce scope on the highest-risk assignment.' : 'Follow your focused work blocks and log progress as you go.'}</strong></div>
          <div><span>Remember</span><strong>The forecast is a planning aid, not a diagnosis or a prediction of academic success.</strong></div>
        </div>
        <div className="outcome-actions">
          {failed ? <Button onClick={() => navigate('/risk')} icon={ArrowRight}>Review the risk breakdown</Button> : null}
          <Button variant={failed ? 'secondary' : 'primary'} onClick={() => navigate('/dashboard')} icon={ArrowRight}>Return to dashboard</Button>
          <Button variant="ghost" onClick={() => { resetDemo(); navigate('/dashboard'); }}>Reset demo data</Button>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/signup" replace />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/add-assignment" element={<Protected><AddAssignment /></Protected>} />
        <Route path="/assignment/:id" element={<Protected><AssignmentDetails /></Protected>} />
        <Route path="/assignment/:id/progress" element={<Protected><UpdateProgress /></Protected>} />
        <Route path="/workload" element={<Protected><Workload /></Protected>} />
        <Route path="/risk" element={<Protected><RiskForecast /></Protected>} />
        <Route path="/plan" element={<Protected><RecommendedPlan /></Protected>} />
        <Route path="/success" element={<Protected><Outcome /></Protected>} />
        <Route path="*" element={<Navigate to="/signup" replace />} />
      </Routes>
    </AppProvider>
  );
}

export default App;
