import { describe, it, expect } from 'vitest';
import { PieceGenerator, type PieceType } from '../game/PieceGenerator';

const ALL_PIECES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

describe('PieceGenerator', () => {
  describe('constructor', () => {
    it('creates a generator with a seed', () => {
      const gen = new PieceGenerator('test-seed');
      expect(gen).toBeDefined();
    });

    it('creates a generator without a seed (random)', () => {
      const gen = new PieceGenerator();
      expect(gen).toBeDefined();
    });
  });

  describe('next', () => {
    it('returns a valid PieceType', () => {
      const gen = new PieceGenerator('seed1');
      const piece = gen.next();
      expect(ALL_PIECES).toContain(piece);
    });

    it('returns pieces from the bag system (all 7 pieces in first 7)', () => {
      const gen = new PieceGenerator('bag-test');
      const first7: PieceType[] = [];
      for (let i = 0; i < 7; i++) {
        first7.push(gen.next());
      }
      // Each piece type should appear exactly once in a bag of 7
      const unique = new Set(first7);
      expect(unique.size).toBe(7);
      for (const p of ALL_PIECES) {
        expect(first7).toContain(p);
      }
    });

    it('second bag also contains all 7 pieces', () => {
      const gen = new PieceGenerator('bag-test-2');
      // Consume first bag
      for (let i = 0; i < 7; i++) gen.next();
      // Second bag
      const second7: PieceType[] = [];
      for (let i = 0; i < 7; i++) {
        second7.push(gen.next());
      }
      const unique = new Set(second7);
      expect(unique.size).toBe(7);
    });

    it('can generate many pieces without error', () => {
      const gen = new PieceGenerator('stress');
      for (let i = 0; i < 100; i++) {
        const piece = gen.next();
        expect(ALL_PIECES).toContain(piece);
      }
    });
  });

  describe('deterministic with seed', () => {
    it('same seed produces same sequence', () => {
      const gen1 = new PieceGenerator('deterministic');
      const gen2 = new PieceGenerator('deterministic');
      
      for (let i = 0; i < 50; i++) {
        expect(gen1.next()).toBe(gen2.next());
      }
    });

    it('different seeds produce different sequences', () => {
      const gen1 = new PieceGenerator('seed-a');
      const gen2 = new PieceGenerator('seed-b');
      
      const seq1: PieceType[] = [];
      const seq2: PieceType[] = [];
      for (let i = 0; i < 21; i++) {
        seq1.push(gen1.next());
        seq2.push(gen2.next());
      }
      // While individual pieces could match, the full sequences should differ
      expect(seq1).not.toEqual(seq2);
    });
  });

  describe('peek', () => {
    it('returns next N pieces without consuming them', () => {
      const gen = new PieceGenerator('peek-test');
      const peeked = gen.peek(5);
      expect(peeked.length).toBe(5);
      
      // Verify they are valid
      for (const p of peeked) {
        expect(ALL_PIECES).toContain(p);
      }
      
      // Now consuming should return the same pieces
      for (let i = 0; i < 5; i++) {
        expect(gen.next()).toBe(peeked[i]);
      }
    });

    it('defaults to 5 pieces', () => {
      const gen = new PieceGenerator('peek-default');
      const peeked = gen.peek();
      expect(peeked.length).toBe(5);
    });

    it('handles peeking more pieces than initially generated', () => {
      const gen = new PieceGenerator('peek-large');
      const peeked = gen.peek(30);
      expect(peeked.length).toBe(30);
    });
  });

  describe('getSequence', () => {
    it('returns the internal sequence array', () => {
      const gen = new PieceGenerator('seq-test');
      const seq = gen.getSequence();
      expect(Array.isArray(seq)).toBe(true);
      expect(seq.length).toBeGreaterThanOrEqual(21); // 3 bags × 7
    });
  });

  describe('getIndex', () => {
    it('starts at 0', () => {
      const gen = new PieceGenerator('idx-test');
      expect(gen.getIndex()).toBe(0);
    });

    it('increments with each next() call', () => {
      const gen = new PieceGenerator('idx-test-2');
      gen.next();
      expect(gen.getIndex()).toBe(1);
      gen.next();
      expect(gen.getIndex()).toBe(2);
      gen.next();
      expect(gen.getIndex()).toBe(3);
    });

    it('does not increment on peek()', () => {
      const gen = new PieceGenerator('idx-test-3');
      gen.peek(5);
      expect(gen.getIndex()).toBe(0);
    });
  });

  describe('multiplayer fairness: same seed = same pieces', () => {
    it('two players with same seed get identical pieces in same order', () => {
      const seed = 'multiplayer-game-42';
      const player1 = new PieceGenerator(seed);
      const player2 = new PieceGenerator(seed);

      for (let i = 0; i < 100; i++) {
        expect(player1.next()).toBe(player2.next());
      }
    });
  });
});
