
import React, { useRef, useEffect, useState } from 'react';
import { 
  INTERNAL_WIDTH, 
  INTERNAL_HEIGHT, 
  TILE_SIZE, 
  GRAVITY, 
  JUMP_FORCE, 
  PLAYER_SPEED, 
  COLORS, 
  LEVELS 
} from './constants';
import { ItemType, Item } from './types';

interface GameComponentProps {
  levelIndex: number;
  onGameOver: () => void;
  onLevelComplete: () => void;
}

const GameComponent: React.FC<GameComponentProps> = ({ levelIndex, onGameOver, onLevelComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState({ health: 3, arrows: 0, level: 0 });
  const levelData = LEVELS[levelIndex] || LEVELS[0];
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Escalonamento de dificuldade
  const difficultyMultiplier = 1 + (levelIndex * 0.15); // Inimigos 15% maiores/fortes por nível

  const stateRef = useRef({
    frame: 0,
    player: {
      x: 50, y: 200, vx: 0, vy: 0, 
      width: 18, height: 30, 
      health: 3, arrows: levelData.arrows, 
      isGrounded: false, facingRight: true,
      state: 'idle' as 'idle' | 'run' | 'jump' | 'shoot',
      shootTimer: 0,
      invincible: 0,
      lastStablePos: { x: 50, y: 200 } // Checkpoint
    },
    enemies: levelData.enemies.map(e => ({
      ...e,
      id: Math.random(),
      vx: e.type === 'OCTOPUS' ? 1.2 : 0,
      vy: 0,
      width: 24 * difficultyMultiplier, 
      height: 24 * difficultyMultiplier,
      hp: 4 + Math.floor(levelIndex), // HP Base 4 + 1 por nível
      maxHp: 4 + Math.floor(levelIndex),
      isTrapped: false,
      trapTimer: 0,
      initialX: e.x,
      initialY: e.y,
      dead: false,
      blink: 0,
      chasing: false
    })),
    items: [] as Item[],
    arrows: [] as any[],
    traps: [] as any[],
    particles: [] as any[],
    keys: {} as { [key: string]: boolean },
    camX: 0
  });

  const handleTouchStart = (key: string) => { 
    stateRef.current.keys[key.toLowerCase()] = true; 
    initAudio();
  };
  const handleTouchEnd = (key: string) => { stateRef.current.keys[key.toLowerCase()] = false; };

  // --- AUDIO ENGINE ---
  const initAudio = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      playMusic();
    } else if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  };

  const playSfx = (type: 'jump' | 'shoot' | 'hit' | 'collect' | 'enemy_die') => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    
    if (type === 'jump') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.linearRampToValueAtTime(300, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'shoot') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(400, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(50, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'collect') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.setValueAtTime(1200, now + 0.05);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'enemy_die') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    }
  };

  const playMusic = () => {
    if (!audioCtxRef.current) return;
    // Simple bassline loop
    const ctx = audioCtxRef.current;
    const notes = [110, 110, 130, 110, 146, 130, 110, 98]; // Simple melody
    let noteIndex = 0;
    
    const playNextNote = () => {
      if(!canvasRef.current) return; // Stop if unmounted
      if(ctx.state === 'closed') return; // Stop if closed

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = notes[noteIndex];
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
      
      noteIndex = (noteIndex + 1) % notes.length;
      setTimeout(playNextNote, 250);
    };
    playNextNote();
  };

  // --- INITIALIZATION ---
  useEffect(() => {
    const s = stateRef.current;
    // Parse map for items
    s.items = [];
    levelData.map.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        if (row[x] === 'H') {
          s.items.push({ id: Math.random(), type: 'HEART', x: x * TILE_SIZE + 8, y: y * TILE_SIZE + 8, collected: false, floatOffset: Math.random() * Math.PI });
        } else if (row[x] === 'A') {
          s.items.push({ id: Math.random(), type: 'AMMO', x: x * TILE_SIZE + 8, y: y * TILE_SIZE + 8, collected: false, floatOffset: Math.random() * Math.PI });
        }
      }
    });
  }, [levelIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const createParticle = (x: number, y: number, color: string, vx: number, vy: number, life: number) => {
      stateRef.current.particles.push({ x, y, color, vx, vy, life, maxLife: life });
    };

    const update = () => {
      const s = stateRef.current;
      const p = s.player;
      s.frame++;

      if (p.invincible > 0) p.invincible--;

      const moveLeft = s.keys['arrowleft'] || s.keys['left'] || s.keys['a'];
      const moveRight = s.keys['arrowright'] || s.keys['right'] || s.keys['d'];
      const aimUp = s.keys['arrowup'] || s.keys['up'] || s.keys['w'];
      const aimDown = s.keys['arrowdown'] || s.keys['down'] || s.keys['s'];
      const jump = s.keys['arrowup'] || s.keys['z'] || s.keys['w'] || s.keys[' '];
      const shoot = s.keys['x'] || s.keys['j'];
      const setTrap = s.keys['c'] || s.keys['k'];

      p.vx = 0;
      if (moveLeft) { p.vx = -PLAYER_SPEED; p.facingRight = false; p.state = 'run'; }
      else if (moveRight) { p.vx = PLAYER_SPEED; p.facingRight = true; p.state = 'run'; }
      else { p.state = 'idle'; }

      if (!p.isGrounded) p.state = 'jump';
      if (p.shootTimer > 0) { p.state = 'shoot'; p.shootTimer--; }

      // Jump Logic
      if (jump && p.isGrounded && !s.keys['jumpLock']) { 
        p.vy = JUMP_FORCE; 
        p.isGrounded = false;
        s.keys['jumpLock'] = true;
        playSfx('jump');
        for(let i=0; i<5; i++) createParticle(p.x + p.width/2, p.y + p.height, '#fff', (Math.random()-0.5)*2, Math.random()*-1, 20);
      }
      if (!jump) s.keys['jumpLock'] = false;

      p.vy += GRAVITY;
      p.x += p.vx;
      p.y += p.vy;

      // Checkpoint Logic (Update stable pos)
      if (p.isGrounded) {
        if (s.frame % 60 === 0) { // Update checkpoint every second standing
          p.lastStablePos = { x: p.x, y: p.y };
        }
      }

      // Fall off map -> Respawn at checkpoint
      if (p.y > INTERNAL_HEIGHT + 50) {
        p.health--;
        playSfx('hit');
        if (p.health > 0) {
          p.x = p.lastStablePos.x;
          p.y = p.lastStablePos.y - 20;
          p.vy = 0;
          p.invincible = 60;
        } else {
          onGameOver();
          cancelAnimationFrame(animationId);
        }
      }

      if (p.state === 'run' && s.frame % 15 === 0) {
        createParticle(p.x + (p.facingRight ? 0 : p.width), p.y + p.height, 'rgba(255,255,255,0.3)', (Math.random()-0.5), -0.5, 15);
      }

      const mapW = levelData.map[0].length * TILE_SIZE;
      if (p.x < 0) p.x = 0;
      if (p.x + p.width > mapW) p.x = mapW - p.width;

      p.isGrounded = false;
      levelData.map.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          if (row[x] === '#') {
            const tx = x * TILE_SIZE; const ty = y * TILE_SIZE;
            if (p.x < tx + TILE_SIZE && p.x + p.width > tx && p.y < ty + TILE_SIZE && p.y + p.height > ty) {
              const dx = (p.x + p.width/2) - (tx + TILE_SIZE/2);
              const dy = (p.y + p.height/2) - (ty + TILE_SIZE/2);
              if (Math.abs(dx) > Math.abs(dy)) {
                if (dx > 0) p.x = tx + TILE_SIZE; else p.x = tx - p.width;
              } else {
                if (dy > 0) { p.y = ty + TILE_SIZE; p.vy = 0; }
                else { p.y = ty - p.height; p.vy = 0; p.isGrounded = true; }
              }
            }
          } else if (row[x] === 'B') {
            const tx = x * TILE_SIZE; const ty = y * TILE_SIZE;
            if (p.x < tx + TILE_SIZE && p.x + p.width > tx && p.y < ty + TILE_SIZE && p.y + p.height > ty) {
              playSfx('collect');
              onLevelComplete(); cancelAnimationFrame(animationId);
            }
          }
        }
      });

      // Item Collection
      s.items.forEach(item => {
        if (!item.collected) {
          if (p.x < item.x + 16 && p.x + p.width > item.x && p.y < item.y + 16 && p.y + p.height > item.y) {
            item.collected = true;
            playSfx('collect');
            if (item.type === 'HEART') p.health = Math.min(p.health + 1, 5); // Max 5 hearts
            if (item.type === 'AMMO') p.arrows += 5;
            for(let i=0; i<8; i++) createParticle(item.x+8, item.y+8, '#ffff00', (Math.random()-0.5)*3, (Math.random()-0.5)*3, 20);
          }
        }
      });

      // Shooting with Directional Aim
      if (shoot && p.arrows > 0 && !s.keys['shootLock']) {
        p.shootTimer = 15;
        
        let vx = p.facingRight ? 8 : -8;
        let vy = -0.5; // Default slight arc

        // Analog Aiming Logic
        if (aimUp) {
          vy = -6;
          vx = p.facingRight ? 5 : -5;
          // If not moving horizontally, shoot straight up
          if (!moveLeft && !moveRight) { vx = 0; vy = -8; }
        } else if (aimDown && !p.isGrounded) {
          vy = 6;
          vx = p.facingRight ? 5 : -5;
          if (!moveLeft && !moveRight) { vx = 0; vy = 8; }
        }

        s.arrows.push({ 
          x: p.facingRight ? p.x + p.width : p.x, 
          y: p.y + p.height/2 - 2, 
          vx, vy
        });
        p.arrows--;
        s.keys['shootLock'] = true;
        playSfx('shoot');
        setTimeout(() => s.keys['shootLock'] = false, 300);
      }

      if (setTrap && !s.keys['trapLock']) {
        s.traps.push({ x: p.x, y: p.y + p.height - 4, width: 24, height: 8, open: true });
        s.keys['trapLock'] = true;
        setTimeout(() => s.keys['trapLock'] = false, 1200);
      }

      // Arrows Logic
      s.arrows = s.arrows.filter(a => {
        a.x += a.vx; a.y += a.vy; a.vy += 0.02;
        if (s.frame % 3 === 0) createParticle(a.x, a.y, COLORS.ARROW_GOLD, (Math.random()-0.5), (Math.random()-0.5), 10);
        const tx = Math.floor(a.x / TILE_SIZE); const ty = Math.floor(a.y / TILE_SIZE);
        if (levelData.map[ty]?.[tx] === '#') return false;
        
        let hit = false;
        s.enemies.forEach(e => {
          if (!e.dead && a.x > e.x && a.x < e.x + e.width && a.y > e.y && a.y < e.y + e.height) {
            e.hp--;
            hit = true;
            e.blink = 10; // Flash effect
            playSfx('hit');
            if (e.hp <= 0) {
              e.dead = true;
              playSfx('enemy_die');
              for(let i=0; i<15; i++) createParticle(e.x+e.width/2, e.y+e.height/2, e.type === 'OCTOPUS' ? COLORS.OCTOPUS : COLORS.SPIDER, (Math.random()-0.5)*5, (Math.random()-0.5)*5, 25);
            }
          }
        });
        return !hit && a.x > 0 && a.x < mapW && a.y < INTERNAL_HEIGHT;
      });

      // Enemy Logic
      s.enemies.forEach(e => {
        if (e.dead) return;
        if (e.blink > 0) e.blink--;
        
        if (e.isTrapped) {
          e.trapTimer--; e.blink = (e.blink + 1) % 10;
          if (e.trapTimer <= 0) {
             e.hp = 0; e.dead = true; playSfx('enemy_die');
          }
          return;
        }

        const distToPlayer = Math.hypot(p.x - e.x, p.y - e.y);

        if (e.type === 'OCTOPUS') {
          e.chasing = distToPlayer < 200 && Math.abs(p.y - e.y) < 60;
          const speed = e.chasing ? 2.4 : 1.2;
          if (e.chasing) e.vx = (p.x > e.x ? 1 : -1) * speed;
          e.x += e.vx;
          const nextTx = Math.floor((e.vx > 0 ? e.x + e.width : e.x) / TILE_SIZE);
          const ty = Math.floor((e.y + e.height + 2) / TILE_SIZE);
          if (levelData.map[ty]?.[nextTx] !== '#' || levelData.map[Math.floor(e.y/TILE_SIZE)]?.[nextTx] === '#') {
            e.vx *= -1;
          }
        } else if (e.type === 'SPIDER') {
          const overPlayer = Math.abs(p.x - e.x) < 40 && p.y > e.y;
          if (overPlayer && e.vy === 0) e.vy = 5;
          e.y += e.vy;
          if (e.y > e.initialY + 200) e.vy = -2;
          if (e.y <= e.initialY) { e.y = e.initialY; e.vy = 0; }
        } else if (e.type === 'MOSQUITO') {
          e.x += (p.x - e.x) * 0.015;
          e.y += (p.y - 30 - e.y) * 0.015 + Math.sin(s.frame * 0.1) * 1.5;
        }

        if (p.invincible <= 0 && p.x < e.x + e.width && p.x + p.width > e.x && p.y < e.y + e.height && p.y + p.height > e.y) {
          p.health--; p.invincible = 60; p.vy = -6; p.vx = p.x < e.x ? -8 : 8;
          playSfx('hit');
          if (p.health <= 0) { onGameOver(); cancelAnimationFrame(animationId); }
        }

        s.traps.forEach(t => {
          if (t.open && e.x < t.x + t.width && e.x + e.width > t.x && e.y < t.y + t.height && e.y + e.height > t.y) {
            e.isTrapped = true; e.trapTimer = 120; t.open = false;
          }
        });
      });

      s.particles = s.particles.filter(pt => {
        pt.x += pt.vx; pt.y += pt.vy; pt.life--;
        return pt.life > 0;
      });

      s.camX = Math.max(0, Math.min(p.x - INTERNAL_WIDTH / 2, mapW - INTERNAL_WIDTH));
      setHud({ health: p.health, arrows: p.arrows, level: levelData.id });
    };

    const drawPlayer = (p: any, frame: number) => {
      const s = stateRef.current;
      ctx.save(); ctx.translate(p.x + p.width/2, p.y + p.height/2);
      if (!p.facingRight) ctx.scale(-1, 1);
      if (p.invincible > 0 && frame % 4 < 2) ctx.globalAlpha = 0.5;

      const bounce = Math.sin(frame * 0.2) * 2;
      const legMove = p.state === 'run' ? Math.sin(frame * 0.3) * 8 : 0;

      ctx.fillStyle = COLORS.PLAYER_CLOTHES;
      ctx.fillRect(-8, -10 + (p.state === 'idle' ? bounce/2 : 0), 16, 16);
      ctx.fillStyle = COLORS.PLAYER_SKIN;
      ctx.fillRect(-6, -22 + (p.state === 'idle' ? bounce : 0), 12, 12); 
      ctx.fillStyle = '#000'; ctx.fillRect(2, -18 + (p.state === 'idle' ? bounce : 0), 2, 2);

      ctx.fillStyle = '#333';
      if (p.state === 'jump') { ctx.fillRect(-6, 6, 5, 6); ctx.fillRect(1, 4, 5, 6); }
      else { ctx.fillRect(-7 + legMove, 6, 5, 8); ctx.fillRect(2 - legMove, 6, 5, 8); }

      ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2; ctx.beginPath();
      
      // Draw Bow Rotation
      let rot = 0;
      if (s.keys['arrowup'] || s.keys['w']) rot = -Math.PI/4;
      if ((s.keys['arrowdown'] || s.keys['s']) && !p.isGrounded) rot = Math.PI/4;

      ctx.rotate(rot);
      if (p.state === 'shoot') ctx.arc(10, 0, 15, -Math.PI/2.5, Math.PI/2.5);
      else ctx.arc(0, 5, 12, -Math.PI/2, Math.PI/2);
      ctx.stroke();

      ctx.restore();
    };

    const drawEnemy = (e: any, frame: number) => {
      if (e.dead) return;
      ctx.save(); 
      if (e.blink > 0) { ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; }
      
      if (e.type === 'OCTOPUS') {
        ctx.fillStyle = e.blink > 0 ? '#fff' : COLORS.OCTOPUS; 
        ctx.fillRect(e.x, e.y, e.width, e.height - 4);
        for(let i=0; i<3; i++) ctx.fillRect(e.x + i*(e.width/3), e.y + e.height - 6 + Math.sin(frame * 0.2 + i) * 4, e.width/3 - 2, 8);
        ctx.fillStyle = '#fff'; ctx.fillRect(e.x + (e.vx > 0 ? e.width-8 : 4), e.y + 6, 4, 4);
      } else if (e.type === 'SPIDER') {
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(e.x+e.width/2, 0); ctx.lineTo(e.x+e.width/2, e.y); ctx.stroke();
        ctx.fillStyle = e.blink > 0 ? '#fff' : COLORS.SPIDER; 
        ctx.beginPath(); ctx.ellipse(e.x+e.width/2, e.y+e.height/2, e.width/2, e.height/2, 0, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = COLORS.SPIDER; ctx.lineWidth = 2;
        for(let i=0; i<4; i++) {
          const anim = Math.sin(frame*0.2 + i)*2;
          ctx.beginPath(); ctx.moveTo(e.x, e.y+5+i*4); ctx.lineTo(e.x-8+anim, e.y+i*4); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(e.x+e.width, e.y+5+i*4); ctx.lineTo(e.x+e.width+8-anim, e.y+i*4); ctx.stroke();
        }
      } else if (e.type === 'MOSQUITO') {
        const wing = Math.sin(frame * 0.8) * 15;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.beginPath(); ctx.ellipse(e.x+e.width/4, e.y+e.height/4, e.width/2, wing, 0.5, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(e.x+e.width*0.75, e.y+e.height/4, e.width/2, -wing, -0.5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = e.blink > 0 ? '#fff' : COLORS.MOSQUITO; 
        ctx.fillRect(e.x+e.width/4, e.y+e.height/4, e.width/2, e.height/2);
      }
      
      // Draw HP Bar
      if (e.hp < e.maxHp) {
        ctx.fillStyle = 'red'; ctx.fillRect(e.x, e.y - 6, e.width, 3);
        ctx.fillStyle = 'green'; ctx.fillRect(e.x, e.y - 6, e.width * (e.hp / e.maxHp), 3);
      }

      ctx.restore();
    };

    const draw = () => {
      const s = stateRef.current;
      ctx.clearRect(0, 0, INTERNAL_WIDTH, INTERNAL_HEIGHT);
      
      const grad = ctx.createLinearGradient(0,0,0,INTERNAL_HEIGHT);
      grad.addColorStop(0, COLORS.SKY_TOP); grad.addColorStop(1, COLORS.SKY_BOTTOM);
      ctx.fillStyle = grad; ctx.fillRect(0,0,INTERNAL_WIDTH, INTERNAL_HEIGHT);

      ctx.save(); ctx.translate(-s.camX * 0.4, 0);
      ctx.fillStyle = COLORS.FOREST_DARK;
      for(let i=0; i<10; i++) ctx.fillRect(i*120, 80, 40, INTERNAL_HEIGHT);
      ctx.restore();

      ctx.save(); ctx.translate(-s.camX, 0);
      levelData.map.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) {
          const tx = x * TILE_SIZE; const ty = y * TILE_SIZE;
          if (row[x] === '#') {
            ctx.fillStyle = COLORS.GROUND; ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
            ctx.fillStyle = COLORS.GRASS; ctx.fillRect(tx, ty, TILE_SIZE, 6);
          } else if (row[x] === 'B') {
            ctx.fillStyle = '#795548'; ctx.fillRect(tx + 14, ty, 4, TILE_SIZE);
            ctx.fillStyle = COLORS.FLAG_RED; ctx.beginPath(); ctx.moveTo(tx+18, ty); ctx.lineTo(tx+38+Math.sin(s.frame*0.1)*5, ty+10); ctx.lineTo(tx+18, ty+20); ctx.fill();
          }
        }
      });

      // Draw Items
      s.items.forEach(item => {
        if (!item.collected) {
          const floatY = Math.sin(s.frame * 0.1 + item.floatOffset) * 3;
          if (item.type === 'HEART') {
            ctx.fillStyle = COLORS.HEART;
            ctx.beginPath(); ctx.arc(item.x + 8, item.y + 8 + floatY, 6, 0, Math.PI*2); ctx.fill();
          } else {
            ctx.fillStyle = COLORS.AMMO_BOX;
            ctx.fillRect(item.x + 4, item.y + 4 + floatY, 8, 10);
            ctx.fillStyle = '#ffd700'; ctx.fillRect(item.x + 6, item.y + 6 + floatY, 4, 6);
          }
        }
      });

      s.traps.forEach(t => {
        ctx.fillStyle = COLORS.TRAP_METAL;
        if(t.open) { ctx.fillRect(t.x, t.y+4, t.width, 4); ctx.fillRect(t.x, t.y, 4, 8); ctx.fillRect(t.x+t.width-4, t.y, 4, 8); }
        else ctx.fillRect(t.x+t.width/2-6, t.y-4, 12, 10);
      });

      s.arrows.forEach(a => { 
        ctx.save(); ctx.translate(a.x, a.y);
        ctx.rotate(Math.atan2(a.vy, a.vx));
        ctx.fillStyle = COLORS.ARROW_GOLD; ctx.fillRect(-4, -1, 8, 2); 
        ctx.restore();
      });
      
      s.enemies.forEach(e => drawEnemy(e, s.frame));
      drawPlayer(s.player, s.frame);

      s.particles.forEach(pt => {
        ctx.globalAlpha = pt.life / pt.maxLife; ctx.fillStyle = pt.color; ctx.fillRect(pt.x, pt.y, 2, 2);
      });
      ctx.globalAlpha = 1.0; ctx.restore();
    };

    const loop = () => { update(); draw(); animationId = requestAnimationFrame(loop); };
    const handleKey = (e: KeyboardEvent, isDown: boolean) => {
      const k = e.key.toLowerCase(); stateRef.current.keys[k] = isDown;
      if (isDown) initAudio();
    };

    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    loop();

    return () => {
      window.removeEventListener('keydown', (e) => handleKey(e, true));
      window.removeEventListener('keyup', (e) => handleKey(e, false));
      cancelAnimationFrame(animationId);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
    };
  }, [levelIndex]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-[#050505] p-2">
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between text-white text-[9px] z-10 bg-black/40">
        <div>LVL: {hud.level}</div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className={i < hud.health ? 'text-red-500' : 'text-gray-800'}>❤</span>
          ))}
        </div>
        <div>ARROWS: {hud.arrows}</div>
      </div>

      <canvas 
        ref={canvasRef} 
        width={INTERNAL_WIDTH} 
        height={INTERNAL_HEIGHT} 
        className="w-full h-auto pixel-border shadow-2xl rounded-sm"
        onClick={initAudio}
      />

      <div className="grid grid-cols-2 w-full max-w-xl p-4 gap-4 select-none mt-4">
        <div className="flex gap-2 relative">
          <button onPointerDown={() => handleTouchStart('left')} onPointerUp={() => handleTouchEnd('left')} className="w-16 h-16 bg-white/10 active:bg-white/30 pixel-border text-white text-xl">←</button>
          <div className="flex flex-col gap-2">
            <button onPointerDown={() => handleTouchStart('up')} onPointerUp={() => handleTouchEnd('up')} className="w-16 h-8 bg-white/10 active:bg-white/30 pixel-border text-white text-xs">▲</button>
             <button onPointerDown={() => handleTouchStart('down')} onPointerUp={() => handleTouchEnd('down')} className="w-16 h-8 bg-white/10 active:bg-white/30 pixel-border text-white text-xs">▼</button>
          </div>
          <button onPointerDown={() => handleTouchStart('right')} onPointerUp={() => handleTouchEnd('right')} className="w-16 h-16 bg-white/10 active:bg-white/30 pixel-border text-white text-xl">→</button>
        </div>
        <div className="flex gap-2 justify-end">
          <button onPointerDown={() => handleTouchStart('z')} onPointerUp={() => handleTouchEnd('z')} className="w-14 h-14 bg-blue-600/30 active:bg-blue-600/60 pixel-border text-white text-[8px]">PULO</button>
          <button onPointerDown={() => handleTouchStart('x')} onPointerUp={() => handleTouchEnd('x')} className="w-14 h-14 bg-red-600/30 active:bg-red-600/60 pixel-border text-white text-[8px]">TIRO</button>
          <button onPointerDown={() => handleTouchStart('c')} onPointerUp={() => handleTouchEnd('c')} className="w-14 h-14 bg-amber-600/30 active:bg-amber-600/60 pixel-border text-white text-[8px]">ARMAD.</button>
        </div>
      </div>
    </div>
  );
};

export default GameComponent;
