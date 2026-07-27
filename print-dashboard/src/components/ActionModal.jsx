import React, { useState } from 'react';

function Icon({ d, size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block', flexShrink: 0 }}>
      <path d={d} />
    </svg>
  );
}

const D = {
  close: 'M18 6L6 18M6 6l12 12',
  check: 'M20 6L9 17l-5-5',
};

export default function ActionModal({ isOpen, onClose, title, children, buttons, type = 'default' }) {
  const [inputValue, setInputValue] = useState('');
  const [dateValue, setDateValue] = useState('');

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal-overlay)',
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={handleBackdropClick}
    >
      <div 
        style={{
          background: '#fff',
          borderRadius: 'var(--r-card)',
          border: '1px solid var(--border-faint)',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--border-faint)',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-head)',
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              transition: 'color var(--ease)',
            }}
            onMouseEnter={(e) => e.target.style.color = 'var(--text-body)'}
            onMouseLeave={(e) => e.target.style.color = 'var(--text-muted)'}
          >
            <Icon d={D.close} size={16} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          padding: '16px',
          fontSize: '12px',
          color: 'var(--text-body)',
          lineHeight: '1.5',
        }}>
          {children}
          
          {/* Input field for input type modals */}
          {type === 'input' && (
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Enter your message..."
              style={{
                width: '100%',
                padding: '8px 10px',
                marginTop: '12px',
                border: '1px solid var(--border-faint)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'inherit',
                resize: 'vertical',
                minHeight: '80px',
                outline: 'none',
                color: 'var(--text-body)',
                background: '#fff',
              }}
            />
          )}

          {/* Date picker for date type modals */}
          {type === 'date' && (
            <input
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                marginTop: '12px',
                border: '1px solid var(--border-faint)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'inherit',
                outline: 'none',
                color: 'var(--text-body)',
                background: '#fff',
                colorScheme: 'light',
              }}
            />
          )}

          {/* Amount input for payment type modals */}
          {type === 'amount' && (
            <input
              type="number"
              placeholder="Enter amount..."
              style={{
                width: '100%',
                padding: '8px 10px',
                marginTop: '12px',
                border: '1px solid var(--border-faint)',
                borderRadius: '6px',
                fontSize: '11px',
                fontFamily: 'inherit',
                outline: 'none',
                color: 'var(--text-body)',
                background: '#fff',
              }}
            />
          )}
        </div>

        {/* Footer with Buttons */}
        {buttons && (
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '16px',
            borderTop: '1px solid var(--border-faint)',
            justifyContent: 'flex-end',
          }}>
            {buttons.map((btn, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (type === 'input' && btn.getInputValue) {
                    btn.onClick(inputValue);
                  } else if (type === 'date' && btn.getDateValue) {
                    btn.onClick(dateValue);
                  } else {
                    btn.onClick();
                  }
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '11px',
                  fontWeight: '600',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all var(--ease)',
                  background: btn.variant === 'primary' ? 'var(--primary)' : 'var(--bg-canvas)',
                  color: btn.variant === 'primary' ? '#fff' : 'var(--text-body)',
                  borderColor: 'var(--border-faint)',
                  borderWidth: btn.variant !== 'primary' ? '1px' : '0',
                }}
                onMouseEnter={(e) => {
                  if (btn.variant === 'primary') {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(58,80,107,0.25)';
                  } else {
                    e.currentTarget.style.background = 'rgba(0,0,0,0.02)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (btn.variant === 'primary') {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  } else {
                    e.currentTarget.style.background = 'var(--bg-canvas)';
                  }
                }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}