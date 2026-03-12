import { describe, it, expect } from 'vitest';
import router from '../../router/index';

describe('Router', () => {
  it('has a home route at /', () => {
    const homeRoute = router.getRoutes().find(r => r.path === '/');
    expect(homeRoute).toBeDefined();
    expect(homeRoute!.name).toBe('home');
  });

  it('has a game route at /game', () => {
    const route = router.getRoutes().find(r => r.path === '/game');
    expect(route).toBeDefined();
    expect(route!.name).toBe('game');
  });

  it('has a lobby route at /lobby', () => {
    const route = router.getRoutes().find(r => r.path === '/lobby');
    expect(route).toBeDefined();
    expect(route!.name).toBe('lobby');
  });

  it('has a multiplayer route at /multiplayer', () => {
    const route = router.getRoutes().find(r => r.path === '/multiplayer');
    expect(route).toBeDefined();
    expect(route!.name).toBe('multiplayer');
  });

  it('has a game-url route at /:room/:playerName', () => {
    const route = router.getRoutes().find(r => r.name === 'game-url');
    expect(route).toBeDefined();
  });

  it('has exactly 5 routes', () => {
    expect(router.getRoutes().length).toBe(5);
  });
});
