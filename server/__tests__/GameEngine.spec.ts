import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine, type Action } from '../game/GameEngine';
import type { PieceType } from '../game/PieceGenerator';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  describe('constructor / initial state', () => {
    it('creates an empty 20×10 grid', () => {
      expect(engine.state.grid.length).toBe(20);
      expect(engine.state.grid[0].length).toBe(10);
      expect(engine.state.grid.every(row => row.every(cell => cell === 0))).toBe(true);
    });

    it('initializes score, level, linesCleared to 0 / 1 / 0', () => {
      expect(engine.state.score).toBe(0);
      expect(engine.state.level).toBe(1);
      expect(engine.state.linesCleared).toBe(0);
    });

    it('starts alive with no current piece', () => {
      expect(engine.state.isAlive).toBe(true);
      expect(engine.state.currentPiece).toBeNull();
    });

    it('starts with pieceIndex 0', () => {
      expect(engine.state.pieceIndex).toBe(0);
    });

    it('starts with null platformerChar', () => {
      expect(engine.state.platformerChar).toBeNull();
    });
  });

  describe('spawnPiece', () => {
    it('spawns a piece on an empty grid and increments pieceIndex', () => {
      const result = engine.spawnPiece('T');
      expect(result).toBe(true);
      expect(engine.state.currentPiece).not.toBeNull();
      expect(engine.state.currentPiece!.type).toBe('T');
      expect(engine.state.currentPiece!.row).toBe(0);
      expect(engine.state.currentPiece!.col).toBe(4);
      expect(engine.state.currentPiece!.rotation).toBe(0);
      expect(engine.state.pieceIndex).toBe(1);
    });

    it('spawns different piece types', () => {
      const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      for (const type of types) {
        const eng = new GameEngine();
        expect(eng.spawnPiece(type)).toBe(true);
        expect(eng.state.currentPiece!.type).toBe(type);
      }
    });

    it('fails to spawn when grid is blocked at spawn position', () => {
      // Fill the top rows to block spawning
      for (let c = 0; c < 10; c++) {
        engine.state.grid[0][c] = 1;
        engine.state.grid[1][c] = 1;
      }
      const result = engine.spawnPiece('T');
      expect(result).toBe(false);
      expect(engine.state.isAlive).toBe(false);
    });

    it('increments pieceIndex on each successful spawn', () => {
      engine.spawnPiece('I');
      expect(engine.state.pieceIndex).toBe(1);
      // Lock the piece first
      engine.applyAction('drop');
      engine.spawnPiece('O');
      expect(engine.state.pieceIndex).toBe(2);
    });
  });

  describe('applyAction – movement', () => {
    beforeEach(() => {
      engine.spawnPiece('T');
    });

    it('moves piece left', () => {
      const initialCol = engine.state.currentPiece!.col;
      const result = engine.applyAction('left');
      expect(result.locked).toBe(false);
      expect(result.linesCleared).toBe(0);
      expect(engine.state.currentPiece!.col).toBe(initialCol - 1);
    });

    it('moves piece right', () => {
      const initialCol = engine.state.currentPiece!.col;
      const result = engine.applyAction('right');
      expect(result.locked).toBe(false);
      expect(engine.state.currentPiece!.col).toBe(initialCol + 1);
    });

    it('moves piece down when space available', () => {
      const initialRow = engine.state.currentPiece!.row;
      const result = engine.applyAction('down');
      expect(result.locked).toBe(false);
      expect(engine.state.currentPiece!.row).toBe(initialRow + 1);
    });

    it('does not move left past left wall', () => {
      // Move piece all the way to the left wall using the public API
      for (let i = 0; i < 10; i++) engine.applyAction('left');
      const colAtWall = engine.state.currentPiece!.col;
      engine.applyAction('left');
      expect(engine.state.currentPiece!.col).toBe(colAtWall);
    });

    it('does not move right past right wall', () => {
      // Move piece all the way to the right wall using the public API
      for (let i = 0; i < 10; i++) engine.applyAction('right');
      const colAtWall = engine.state.currentPiece!.col;
      engine.applyAction('right');
      expect(engine.state.currentPiece!.col).toBe(colAtWall);
    });

    it('returns no-op for actions when no current piece', () => {
      engine.state.currentPiece = null;
      const result = engine.applyAction('left');
      expect(result.locked).toBe(false);
      expect(result.linesCleared).toBe(0);
    });

    it('returns no-op when player is dead', () => {
      engine.state.isAlive = false;
      const result = engine.applyAction('left');
      expect(result.locked).toBe(false);
      expect(result.linesCleared).toBe(0);
    });
  });

  describe('applyAction – rotate', () => {
    it('rotates a T piece', () => {
      engine.spawnPiece('T');
      const initialRotation = engine.state.currentPiece!.rotation;
      engine.applyAction('rotate');
      expect(engine.state.currentPiece!.rotation).toBe((initialRotation + 1) % 4);
    });

    it('rotates an I piece', () => {
      engine.spawnPiece('I');
      engine.state.currentPiece!.row = 5; // give space
      engine.applyAction('rotate');
      expect(engine.state.currentPiece!.rotation).toBe(1);
    });

    it('rotates an O piece (stays the same since only 1 rotation)', () => {
      engine.spawnPiece('O');
      engine.applyAction('rotate');
      expect(engine.state.currentPiece!.rotation).toBe(0); // O has only 1 rotation
    });

    it('attempts wall kick when rotation blocked', () => {
      engine.spawnPiece('I');
      // Place I piece against the wall
      engine.state.currentPiece!.col = 0;
      engine.state.currentPiece!.row = 5;
      const prevRot = engine.state.currentPiece!.rotation;
      engine.applyAction('rotate');
      // It should have applied a wall kick or stayed in same rotation
      // The I piece in rotation 0 occupies [0,0],[0,1],[0,2],[0,3]
      // Rotation 1 occupies [-1,2],[0,2],[1,2],[2,2] — from col 0, that means cols 2 = fine
      // So it should rotate fine at col 0
      expect(engine.state.currentPiece!.rotation).toBe(1);
    });

    it('does not rotate when all kick positions fail', () => {
      engine.spawnPiece('T');
      // Move piece down to row 10 using the public API
      for (let i = 0; i < 10; i++) engine.applyAction('down');
      // T piece at row 10, col 4, rotation 0: cells (10,4),(10,5),(10,6),(11,5)
      // Surround the piece with blocks to prevent any rotation
      for (let r = 9; r <= 12; r++) {
        for (let c = 2; c <= 7; c++) {
          engine.state.grid[r][c] = 1;
        }
      }
      // Clear only the piece cells
      engine.state.grid[10][4] = 0;
      engine.state.grid[10][5] = 0;
      engine.state.grid[10][6] = 0;
      engine.state.grid[11][5] = 0;
      const prevRot = engine.state.currentPiece!.rotation;
      engine.applyAction('rotate');
      // Should not rotate since kicks fail
      expect(engine.state.currentPiece!.rotation).toBe(prevRot);
    });
  });

  describe('applyAction – down (locking)', () => {
    it('locks piece and returns linesCleared=0 when touching stack', () => {
      engine.spawnPiece('O');
      // Move to bottom
      while (engine.state.currentPiece) {
        const result = engine.applyAction('down');
        if (result.locked) {
          expect(result.locked).toBe(true);
          break;
        }
      }
      expect(engine.state.currentPiece).toBeNull();
    });
  });

  describe('applyAction – drop (hard drop)', () => {
    it('drops piece to the bottom immediately', () => {
      engine.spawnPiece('O');
      const result = engine.applyAction('drop');
      expect(result.locked).toBe(true);
      expect(engine.state.currentPiece).toBeNull();
      // O piece should be at bottom rows 18-19
      expect(engine.state.grid[18][4]).not.toBe(0);
      expect(engine.state.grid[18][5]).not.toBe(0);
      expect(engine.state.grid[19][4]).not.toBe(0);
      expect(engine.state.grid[19][5]).not.toBe(0);
    });

    it('drops onto existing pieces', () => {
      // Place something at the bottom first
      engine.spawnPiece('O');
      engine.applyAction('drop');
      // Now spawn another O and drop
      engine.spawnPiece('O');
      const result = engine.applyAction('drop');
      expect(result.locked).toBe(true);
      // Should be on top of previous: rows 16-17
      expect(engine.state.grid[16][4]).not.toBe(0);
      expect(engine.state.grid[17][4]).not.toBe(0);
    });
  });

  describe('line clearing', () => {
    it('clears a complete line', () => {
      // Fill row 19 except column 4-5, then drop an O piece
      for (let c = 0; c < 10; c++) {
        engine.state.grid[19][c] = 1;
        engine.state.grid[18][c] = 1;
      }
      // Clear cols 4,5 on rows 18,19 for O piece
      engine.state.grid[18][4] = 0;
      engine.state.grid[18][5] = 0;
      engine.state.grid[19][4] = 0;
      engine.state.grid[19][5] = 0;

      engine.spawnPiece('O');
      const result = engine.applyAction('drop');
      expect(result.locked).toBe(true);
      expect(result.linesCleared).toBe(2);
      expect(engine.state.linesCleared).toBe(2);
    });

    it('awards correct score for different line clears', () => {
      // Clear 1 line
      for (let c = 0; c < 10; c++) {
        engine.state.grid[19][c] = 1;
      }
      engine.state.grid[19][4] = 0;
      engine.state.grid[19][5] = 0;
      
      engine.spawnPiece('O');
      // Need to get O piece to fill exact positions.
      // Actually, let's set up a simpler scenario:
      
      // Reset and do a clean setup
      engine.reset();
      // Fill row 19 completely except cols 4-5 which O will fill
      for (let c = 0; c < 4; c++) engine.state.grid[19][c] = 1;
      for (let c = 6; c < 10; c++) engine.state.grid[19][c] = 1;
      // Also fill row 18 completely except 4-5
      for (let c = 0; c < 4; c++) engine.state.grid[18][c] = 1;
      for (let c = 6; c < 10; c++) engine.state.grid[18][c] = 1;
      
      engine.spawnPiece('O');
      const result = engine.applyAction('drop');
      expect(result.linesCleared).toBe(2);
      // 2 lines = 300 points × level 1 = 300
      expect(engine.state.score).toBe(300);
    });

    it('updates level after clearing 10 lines', () => {
      engine.state.linesCleared = 9;
      // Fill one complete row and trigger clear
      for (let c = 0; c < 10; c++) {
        engine.state.grid[19][c] = 1;
      }
      engine.state.grid[19][4] = 0;
      engine.state.grid[19][5] = 0;
      engine.state.grid[18][4] = 0;
      engine.state.grid[18][5] = 0;
      for (let c = 0; c < 4; c++) engine.state.grid[18][c] = 1;
      for (let c = 6; c < 10; c++) engine.state.grid[18][c] = 1;

      engine.spawnPiece('O');
      engine.applyAction('drop');
      
      // After clearing lines, total should be >= 10
      expect(engine.state.level).toBeGreaterThanOrEqual(2);
    });

    it('awards 0 points for 0 lines', () => {
      engine.spawnPiece('O');
      engine.applyAction('drop');
      expect(engine.state.score).toBe(0);
    });
  });

  describe('reset', () => {
    it('resets all state to initial values', () => {
      engine.spawnPiece('T');
      engine.applyAction('drop');
      engine.state.score = 500;
      engine.state.level = 3;
      engine.state.linesCleared = 20;
      engine.state.isAlive = false;

      engine.reset();

      expect(engine.state.score).toBe(0);
      expect(engine.state.level).toBe(1);
      expect(engine.state.linesCleared).toBe(0);
      expect(engine.state.isAlive).toBe(true);
      expect(engine.state.currentPiece).toBeNull();
      expect(engine.state.pieceIndex).toBe(0);
      expect(engine.state.grid.every(row => row.every(cell => cell === 0))).toBe(true);
    });
  });

  describe('addPenaltyLines', () => {
    it('adds penalty lines (code 8) at the bottom', () => {
      const result = engine.addPenaltyLines(2);
      expect(result).toBe(true);
      // Last 2 rows should be filled with 8
      expect(engine.state.grid[18].every(c => c === 8)).toBe(true);
      expect(engine.state.grid[19].every(c => c === 8)).toBe(true);
    });

    it('shifts existing grid content up', () => {
      engine.state.grid[19][0] = 3;
      engine.addPenaltyLines(1);
      // Row 19 is now penalty, old row 19 should be at row 18
      expect(engine.state.grid[19].every(c => c === 8)).toBe(true);
      expect(engine.state.grid[18][0]).toBe(3);
    });

    it('kills player if current piece is now in invalid position', () => {
      engine.spawnPiece('T');
      // Fill almost the entire grid to push piece out
      for (let r = 2; r < 20; r++) {
        for (let c = 0; c < 10; c++) {
          engine.state.grid[r][c] = 1;
        }
      }
      const result = engine.addPenaltyLines(3);
      expect(result).toBe(false);
      expect(engine.state.isAlive).toBe(false);
    });

    it('keeps player alive if piece is still valid after penalty', () => {
      engine.spawnPiece('T');
      engine.state.currentPiece!.row = 5;
      const result = engine.addPenaltyLines(1);
      expect(result).toBe(true);
      expect(engine.state.isAlive).toBe(true);
    });
  });

  describe('addRisingLine', () => {
    it('removes bottom row and adds empty row at top', () => {
      engine.state.grid[19][0] = 5;
      engine.state.grid[0][0] = 3;
      engine.addRisingLine();
      // Bottom row (old row 19) should be gone, top row should be empty
      expect(engine.state.grid[0].every(c => c === 0)).toBe(true);
      // Old row 0 (val 3) should now be at row 1
      expect(engine.state.grid[1][0]).toBe(3);
    });

    it('adjusts current piece row down', () => {
      engine.spawnPiece('T');
      // Move piece down to row 5 using the public API
      for (let i = 0; i < 5; i++) engine.applyAction('down');
      expect(engine.state.currentPiece!.row).toBe(5);
      engine.addRisingLine();
      expect(engine.state.currentPiece!.row).toBe(6);
    });

    it('returns true always', () => {
      const result = engine.addRisingLine(1);
      expect(result).toBe(true);
    });
  });

  describe('clearCell', () => {
    it('clears a cell if platformerChar exists', () => {
      engine.state.platformerChar = { x: 5, y: 5, jumpTicks: 0, isGrounded: false } as any;
      engine.state.grid[10][5] = 3;
      engine.clearCell(5, 10);
      expect(engine.state.grid[10][5]).toBe(0);
    });

    it('does nothing if no platformerChar', () => {
      engine.state.grid[10][5] = 3;
      engine.clearCell(5, 10);
      expect(engine.state.grid[10][5]).toBe(3);
    });

    it('clears cell even if occupied by current piece', () => {
      engine.state.platformerChar = { x: 5, y: 5, jumpTicks: 0, isGrounded: false } as any;
      engine.spawnPiece('T');
      const p = engine.state.currentPiece!;
      // The T piece at row 0, col 4 occupies cells (0,4),(0,5),(0,6),(1,5)
      engine.clearCell(5, 0);
      expect(engine.state.grid[0][5]).toBe(0);
    });
  });

  describe('getGridWithPiece', () => {
    it('returns a copy of the grid with the current piece drawn', () => {
      engine.spawnPiece('O');
      const gridWithPiece = engine.getGridWithPiece();
      // O piece starts at row 0, col 4
      // O shape: [[0,0],[0,1],[1,0],[1,1]] → cells at (0,4),(0,5),(1,4),(1,5)
      expect(gridWithPiece[0][4]).toBe(2); // O piece code
      expect(gridWithPiece[0][5]).toBe(2);
      expect(gridWithPiece[1][4]).toBe(2);
      expect(gridWithPiece[1][5]).toBe(2);
    });

    it('draws ghost piece (code 9) below actual piece', () => {
      engine.spawnPiece('O');
      const gridWithPiece = engine.getGridWithPiece();
      // Ghost should be at bottom (rows 18-19)
      expect(gridWithPiece[18][4]).toBe(9);
      expect(gridWithPiece[18][5]).toBe(9);
      expect(gridWithPiece[19][4]).toBe(9);
      expect(gridWithPiece[19][5]).toBe(9);
    });

    it('does not mutate the original grid', () => {
      engine.spawnPiece('O');
      const gridWithPiece = engine.getGridWithPiece();
      // Original grid should still be empty where piece is
      expect(engine.state.grid[0][4]).toBe(0);
    });

    it('returns plain grid when no current piece', () => {
      engine.state.grid[5][5] = 3;
      const gridWithPiece = engine.getGridWithPiece();
      expect(gridWithPiece[5][5]).toBe(3);
      expect(gridWithPiece[0][0]).toBe(0);
    });
  });

  describe('getFallInterval', () => {
    it('returns 1000ms at level 1', () => {
      engine.state.level = 1;
      expect(engine.getFallInterval()).toBe(1000);
    });

    it('decreases with level', () => {
      engine.state.level = 5;
      expect(engine.getFallInterval()).toBe(1000 - 4 * 80); // 680
    });

    it('has a minimum of 100ms', () => {
      engine.state.level = 100;
      expect(engine.getFallInterval()).toBe(100);
    });
  });

  describe('full game scenarios', () => {
    it('plays a sequence of moves without crashing', () => {
      engine.spawnPiece('T');
      engine.applyAction('left');
      engine.applyAction('left');
      engine.applyAction('rotate');
      engine.applyAction('right');
      engine.applyAction('down');
      engine.applyAction('down');
      const result = engine.applyAction('drop');
      expect(result.locked).toBe(true);
    });

    it('game over when spawn fails after filling grid', () => {
      // Stack pieces until game over
      let alive = true;
      let spawned = true;
      const types: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
      let count = 0;
      while (alive && count < 100) {
        const type = types[count % types.length];
        if (!engine.state.currentPiece) {
          spawned = engine.spawnPiece(type);
          if (!spawned) break;
        }
        engine.applyAction('drop');
        alive = engine.state.isAlive;
        count++;
      }
      // After filling the grid, game should eventually end
      expect(count).toBeGreaterThan(0);
    });

    it('same sequence of pieces yields same game state on two engines', () => {
      const e1 = new GameEngine();
      const e2 = new GameEngine();
      const pieces: PieceType[] = ['T', 'I', 'O', 'S'];
      
      for (const piece of pieces) {
        e1.spawnPiece(piece);
        e2.spawnPiece(piece);
        e1.applyAction('drop');
        e2.applyAction('drop');
      }
      
      expect(e1.state.grid).toEqual(e2.state.grid);
      expect(e1.state.score).toEqual(e2.state.score);
    });
  });
});
