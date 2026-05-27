import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileDropzone from '../components/FileDropzone';

describe('FileDropzone', () => {
  it('renders the dropzone area', () => {
    render(<FileDropzone files={[]} onAddFiles={vi.fn()} onRemoveFile={vi.fn()} disabled={false} />);
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/PDF \/ DOCX/i)).toBeInTheDocument();
  });

  it('shows file count and size summary', () => {
    const files = [
      new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    ];
    render(<FileDropzone files={files} onAddFiles={vi.fn()} onRemoveFile={vi.fn()} disabled={false} />);
    expect(screen.getByText(/1\/5 files attached/i)).toBeInTheDocument();
  });

  it('calls onRemoveFile when remove button is clicked', () => {
    const onRemove = vi.fn();
    const files = [
      new File(['content'], 'test.pdf', { type: 'application/pdf' }),
    ];
    render(<FileDropzone files={files} onAddFiles={vi.fn()} onRemoveFile={onRemove} disabled={false} />);
    fireEvent.click(screen.getByLabelText(/remove test.pdf/i));
    expect(onRemove).toHaveBeenCalledWith(0);
  });
});
