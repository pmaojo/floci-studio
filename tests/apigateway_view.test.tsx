import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import ApiGatewayView from '../src/views/ApiGatewayView';

// Mock contexts
vi.mock('../src/contexts/AwsContext', () => ({
  useAws: vi.fn(),
}));

// Mock ui components
vi.mock('../src/components/ui-elements', () => ({
  PageHeader: ({ title, description, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
      <div>{actions}</div>
    </div>
  ),
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
  Table: ({ columns, data, emptyMessage }: any) => (
    <table data-testid="table">
      <thead>
        <tr>
          {columns.map((col: any, i: number) => (
            <th key={i}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>{emptyMessage}</td>
          </tr>
        ) : (
          data.map((row: any, i: number) => (
            <tr key={i}>
              {columns.map((col: any, j: number) => (
                <td key={j}>{col.accessor(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  ),
}));

import { useAws } from '../src/contexts/AwsContext';

describe('ApiGatewayView', () => {
  let mockSend: any;
  let mockLogActivity: any;

  beforeEach(() => {
    mockSend = vi.fn();
    mockLogActivity = vi.fn();
    (useAws as any).mockReturnValue({
      clients: {
        apigateway: {
          send: mockSend,
        },
      },
      logActivity: mockLogActivity,
    });
  });

  it('renders the header and fetches APIs on mount', async () => {
    mockSend.mockResolvedValueOnce({
      items: [
        {
          id: 'api-123',
          name: 'Test API',
          description: 'A test API',
          createdDate: new Date('2023-01-01T12:00:00Z'),
          endpointConfiguration: { types: ['REGIONAL'] },
        },
      ],
    });

    render(<ApiGatewayView />);

    expect(screen.getByText('API Gateway')).toBeInTheDocument();

    await waitFor(() => {
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('api-123')).toBeInTheDocument();
    expect(screen.getByText('Test API')).toBeInTheDocument();
    expect(screen.getByText('REGIONAL')).toBeInTheDocument();
    expect(mockLogActivity).toHaveBeenCalledWith('API Gateway', 'Fetched REST APIs successfully', 'success');
  });

  it('displays empty state when no APIs are found', async () => {
    mockSend.mockResolvedValueOnce({ items: [] });

    render(<ApiGatewayView />);

    await waitFor(() => {
      expect(screen.getByText('No REST APIs found in local API Gateway.')).toBeInTheDocument();
    });
  });

  it('handles errors when fetching APIs', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network error'));

    render(<ApiGatewayView />);

    await waitFor(() => {
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });

    expect(mockLogActivity).toHaveBeenCalledWith('API Gateway', 'Failed to fetch REST APIs', 'error');
  });

  it('allows manual refresh', async () => {
    mockSend.mockResolvedValueOnce({ items: [] });

    render(<ApiGatewayView />);

    await waitFor(() => {
        expect(mockSend).toHaveBeenCalledTimes(1);
    });

    const refreshButton = screen.getByText('REFRESH');
    mockSend.mockResolvedValueOnce({
        items: [{ id: 'api-456', name: 'Refreshed API' }]
    });

    fireEvent.click(refreshButton);

    await waitFor(() => {
        expect(mockSend).toHaveBeenCalledTimes(2);
        expect(screen.getByText('api-456')).toBeInTheDocument();
    });
  });
});
