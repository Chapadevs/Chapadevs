import React, { useState, useRef, useEffect } from 'react';
import Button from '../Button/Button';

const NavDropdown = ({ label, children, trigger, triggerClassName = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div 
      className="relative inline-block" 
      ref={dropdownRef}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      {/* Use custom trigger if provided, otherwise default to Button */}
      {trigger ? (
        <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
          {trigger}
        </div>
      ) : (
        <Button
          variant="ghost"
          className={`header-btn ${triggerClassName}`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {label}
        </Button>
      )}

      <div
        className={`
          absolute top-full right-0 min-w-[220px] py-3 z-[200]
          backdrop-blur-xl bg-white border border-white/20 shadow-xl
          transition-all duration-200 ease-out
          ${isOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible pointer-events-none'}
        `}
      >
        {/* Close dropdown when any item inside is clicked */}
        <div onClick={() => setIsOpen(false)}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default NavDropdown;