import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import AdaptiveReadinessPanel from '../components/AdaptiveReadinessPanel.jsx';

const readiness = {
  dynamicSetSize: 3,
  matchingTags: ['javascript', 'scope'],
  enrichment: {
    ready: true,
    eligibleCount: 5,
    matchingCount: 2,
    warning: null,
  },
  remediation: {
    ready: false,
    eligibleCount: 0,
    matchingCount: 0,
    warning: 'No easy questions exist outside this quiz. Remediation cannot be generated.',
  },
};

describe('AdaptiveReadinessPanel', () => {
  it('should render external pool counts, matching tags, and readiness warnings', () => {
    render(<AdaptiveReadinessPanel readiness={readiness} />);

    expect(screen.getByText('Adaptive Readiness')).toBeInTheDocument();
    expect(screen.getByText('Question Bank Coverage')).toBeInTheDocument();
    expect(screen.getByText('Enrichment Pool')).toBeInTheDocument();
    expect(screen.getByText('Remediation Pool')).toBeInTheDocument();
    expect(screen.getByText('No easy questions exist outside this quiz. Remediation cannot be generated.')).toBeInTheDocument();
    expect(screen.getByText('javascript')).toBeInTheDocument();
    expect(screen.getByText('scope')).toBeInTheDocument();
  });
});
