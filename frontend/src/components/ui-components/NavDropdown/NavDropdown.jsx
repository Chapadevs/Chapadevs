import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import Button from '../Button/Button';

const DROPDOWN_WIDTH = 160;
const VIEWPORT_PADDING = 8;

const CLOSE_DELAY_MS = 150;

const NavDropdown = ({ label, children, trigger, align: alignProp = 'auto' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef(null);
  const dropdownContentRef = useRef(null);
  const closeTimeoutRef = useRef(null);

  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(event.target)
      ) {
        clearCloseTimeout();
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      clearCloseTimeout();
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current || !dropdownContentRef.current) return;

    const updatePosition = () => {
      const triggerEl = containerRef.current;
      const dropdownEl = dropdownContentRef.current;
      if (!triggerEl || !dropdownEl) return;

      const triggerRect = triggerEl.getBoundingClientRect();
      const dropdownRect = dropdownEl.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const spaceOnRight = viewportWidth - triggerRect.right - VIEWPORT_PADDING;
      const spaceOnLeft = triggerRect.left - VIEWPORT_PADDING;
      const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_PADDING;
      const spaceAbove = triggerRect.top - VIEWPORT_PADDING;

      let left;
      if (alignProp === 'left') {
        left = triggerRect.left;
      } else if (alignProp === 'right') {
        left = triggerRect.right - DROPDOWN_WIDTH;
      } else {
        // auto: choose side with more space
        if (spaceOnRight >= DROPDOWN_WIDTH) {
          left = triggerRect.left;
        } else if (spaceOnLeft >= DROPDOWN_WIDTH) {
          left = triggerRect.right - DROPDOWN_WIDTH;
        } else {
          // Not enough space on either side - prefer the side with more space
          left =
            spaceOnRight >= spaceOnLeft
              ? triggerRect.left
              : triggerRect.right - DROPDOWN_WIDTH;
        }
      }

      // Clamp to viewport
      left = Math.max(VIEWPORT_PADDING, Math.min(viewportWidth - DROPDOWN_WIDTH - VIEWPORT_PADDING, left));

      let top;
      if (spaceBelow >= dropdownRect.height) {
        top = triggerRect.bottom + VIEWPORT_PADDING;
      } else if (spaceAbove >= dropdownRect.height) {
        top = triggerRect.top - dropdownRect.height - VIEWPORT_PADDING;
      } else {
        // Prefer below, but clamp if needed
        top =
          spaceBelow >= spaceAbove
            ? triggerRect.bottom + VIEWPORT_PADDING
            : triggerRect.top - dropdownRect.height - VIEWPORT_PADDING;
      }

      // Clamp vertical to viewport
      top = Math.max(
        VIEWPORT_PADDING,
        Math.min(viewportHeight - dropdownRect.height - VIEWPORT_PADDING, top)
      );

      setPosition({ top, left });
    };

    updatePosition();

    // Recompute on resize/scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, alignProp]);

  const dropdownContent = (
    <div
      ref={dropdownContentRef}
      className={`
        fixed min-w-[160px] py-2 z-[200]
        backdrop-blur-xl bg-white border border-white/20 shadow-xl
        transition-opacity duration-200 ease-out
        ${isOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}
      `}
      style={
        isOpen
          ? {
              top: position.top,
              left: position.left,
            }
          : { top: 0, left: 0 }
      }
      onMouseEnter={() => {
        clearCloseTimeout();
        setIsOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <div onClick={() => setIsOpen(false)}>{children}</div>
    </div>
  );

  return (
    <>
      <div
        className="relative inline-block"
        ref={containerRef}
        onMouseEnter={() => {
          clearCloseTimeout();
          setIsOpen(true);
        }}
        onMouseLeave={scheduleClose}
      >
        {trigger ? (
          <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
            {trigger}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(!isOpen)}
          >
            {label}
          </Button>
        )}
      </div>
      {isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
};

export default NavDropdown;
