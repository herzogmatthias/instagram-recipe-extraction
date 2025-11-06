import { render, screen } from '@testing-library/react';
import { StatusChip, RecipeStatus } from './StatusChip';
import { describe, it, expect } from '@jest/globals';

describe('StatusChip', () => {
  const statuses: RecipeStatus[] = [
    'queued',
    'scraping',
    'downloading_media',
    'uploading_media',
    'extracting',
    'ready',
    'failed',
  ];

  it('should render all status types', () => {
    const { rerender } = render(<StatusChip status='queued' />);
    
    statuses.forEach((status) => {
      rerender(<StatusChip status={status} />);
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  it('should display correct label for each status', () => {
    const expectedLabels: Record<RecipeStatus, string> = {
      queued: 'Queued',
      scraping: 'Scraping',
      downloading_media: 'Downloading',
      uploading_media: 'Uploading',
      extracting: 'Extracting',
      ready: 'Ready',
      failed: 'Failed',
    };

    statuses.forEach((status) => {
      const { rerender } = render(<StatusChip status={status} />);
      expect(screen.getByText(expectedLabels[status])).toBeInTheDocument();
      rerender(<div />);
    });
  });

  it('should have accessible label', () => {
    render(<StatusChip status='ready' />);
    const chip = screen.getByRole('status');
    expect(chip).toHaveAttribute('aria-label', 'Recipe status: Ready');
  });

  it('should apply custom className', () => {
    render(<StatusChip status='ready' className='custom-class' />);
    const chip = screen.getByRole('status');
    expect(chip).toHaveClass('custom-class');
  });

  it('should have different colors for different statuses', () => {
    const { rerender } = render(<StatusChip status='ready' />);
    const readyChip = screen.getByRole('status');
    const readyClasses = readyChip.className;

    rerender(<StatusChip status='failed' />);
    const failedChip = screen.getByRole('status');
    const failedClasses = failedChip.className;

    expect(readyClasses).not.toBe(failedClasses);
  });
});
