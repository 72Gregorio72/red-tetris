import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock socket outside the factory
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
  id: 'mock-socket-id',
};

// Mock socket.io-client before importing useSocket
vi.mock('socket.io-client', () => ({
  io: vi.fn(() => mockSocket),
}));

import { useSocket } from '../../composables/useSocket';

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('provides socket, isConnected, connect, disconnect, emit, on, off', () => {
    const result = useSocket();
    expect(result).toHaveProperty('socket');
    expect(result).toHaveProperty('isConnected');
    expect(result).toHaveProperty('connect');
    expect(result).toHaveProperty('disconnect');
    expect(result).toHaveProperty('emit');
    expect(result).toHaveProperty('on');
    expect(result).toHaveProperty('off');
  });

  it('starts with isConnected = false', () => {
    const { isConnected } = useSocket();
    expect(isConnected.value).toBe(false);
  });

  it('emit calls socket.emit with the event and args', () => {
    const { connect, emit } = useSocket();
    connect('http://localhost:3000');
    emit('test-event', { data: 'hello' });
    
    expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'hello' });
  });

  it('on registers an event listener', () => {
    const { connect, on } = useSocket();
    connect('http://localhost:3000');
    const handler = vi.fn();
    on('test-event', handler);
    
    expect(mockSocket.on).toHaveBeenCalledWith('test-event', handler);
  });

  it('off unregisters an event listener', () => {
    const { connect, off } = useSocket();
    connect('http://localhost:3000');
    const handler = vi.fn();
    off('test-event', handler);
    
    expect(mockSocket.off).toHaveBeenCalledWith('test-event', handler);
  });
});
