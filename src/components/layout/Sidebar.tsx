import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Timer, BarChart2, Settings, ListTodo, Clock, Calendar } from 'lucide-react';
import './styles/Sidebar.css';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'Dashboard',
    icon: <Home size={18} />
  },
  {
    path: '/tasks',
    label: 'Tasks',
    icon: <ListTodo size={18} />
  },
  {
    path: '/tracker',
    label: 'Tracker',
    icon: <Clock size={18} />
  },
  {
    path: '/focus',
    label: 'Focus',
    icon: <Timer size={18} />
  },
  {
    path: '/stats',
    label: 'Statystyki',
    icon: <BarChart2 size={18} />
  },
  {
    path: '/settings',
    label: 'Ustawienia',
    icon: <Settings size={18} />
  },
  {
  path: '/calendar',
  label: 'Calendar',
  icon: <Calendar size={18} />
},

];

const Sidebar: React.FC = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">Mobius</div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
            }
          >
            <span className="sidebar__icon">{item.icon}</span>
            <span className="sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;