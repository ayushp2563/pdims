import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LinkPhotoUploader } from '../components/LinkPhotoUploader';
import { vi } from 'vitest';

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => import('../../__mocks__/supabase'));
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.PropsWithChildren<React.ButtonHTMLAttributes<HTMLButtonElement>>) => <button {...props}>{children}</button>,
}));

const mockProps = {
  onPhotoUploaded: vi.fn(),
  onPhotoRemoved: vi.fn(),
  currentPhotoUrl: null,
};

describe('LinkPhotoUploader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload button', () => {
    render(<LinkPhotoUploader {...mockProps} />);
    const uploadLabel = screen.getByText(/click to upload/i);
    expect(uploadLabel).toBeInTheDocument();
  });

  it('shows current photo when provided', () => {
    const propsWithPhoto = { ...mockProps, currentPhotoUrl: 'https://example.com/photo.jpg' };
    render(<LinkPhotoUploader {...propsWithPhoto} />);
    const photoImage = screen.getByAltText('Link photo');
    expect(photoImage).toBeInTheDocument();
    expect(photoImage).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('handles file selection', () => {
    render(<LinkPhotoUploader {...mockProps} />);
    // Find file input by id since input is hidden and linked by label's htmlFor
    const fileInput = screen.getByLabelText(/link photo/i);
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Cast fileInput as HTMLInputElement for TypeScript
    const input = fileInput as HTMLInputElement;
    expect(input.files).toHaveLength(1);
    expect(input.files?.[0]).toBe(file);
  });

  it('shows uploading state', async () => {
    render(<LinkPhotoUploader {...mockProps} />);
    const fileInput = screen.getByLabelText(/link photo/i);
    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });

  it('can remove current photo', () => {
    const propsWithPhoto = { ...mockProps, currentPhotoUrl: 'https://example.com/photo.jpg', onPhotoRemoved: vi.fn() };
    render(<LinkPhotoUploader {...propsWithPhoto} />);
    const removeButton = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeButton);
    expect(propsWithPhoto.onPhotoRemoved).toHaveBeenCalled();
  });
});
