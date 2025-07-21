import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import React from 'react';

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock Material-UI components
jest.mock('@mui/material', () => ({
  Box: ({ children, component, ...props }: any) => {
    const Comp = component || 'div';
    return React.createElement(Comp, props, children);
  },
  TextField: React.forwardRef(({ inputRef, multiline, error, fullWidth, inputProps, InputLabelProps, label, ...props }: any, ref) => 
    React.createElement('input', {
      ref: inputRef || ref,
      ...props,
      'aria-label': props['aria-label'] || label,
      'data-multiline': multiline ? 'true' : undefined,
      'data-error': error ? 'true' : undefined,
      'data-fullwidth': fullWidth ? 'true' : undefined,
      ...inputProps,
    })
  ),
  Typography: ({ children, variant, color, ...props }: any) => 
    React.createElement('span', { ...props, 'data-variant': variant, 'data-color': color }, children),
  FormControl: ({ children, error, ...props }: any) => 
    React.createElement('div', { ...props, 'data-error': error ? 'true' : undefined }, children),
  FormHelperText: ({ children, error, ...props }: any) => 
    React.createElement('span', { ...props, 'data-error': error ? 'true' : undefined }, children),
  Paper: ({ children, elevation, ...props }: any) => 
    React.createElement('div', { ...props, 'data-elevation': elevation }, children),
  Tooltip: ({ children, title, ...props }: any) => 
    React.createElement('div', { ...props, 'data-tooltip': title }, children),
  IconButton: ({ children, ...props }: any) => 
    React.createElement('button', props, children),
}));

jest.mock('@mui/icons-material/HelpOutline', () => ({
  __esModule: true,
  default: () => React.createElement('span', null, '?'),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Suppress console.error during tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Warning: React does not recognize the') ||
       args[0].includes('Warning: Received `false` for a non-boolean attribute'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
}); 