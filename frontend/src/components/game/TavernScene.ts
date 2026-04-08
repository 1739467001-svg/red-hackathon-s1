import Phaser from 'phaser';
import { CharacterSprite } from './CharacterSprite';

/** Table positions (center x,y) for 4 groups */
const TABLE_POSITIONS = [
  { x: 220, y: 240 },
  { x: 580, y: 240 },
  { x: 220, y: 430 },
  { x: 580, y: 430 },
];

const TABLE_WIDTH = 130;
const TABLE_HEIGHT = 70;

/** Seat offsets (relative to table center) for up to 5 characters */
const SEAT_OFFSETS = [
  { x: -50, y: -60 },
  { x: 0, y: -65 },
  { x: 50, y: -60 },
  { x: -30, y: 55 },
  { x: 30, y: 55 },
];

const TORCH_POSITIONS = [
  { x: 40, y: 80 },
  { x: 760, y: 80 },
  { x: 40, y: 350 },
  { x: 760, y: 350 },
];

export class TavernScene extends Phaser.Scene {
  private characters: Map<string, CharacterSprite> = new Map();
  private tableGraphics: Phaser.GameObjects.Graphics[] = [];
  private tableGlowGraphics: Map<number, Phaser.GameObjects.Graphics> = new Map();
  private phaseText!: Phaser.GameObjects.Text;
  private activeGroupId = -1;
  private torchLights: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: 'TavernScene' });
  }

  preload(): void {
    for (let i = 1; i <= 20; i++) {
      this.load.image(`oc-${i}`, `/avatars/oc-${i}.jpeg`);
    }
  }

  create(): void {
    this.drawBackground();
    this.drawTables();
    this.placeCharacters();
    this.createPhaseIndicator();
    this.startTorchAnimation();
  }

  private drawBackground(): void {
    const bg = this.add.graphics();

    // Dark stone floor
    bg.fillStyle(0x1a1228, 1);
    bg.fillRect(0, 0, 800, 600);

    // Stone tile pattern
    bg.fillStyle(0x1e1430, 0.6);
    for (let x = 0; x < 800; x += 48) {
      for (let y = 70; y < 600; y += 32) {
        bg.fillRect(x + 1, y + 1, 46, 30);
      }
    }
    // Tile grout lines
    bg.fillStyle(0x0d0a18, 0.5);
    for (let x = 0; x < 800; x += 48) {
      bg.fillRect(x, 70, 1, 530);
    }
    for (let y = 70; y < 600; y += 32) {
      bg.fillRect(0, y, 800, 1);
    }

    // Stone wall at top
    bg.fillStyle(0x2d1f4a, 1);
    bg.fillRect(0, 0, 800, 72);
    // Wall bricks
    bg.fillStyle(0x352457, 0.7);
    for (let x = 0; x < 800; x += 60) {
      bg.fillRect(x + 2, 8, 56, 24);
    }
    for (let x = 30; x < 800; x += 60) {
      bg.fillRect(x + 2, 36, 56, 24);
    }
    // Wall-floor divider
    bg.fillStyle(0x0d0a18, 1);
    bg.fillRect(0, 70, 800, 4);
    bg.fillStyle(0x7c3aed, 0.2);
    bg.fillRect(0, 0, 800, 3);

    // Banners on the wall
    this.drawBanner(140, 0, 0x7c3aed, 'G1');
    this.drawBanner(330, 0, 0x3b82f6, 'G2');
    this.drawBanner(470, 0, 0x10b981, 'G3');
    this.drawBanner(660, 0, 0xf43f5e, 'G4');

    // Side vignette
    bg.fillStyle(0x000000, 0.35);
    bg.fillRect(0, 0, 28, 600);
    bg.fillRect(772, 0, 28, 600);
    bg.fillStyle(0x000000, 0.15);
    bg.fillRect(28, 0, 24, 600);
    bg.fillRect(748, 0, 24, 600);

    // Bottom vignette
    bg.fillStyle(0x000000, 0.3);
    bg.fillRect(0, 520, 800, 80);
  }

  private drawBanner(x: number, y: number, color: number, label: string): void {
    const g = this.add.graphics();
    g.fillStyle(color, 0.85);
    g.fillRect(x - 14, y + 4, 28, 42);
    g.fillTriangle(x - 14, y + 46, x + 14, y + 46, x, y + 56);
    g.lineStyle(1, 0xffffff, 0.2);
    g.strokeRect(x - 14, y + 4, 28, 42);
    this.add.text(x, y + 22, label, {
      fontSize: '10px',
      fontFamily: '"VT323", monospace',
      color: '#FFFFFF',
    }).setOrigin(0.5, 0.5).setAlpha(0.9);
    g.fillStyle(0x8b6914, 1);
    g.fillCircle(x, y + 6, 3);
  }

  private drawTables(): void {
    for (let i = 0; i < 4; i++) {
      const pos = TABLE_POSITIONS[i];
      const tableGfx = this.add.graphics();

      // Shadow
      tableGfx.fillStyle(0x000000, 0.35);
      tableGfx.fillEllipse(pos.x, pos.y + TABLE_HEIGHT / 2 + 10, TABLE_WIDTH + 24, 18);

      // Table surface
      tableGfx.fillStyle(0x5c3d1e, 1);
      tableGfx.fillRect(
        pos.x - TABLE_WIDTH / 2,
        pos.y - TABLE_HEIGHT / 2,
        TABLE_WIDTH,
        TABLE_HEIGHT,
      );

      // Wood grain lines
      tableGfx.fillStyle(0x4a3015, 0.5);
      for (let g = 0; g < 4; g++) {
        tableGfx.fillRect(
          pos.x - TABLE_WIDTH / 2 + 8 + g * 30,
          pos.y - TABLE_HEIGHT / 2 + 4,
          2,
          TABLE_HEIGHT - 8,
        );
      }

      // Top highlight
      tableGfx.fillStyle(0x7a5a30, 0.4);
      tableGfx.fillRect(
        pos.x - TABLE_WIDTH / 2 + 2,
        pos.y - TABLE_HEIGHT / 2 + 2,
        TABLE_WIDTH - 4,
        5,
      );

      // Border
      tableGfx.lineStyle(2, 0x3a2810, 1);
      tableGfx.strokeRect(
        pos.x - TABLE_WIDTH / 2,
        pos.y - TABLE_HEIGHT / 2,
        TABLE_WIDTH,
        TABLE_HEIGHT,
      );

      // Group label
      this.add.text(pos.x, pos.y, `G${i + 1}`, {
        fontSize: '14px',
        fontFamily: '"VT323", monospace',
        color: '#D4A017',
        stroke: '#0d0a18',
        strokeThickness: 2,
      }).setOrigin(0.5, 0.5).setAlpha(0.7);

      this.tableGraphics.push(tableGfx);
    }
  }

  private startTorchAnimation(): void {
    for (const pos of TORCH_POSITIONS) {
      // Torch body
      const body = this.add.graphics();
      body.fillStyle(0x8b6914, 1);
      body.fillRect(pos.x - 3, pos.y + 12, 6, 16);
      body.fillStyle(0x5c4510, 1);
      body.fillRect(pos.x - 5, pos.y + 22, 10, 8);

      // Animated flame
      const flame = this.add.graphics();
      this.torchLights.push(flame);
      this.renderTorchFlame(flame, pos.x, pos.y);

      this.tweens.add({
        targets: flame,
        alpha: { from: 0.75, to: 1 },
        scaleX: { from: 0.88, to: 1.12 },
        scaleY: { from: 0.9, to: 1.1 },
        duration: Phaser.Math.Between(350, 700),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private renderTorchFlame(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    g.clear();
    g.fillStyle(0xff8c00, 0.12);
    g.fillCircle(x, y + 8, 24);
    g.fillStyle(0xff6600, 0.4);
    g.fillTriangle(x - 8, y + 16, x + 8, y + 16, x, y - 4);
    g.fillStyle(0xffcc00, 0.75);
    g.fillTriangle(x - 4, y + 12, x + 4, y + 12, x, y + 2);
    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(x, y + 8, 3);
  }

  private placeCharacters(): void {
    for (let tableIdx = 0; tableIdx < 4; tableIdx++) {
      const tablePos = TABLE_POSITIONS[tableIdx];
      for (let seatIdx = 0; seatIdx < 5; seatIdx++) {
        const charIndex = tableIdx * 5 + seatIdx + 1;
        if (charIndex > 20) break;

        const offset = SEAT_OFFSETS[seatIdx];
        const x = tablePos.x + offset.x;
        const y = tablePos.y + offset.y;
        const textureKey = `oc-${charIndex}`;
        const agentId = `oc-${charIndex}`;

        const character = new CharacterSprite(this, x, y, textureKey, `OC-${charIndex}`, agentId);
        // Stagger idle animation for organic feel
        this.time.delayedCall(seatIdx * 350 + tableIdx * 200, () => {
          character.startIdle();
        });
        this.characters.set(agentId, character);
      }
    }
  }

  private createPhaseIndicator(): void {
    this.phaseText = this.add.text(16, 14, 'Phase 0: 准备', {
      fontSize: '14px',
      fontFamily: '"VT323", monospace',
      color: '#A78BFA',
      stroke: '#0d0a18',
      strokeThickness: 2,
    });
  }

  setPhaseIndicator(phase: number): void {
    const labels: Record<number, string> = {
      0: 'Phase 0: 准备',
      1: 'Phase 1: 讨论',
      2: 'Phase 2: 开发',
      3: 'Phase 3: 答辩',
    };
    if (this.phaseText) {
      this.phaseText.setText(labels[phase] ?? `Phase ${phase}`);
    }
  }

  highlightTable(groupId: number): void {
    if (this.activeGroupId >= 0) {
      const oldGlow = this.tableGlowGraphics.get(this.activeGroupId);
      if (oldGlow) {
        oldGlow.destroy();
        this.tableGlowGraphics.delete(this.activeGroupId);
      }
      this.getGroupCharacters(this.activeGroupId).forEach((c) => c.highlight(false));
    }

    this.activeGroupId = groupId;

    const tableIndex = groupId - 1;
    if (tableIndex < 0 || tableIndex >= 4) return;

    const pos = TABLE_POSITIONS[tableIndex];
    const glow = this.add.graphics();

    // Soft outer glow
    glow.fillStyle(0x7c3aed, 0.1);
    glow.fillRoundedRect(
      pos.x - TABLE_WIDTH / 2 - 24,
      pos.y - TABLE_HEIGHT / 2 - 24,
      TABLE_WIDTH + 48,
      TABLE_HEIGHT + 48,
      10,
    );
    // Sharp inner border
    glow.lineStyle(2, 0xa78bfa, 0.9);
    glow.strokeRoundedRect(
      pos.x - TABLE_WIDTH / 2 - 10,
      pos.y - TABLE_HEIGHT / 2 - 10,
      TABLE_WIDTH + 20,
      TABLE_HEIGHT + 20,
      6,
    );

    this.tableGlowGraphics.set(groupId, glow);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.5, to: 1 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.getGroupCharacters(groupId).forEach((c) => c.highlight(true));
  }

  private getGroupCharacters(groupId: number): CharacterSprite[] {
    const chars: CharacterSprite[] = [];
    const startIdx = (groupId - 1) * 5 + 1;
    for (let i = startIdx; i < startIdx + 5 && i <= 20; i++) {
      const c = this.characters.get(`oc-${i}`);
      if (c) chars.push(c);
    }
    return chars;
  }

  showSpeechBubble(agentId: string, text?: string): void {
    this.hideSpeechBubble();
    const character = this.characters.get(agentId);
    if (character) {
      character.speak(text);
    }
  }

  hideSpeechBubble(): void {
    this.characters.forEach((c) => c.stopSpeaking());
  }

  shutdown(): void {
    this.characters.forEach((c) => c.destroy());
    this.characters.clear();
    this.tableGlowGraphics.forEach((g) => g.destroy());
    this.tableGlowGraphics.clear();
    this.torchLights.forEach((g) => g.destroy());
    this.torchLights = [];
  }
}
