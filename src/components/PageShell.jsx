import React from 'react';
import { Home, LayoutGrid, Plus, ShieldAlert, UserCircle, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Home', Icon: Home },
  { to: '/workload', label: 'Week', Icon: LayoutGrid },
  { to: '/risk', label: 'Risk', Icon: ShieldAlert },
];

export default function PageShell({ children, title, eyebrow, action }) {
  return (
    <div className="app-frame">
      <aside className="sidebar">
        <div className="brand-mark"><span>D</span><div><strong>DeadlineMap</strong><small>Student workload intelligence</small></div></div>
        <nav className="side-nav">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
              <Icon size={18} /><span>{label}</span>
            </NavLink>
          ))}
          <NavLink to="/add-assignment" className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}>
            <Plus size={18} /><span>Add assignment</span>
          </NavLink>
        </nav>
        <div className="sidebar-note">
          <div className="mini-shield">◎</div>
          <p><strong>Planning, not diagnosis.</strong><br />Risk scores explain workload pressure so you can act earlier.</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <div className="eyebrow">{eyebrow || 'DEADLINEMAP'}</div>
            <h1>{title}</h1>
          </div>
          <div className="top-actions">
            {action}
            <div className="avatar"><UserCircle size={22} /></div>
          </div>
        </header>
        <div className="content-inner">{children}</div>
      </main>

      <nav className="mobile-nav">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `mobile-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
        <NavLink to="/add-assignment" className="mobile-link"><Plus size={18} /><span>Add</span></NavLink>
      </nav>
    </div>
  );
}
