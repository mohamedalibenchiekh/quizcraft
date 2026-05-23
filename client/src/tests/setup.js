import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Canvas element getContext (since particle animation canvas uses window and context)
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
});
