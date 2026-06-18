import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Timer, BarChart2, ListTodo, Clock, Calendar, X } from 'lucide-react';
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
    label: 'Statistics',
    icon: <BarChart2 size={18} />
  },
  {
    path: '/calendar',
    label: 'Calendar',
    icon: <Calendar size={18} />
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {isOpen && <div className="sidebar__backdrop" onClick={onClose} />}
      <aside className={'sidebar' + (isOpen ? ' sidebar--open' : '')}>
        <div className="sidebar__header">
          <div className="sidebar__logo">Mobius</div>
          <button className="sidebar__close" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                'sidebar__link' + (isActive ? ' sidebar__link--active' : '')
              }
              onClick={onClose}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;