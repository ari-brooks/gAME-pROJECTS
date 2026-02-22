import React, { useEffect, useRef } from 'react';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // --- CONSTANTS ---
    const PHYSICS = {
      GRAVITY: 0.7,
      FRICTION: 0.85,
      ACCEL: 1.2,
      MAX_SPEED: 7,
      JUMP_FORCE: -15,
      JUMP_HOLD_GRAVITY_MULT: 0.5,
    };

    const COLORS = {
      BG: '#0a0a0a',
      PLAYER: '#00ffff',
      ENEMY: '#ffcc00',
      LEVEL_UP: '#cccccc',
      STATIC: '#ffffff',
      MOVING: '#00ffff',
      ROTATING: '#39FF14',
      CRUMBLE: '#ffaa00',
      NEON_BLUE: '#00ffff',
      GHOST: 'rgba(0, 255, 255, 0.15)',
      GATE: '#cccccc',
      ICE: '#88ddff',
      PHASING: '#cc88ff',
      BOUNCY: '#cccccc',
      CRUMBLE_SHATTER: '#ffaa00',
    };

    const GHOST_DELAY = 30;

    // --- STATE ---
    let gameState = 'playing'; // playing, level_up, dead
    let score = 0;
    let glitchTimer = 0;
    let canDoubleJump = false;
    let upgradeErrorTimer = 0;
    let showGrid = false;
    const keys: Record<string, boolean> = {};
    let positionHistory: {x: number, y: number, rotation: number}[] = [];
    let cameraX = 0;
    let cameraY = 0;
    let gameTime = 0;
    let screenShake = 0;

    // --- ENTITIES ---
    let player = createPlayer();
    let platforms: any[] = [];
    let enemies: any[] = [];
    let shards: any[] = [];
    let ripples: any[] = [];
    let lightSources: {x: number, y: number, radius: number}[] = [];
    let levelUpFragments: any[] = [];
    let generationX = 0;
    let levelUpChoice = 0;
    let stars: any[] = [];
    let platformsGeneratedCount = 0;

    function createPlayer() {
      return {
        x: 100, y: canvas.height - 200,
        vx: 0, vy: 0,
        w: 25, h: 25,
        scaleX: 1, scaleY: 1,
        health: 3, maxHealth: 3,
        invincibleTimer: 0,
        grounded: false,
        upgrades: { aero: 0, vital: 0, pulse: 0 },
        vertices: 3,
        rotation: 0,
        onPlatformType: null,
        onPlatform: null as any,
        relativeAngle: 0,
        relativeDist: 0,
        hasLanded: false,
        color: COLORS.PLAYER,
        platformLastX: 0,
        platformLastY: 0,
      };
    }

    function resetGame() {
        player.vx = 0;
        player.vy = 0;
        player.health = player.maxHealth;
        player.invincibleTimer = 0;
        player.grounded = true;
        player.hasLanded = true;

        platforms = [];
        enemies = [];
        shards = [];
        ripples = [];
        lightSources = [];
        levelUpFragments = [];
        generationX = 0;
        platformsGeneratedCount = 0;
        cameraY = 0;

        // Starting platform: Static Dim White Platform at spawn
        const startingPlatform = { x: 50, y: canvas.height - 100, w: 200, h: 10, type: 'static', color: '#cccccc', isNeutral: true };
        platforms.push(startingPlatform);

        // Position player on the starting platform
        player.x = startingPlatform.x + startingPlatform.w / 2 - player.w / 2;
        player.y = startingPlatform.y - player.h;

        // Pre-generate initial screen
        while(generationX < canvas.width * 1.5) {
            generateMorePlatforms();
        }
    }

    function fullReset() {
        positionHistory = [];
        score = 0;
        player = createPlayer();
        resetGame();
        generateStars();
        gameState = 'playing';
    }

    function generateStars() {
        stars = [];
        for (let i = 0; i < 200; i++) {
            stars.push({
                x: Math.random() * canvas.width * 2,
                y: Math.random() * canvas.height,
                size: Math.random() * 1.5 + 0.5,
                speed: Math.random() * 0.2 + 0.1, // Slower for parallax
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    function generateMorePlatforms() {
        for (let i = 0; i < 5; i++) { // Generate a chunk of 5 platforms at a time
            const lastPlatform = platforms[platforms.length - 1];
            if (!lastPlatform) return;

            platformsGeneratedCount++;
            let newPlatform: any;
            let attempts = 0;
            let intersects = false;

            do {
                // Horizontal Spacing: 100px to 350px gap from end of last platform
                const xGap = Math.random() * 250 + 100;
                const x = lastPlatform.x + lastPlatform.w + xGap;
                
                // Vertical Spacing: 120px to 280px above previous
                // Vertical Safety: First 3 platforms have minimum height gap (120px)
                let yGap = platformsGeneratedCount <= 3 ? 120 : (Math.random() * 160 + 120);
                if (platformsGeneratedCount > 3 && platformsGeneratedCount % 5 === 0) {
                    yGap = 350;
                }
                
                // Verticality: New platforms should spawn above the previous one
                const y = lastPlatform.y - yGap;
                
                // Buffer Zone: First 3 platforms are guaranteed stable (Static, Standard Width)
                let type = 'static';
                let w = Math.random() * 150 + 100;
                if (platformsGeneratedCount <= 3) {
                    type = 'static';
                    w = 200; // Standard width
                } else {
                    const platformTypes = ['static', 'horizontal', 'vertical', 'crumble', 'rotating'];
                    type = platformTypes[Math.floor(Math.random() * platformTypes.length)];
                }

                const h = 10;
                let color = COLORS.STATIC;
                
                newPlatform = { x, y, w, h, type, color, isPhasedOut: false };

                switch (type) {
                    case 'static': newPlatform.color = COLORS.STATIC; break;
                    case 'horizontal': 
                    case 'vertical': newPlatform.color = COLORS.MOVING; break;
                    case 'crumble': newPlatform.color = COLORS.CRUMBLE; break;
                    case 'rotating': 
                        newPlatform.color = COLORS.ROTATING;
                        newPlatform.angle = 0;
                        newPlatform.rotationSpeed = (Math.random() * 0.0175 + 0.0174) * (Math.random() > 0.5 ? 1 : -1);
                        break;
                }

                if (Math.random() < 0.1) {
                    newPlatform.color = COLORS.PLAYER; // Keep the phase-through mechanic
                }

                intersects = false;
                for (const p of platforms) {
                    if (rectIntersect(newPlatform, p)) {
                        intersects = true;
                        break;
                    }
                }
                attempts++;
            } while (intersects && attempts < 20);

            if (!intersects) {
                // Buffer Zone: No velocity/rotation for first 3 platforms
                if (platformsGeneratedCount > 3) {
                    if (newPlatform.type === 'horizontal') {
                        newPlatform.startX = newPlatform.x;
                        newPlatform.endX = newPlatform.x + Math.random() * 200 + 100;
                        newPlatform.speed = (Math.random() * 1 + 0.5) * (Math.random() > 0.5 ? 1 : -1);
                    } else if (newPlatform.type === 'vertical') {
                        newPlatform.startY = newPlatform.y;
                        newPlatform.endY = newPlatform.y - (Math.random() * 200 + 100);
                        newPlatform.speed = (Math.random() * 1 + 0.5) * (Math.random() > 0.5 ? 1 : -1);
                    }
                }
                platforms.push(newPlatform);

                const difficulty = Math.min(0.8, 0.25 + score / 5000);
                // Buffer Zone: No enemies for first 3 platforms
                if (platformsGeneratedCount > 3 && Math.random() < difficulty) {
                    const speed = (Math.random() * 1 + 0.75) + (score / 4000);
                    const isMidAir = Math.random() < 0.3; // 30% mid-air

                    if (isMidAir) {
                        // Mid-Air "Gatekeeper"
                        const midX = (lastPlatform.x + lastPlatform.w + newPlatform.x) / 2;
                        const midY = (lastPlatform.y + newPlatform.y) / 2;
                        enemies.push({
                            x: midX - 12.5,
                            y: midY - 12.5,
                            w: 25, h: 25,
                            vx: speed * (Math.random() > 0.5 ? 1 : -1),
                            startX: midX - 50,
                            endX: midX + 50,
                            type: 'mid-air',
                            baseY: midY - 12.5,
                            hoverOffset: Math.random() * Math.PI * 2
                        });
                    } else {
                        // On-Platform Spawning (70%)
                        enemies.push({
                            x: newPlatform.x + newPlatform.w / 2 - 12.5,
                            y: newPlatform.y - 25,
                            w: 25, h: 25,
                            vx: speed * (Math.random() > 0.5 ? 1 : -1),
                            startX: newPlatform.x,
                            endX: newPlatform.x + newPlatform.w,
                            type: 'on-platform'
                        });
                    }
                }
                if (Math.random() < 0.2) {
                    levelUpFragments.push({ x: newPlatform.x + newPlatform.w / 2, y: newPlatform.y - 80, w: 25, h: 25 });
                }
                generationX = newPlatform.x + newPlatform.w;
            }
        }
    }

    function renderRipple(x: number, y: number, maxRadius: number, color: string) {
        ripples.push({ x, y, radius: 0, maxRadius, life: 1.0, color });
    }

    function spawnShatter(x: number, y: number, count: number, color: string) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            shards.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 45,
                type: 'shatter',
                color: color
            } as any);
        }
    }

    // --- INPUT ---
    function rectIntersect(r1: {x:number, y:number, w:number, h:number}, r2: {x:number, y:number, w:number, h:number}) {
        return !(r2.x > r1.x + r1.w || 
                   r2.x + r2.w < r1.x || 
                   r2.y > r1.y + r1.h ||
                   r2.y + r2.h < r1.y);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'KeyG') {
            showGrid = !showGrid;
            return;
        }
        if (gameState === 'level_up') {
            if (e.code === 'ArrowUp') levelUpChoice = (levelUpChoice - 1 + 3) % 3;
            if (e.code === 'ArrowDown') levelUpChoice = (levelUpChoice + 1) % 3;
            if (e.code === 'Enter' || e.code === 'Space') {
                let upgraded = false;
                const UPGRADE_LIMITS = { aero: 5, vital: 3, pulse: 5 };

                if (levelUpChoice === 0 && player.upgrades.aero < UPGRADE_LIMITS.aero) {
                    player.upgrades.aero++;
                    upgraded = true;
                } else if (levelUpChoice === 1 && player.upgrades.vital < UPGRADE_LIMITS.vital) {
                    player.upgrades.vital++; player.maxHealth++; player.health++;
                    upgraded = true;
                } else if (levelUpChoice === 2 && player.upgrades.pulse < UPGRADE_LIMITS.pulse) {
                    player.upgrades.pulse++;
                    upgraded = true;
                }

                if (upgraded) {
                    player.vertices = 3 + player.upgrades.aero + player.upgrades.vital + player.upgrades.pulse;
                    gameState = 'playing';
                } else {
                    upgradeErrorTimer = 30; // Blink red for half a second
                }
            }
            return;
        }
        if (gameState === 'dead' && (e.code === 'Enter' || e.code === 'Space')) {
            fullReset();
            return;
        }

        if (e.code === 'KeyQ') {
            fullReset();
            return;
        }

        keys[e.code] = true;
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            if (player.grounded) {
                if (player.onPlatform && player.onPlatform.type === 'rotating') {
                    const p = player.onPlatform;
                    const centerX = p.x + p.w / 2;
                    const centerY = p.y + p.h / 2;
                    const dx = (player.x + player.w / 2) - centerX;
                    const dy = (player.y + player.h / 2) - centerY;
                    const tangentialVX = -dy * p.rotationSpeed;
                    const tangentialVY = dx * p.rotationSpeed;
                    player.vx += tangentialVX * 2.5;
                    player.vy += tangentialVY;
                }

                player.vy = PHYSICS.JUMP_FORCE * (1 + player.upgrades.aero * 0.1);
                player.grounded = false;
                player.hasLanded = false;
                player.onPlatform = null;
                canDoubleJump = true;
                player.scaleX = 0.6;
                player.scaleY = 1.4;
                renderRipple(player.x + player.w/2, player.y + player.h, 300, COLORS.PLAYER);
                spawnShatter(player.x + player.w/2, player.y + player.h/2, 10, COLORS.PLAYER);
                player.rotation = Math.random() * Math.PI * 2;
            } else if (canDoubleJump) {
                player.vy = PHYSICS.JUMP_FORCE * 0.8;
                canDoubleJump = false;
                player.hasLanded = false;
                player.onPlatform = null;
                player.scaleX = 0.7;
                player.scaleY = 1.3;
                renderRipple(player.x + player.w/2, player.y + player.h/2, 150, 'rgba(0, 170, 255, 0.5)');
                spawnShatter(player.x + player.w/2, player.y + player.h/2, 10, COLORS.PLAYER);
            }
        }

        if (e.code === 'KeyR' && player.upgrades.pulse > 0) {
            const PULSE_RADIUS = 300;
            renderRipple(player.x + player.w/2, player.y + player.h/2, PULSE_RADIUS, COLORS.PLAYER);
            
            // Use a reverse loop for safe removal while iterating
            for (let i = enemies.length - 1; i >= 0; i--) {
                const enemy = enemies[i];
                const dist = Math.hypot((player.x + player.w/2) - (enemy.x + enemy.w/2), (player.y + player.h/2) - (enemy.y + enemy.h/2));
                if (dist < PULSE_RADIUS) {
                    enemies.splice(i, 1);
                    spawnShatter(enemy.x + enemy.w/2, enemy.y + enemy.h/2, 10, COLORS.ENEMY);
                }
            }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- UPDATE ---
    function update() {
        gameTime++;
        if (gameState !== 'playing') return;

        positionHistory.push({x: player.x, y: player.y, rotation: player.rotation});

        // Movement
        if (keys['ArrowLeft'] || keys['KeyA']) player.vx -= PHYSICS.ACCEL;
        else if (keys['ArrowRight'] || keys['KeyD']) player.vx += PHYSICS.ACCEL;
        else {
            let currentFriction = player.grounded ? 1.0 : PHYSICS.FRICTION;
            if (player.grounded && player.onPlatformType === 'ice') {
                currentFriction = 0.99;
            }
            player.vx *= currentFriction;
        }
        player.vx = Math.max(-PHYSICS.MAX_SPEED, Math.min(PHYSICS.MAX_SPEED, player.vx));

        let currentGravity = PHYSICS.GRAVITY;
        if ((keys['Space'] || keys['ArrowUp']) && player.vy < 0) {
            currentGravity *= PHYSICS.JUMP_HOLD_GRAVITY_MULT;
        }
        player.vy += currentGravity;

        const wasGrounded = player.grounded;
        const lastPlatform = player.onPlatform;

        player.grounded = false;
        player.onPlatformType = null;

        if (wasGrounded && lastPlatform) {
            const platformDeltaX = lastPlatform.x - player.platformLastX;
            const platformDeltaY = lastPlatform.y - player.platformLastY;
            player.x += platformDeltaX;
            player.y += platformDeltaY;
        }

        player.x += player.vx;
        player.y += player.vy;

        // Performance Cleanup: Only check platforms within camera viewport
        const visiblePlatforms = platforms.filter(p => 
            p.x + p.w > cameraX - 1000 && p.x < cameraX + canvas.width + 1000
        );

        for (let p of visiblePlatforms) {
            if (p.isPhasedOut || p.isCollidable === false) continue;

            // Type A (Horizontal/Landing): Iron-Clad Floor logic
            if (player.vy >= 0) {
                // Precision Collision: Prediction system (Collision Bridge)
                const nextY = player.y + player.h;
                const prevY = player.y + player.h - player.vy;
                
                const isWithinX = player.x < p.x + p.w && player.x + player.w > p.x;
                // Buffer Zone: 5-pixel tolerance buffer to the top of platforms
                const isCrossingTop = prevY <= p.y + 5 && nextY >= p.y;

                if (isWithinX && isCrossingTop) {
                    const impactVelocity = player.vy;
                    player.y = p.y - player.h;
                    player.vy = 0;
                    player.grounded = true;
                    player.onPlatform = p;
                    player.platformLastX = p.x;
                    player.platformLastY = p.y;

                    if (p.type === 'rotating') {
                        const centerX = p.x + p.w / 2;
                        const centerY = p.y + p.h / 2;
                        const dx = (player.x + player.w / 2) - centerX;
                        const dy = (player.y + player.h / 2) - centerY;
                        player.relativeDist = Math.sqrt(dx * dx + dy * dy);
                        player.relativeAngle = Math.atan2(dy, dx) - p.angle;
                    }

                    if (!player.hasLanded) {
                        renderRipple(player.x + player.w/2, p.y, 400, p.color);
                        lightSources.push({ x: player.x + player.w/2, y: p.y, radius: 850 });
                        const particleCount = Math.min(10, Math.floor(Math.abs(impactVelocity) * 5));
                        spawnShatter(player.x + player.w/2, p.y, particleCount, '#00ffff');
                        player.hasLanded = true;

                        if (Math.abs(impactVelocity) > 12) screenShake = 15;

                        const targetAngles = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
                        let currentRotation = player.rotation % (2 * Math.PI);
                        if (currentRotation < 0) currentRotation += 2 * Math.PI;
                        let closestTarget = targetAngles[0];
                        let minDiff = Infinity;
                        for (const target of targetAngles) {
                            let diff = Math.abs(currentRotation - target);
                            let currentMinDiff = Math.min(diff, 2 * Math.PI - diff);
                            if (currentMinDiff < minDiff) {
                                minDiff = currentMinDiff;
                                closestTarget = target;
                            }
                        }
                        player.rotation = closestTarget;
                    }

                    player.onPlatformType = p.type;
                    canDoubleJump = false;

                    switch(p.type) {
                        case 'crumble':
                            if (!p.isCrumbling) {
                                p.isCrumbling = true;
                                p.collapseTimer = 30;
                                p.originalColor = p.color;
                            }
                            break;
                    }
                }
            }
        }

        // If we are still in the air after checking all platforms, we haven't landed yet
        if (!player.grounded) {
            player.hasLanded = false;
        }

        // Update platforms
        platforms.forEach((p, i) => {
            // Rotating Platform Logic: Update angle
            if (p.type === 'rotating') {
                p.angle = (p.angle || 0) + (p.rotationSpeed || 0.02);
            }

            // Existing movement logic
            if (p.type === 'horizontal') {
                p.x += p.speed;
                if (p.x < p.startX || p.x > p.endX) p.speed *= -1;
            } else if (p.type === 'vertical') {
                p.y += p.speed;
                if (p.y < p.endY || p.y > p.startY) p.speed *= -1;
            }

            // New type-based updates
            if (p.type === 'crumble' && p.isCrumbling) {
                p.collapseTimer--;
                
                // Phase 1: Jitter and Hot Neon Orange
                p.jitterX = (Math.random() - 0.5) * 2;
                p.jitterY = (Math.random() - 0.5) * 2;
                p.color = '#FF4500'; // Hot Neon Orange

                // Slow subtle smoke particle (1 per 10 frames)
                if (gameTime % 10 === 0) {
                    shards.push({
                        x: p.x + Math.random() * p.w,
                        y: p.y,
                        vx: (Math.random() - 0.5) * 1,
                        vy: -Math.random() * 2,
                        life: 30,
                        type: 'shatter',
                        color: 'rgba(255, 69, 0, 0.5)' 
                    } as any);
                }

                if (p.collapseTimer <= 0) {
                    // Phase 2: Remove collision and apply gravity
                    p.isCollidable = false;
                    p.vy = (p.vy || 0) + 0.5;
                    p.y += p.vy;
                    p.jitterX = 0;
                    p.jitterY = 0;
                    
                    if (p.y > cameraY + canvas.height + 500) {
                        platforms.splice(i, 1);
                    }
                }
            }

            if (p.type === 'phasing') {
                const cycleFrames = 180; // 3 seconds at 60fps
                const sineValue = Math.sin(gameTime * (2 * Math.PI / cycleFrames));
                const frameInCycle = gameTime % cycleFrames;
                
                if (sineValue > 0) { // 1.5s solid phase (sine value is positive)
                    p.isPhasedOut = false;
                    p.opacity = 0.8;
                    
                    // Warning flicker: last 500ms (30 frames) of the 90 frame solid phase
                    if (frameInCycle >= 60 && frameInCycle < 90) {
                        p.opacity = (gameTime % 4 < 2) ? 0.8 : 0.4;
                    }
                } else { // 1.5s non-collidable phase (sine value is negative)
                    p.isPhasedOut = true;
                    p.opacity = 0.2;
                }
            }
        });

        // Sticky Rotation Update
        if (player.grounded && player.onPlatform && player.onPlatform.type === 'rotating') {
            const p = player.onPlatform;
            const centerX = p.x + p.w / 2;
            const centerY = p.y + p.h / 2;
            const currentAngle = p.angle + player.relativeAngle;
            player.x = centerX + Math.cos(currentAngle) * player.relativeDist - player.w / 2;
            player.y = centerY + Math.sin(currentAngle) * player.relativeDist - player.h / 2;
        }

        // Player death
        if (player.y > cameraY + canvas.height + 100) player.health = 0;
        if (player.health <= 0) {
            gameState = 'dead';
            spawnShatter(player.x + player.w / 2, player.y + player.h / 2, 10, COLORS.PLAYER);
            renderRipple(player.x + player.w / 2, player.y + player.h / 2, 500, COLORS.ENEMY);
            return;
        }

        // Squash & Stretch
        player.scaleX += (1 - player.scaleX) * 0.1;
        player.scaleY += (1 - player.scaleY) * 0.1;

        // Invincibility
        if (player.invincibleTimer > 0) player.invincibleTimer--;

        // Enemy collision
        for (let i = enemies.length - 1; i >= 0; i--) {
            const e = enemies[i];

            e.x += e.vx;
            if (e.x < e.startX || e.x + e.w > e.endX) {
                e.vx *= -1;
            }

            if (e.type === 'mid-air') {
                // Smooth vertical hover exactly within the 3-block gap (approx 150px)
                e.y = e.baseY + Math.sin(gameTime * 0.05 + (e.hoverOffset || 0)) * 75;
            }

            if (player.x < e.x + e.w && player.x + player.w > e.x &&
                player.y < e.y + e.h && player.y + player.h > e.y) {
                if (player.vy > 0 && player.y + player.h - player.vy <= e.y + 10) {
                    enemies.splice(i, 1);
                    player.vy = PHYSICS.JUMP_FORCE * 0.6;
                    spawnShatter(e.x + e.w/2, e.y + e.h/2, 10, COLORS.ENEMY);
                    renderRipple(e.x, e.y, 300 + player.upgrades.pulse * 50, COLORS.ENEMY);
                } else if (player.invincibleTimer <= 0) {
                    player.health--;
                    player.invincibleTimer = 60;
                    glitchTimer = 10;
                    player.vx = player.x < e.x ? -10 : 10;
                    player.vy = -5;
                }
            }
        }
        
        // Level Up Fragments
        for (let i = levelUpFragments.length - 1; i >= 0; i--) {
            const frag = levelUpFragments[i];
            if (player.x < frag.x + frag.w && player.x + player.w > frag.x &&
                player.y < frag.y + frag.h && player.y + player.h > frag.y) {
                levelUpFragments.splice(i, 1);
                gameState = 'level_up';
                levelUpChoice = 0;
            }
        }

        // Update score
        score = Math.max(score, Math.floor(player.x / 10));

        // Infinite generation
        if (player.x + canvas.width > generationX) {
            generateMorePlatforms();
        }

        // Despawn off-screen entities
        platforms = platforms.filter(p => p.x + p.w > cameraX);
        enemies = enemies.filter(e => e.x + e.w > cameraX);
        levelUpFragments = levelUpFragments.filter(f => f.x + f.w > cameraX);

        // Update shards and ripples
        for (let i = shards.length - 1; i >= 0; i--) {
            const s = shards[i] as any;
            if (s.type === 'shatter' || s.type === 'shockwave') {
                if (s.life > 15) {
                    s.x += s.vx;
                    s.y += s.vy;
                    s.vx *= 0.95;
                    s.vy *= 0.95;
                }
                s.life -= 1;
            } else {
                s.x += s.vx;
                s.y += s.vy;
                s.vy += 0.5;
                s.life -= 0.02;
            }
            if (s.life <= 0) shards.splice(i, 1);
        }
        ripples.forEach((r, i) => { r.radius += (r.maxRadius - r.radius) * 0.1; r.life -= 0.02; if(r.life < 0) ripples.splice(i, 1); });

        if (glitchTimer > 0) glitchTimer--;
        if (upgradeErrorTimer > 0) upgradeErrorTimer--;
        if (screenShake > 0) screenShake--;

        // Camera
        const targetCameraX = player.x - canvas.width / 3;
        cameraX += (targetCameraX - cameraX) * 0.1;

        const targetCameraY = player.y - canvas.height / 2;
        cameraY += (targetCameraY - cameraY) * 0.1;

        // Cleanup light sources that are off-screen
        // We keep them if they are within a reasonable distance of the camera
        const margin = 1000;
        lightSources = lightSources.filter(ls => 
            ls.x + ls.radius > cameraX - margin && 
            ls.x - ls.radius < cameraX + canvas.width + margin &&
            ls.y + ls.radius > cameraY - margin &&
            ls.y - ls.radius < cameraY + canvas.height + margin
        );
    }

    // --- DRAWING ---
    function drawDebugGrid() {
        if (!ctx) return;
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.fillStyle = 'white';

        for (let x = 0; x < canvas.width; x += 50) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
            if (x % 100 === 0 && x > 0) {
                ctx.fillText(x.toString(), x + 4, 12);
            }
        }

        for (let y = 0; y < canvas.height; y += 50) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            if (y % 100 === 0 && y > 0) {
                ctx.fillText(y.toString(), 4, y + 12);
            }
        }

        ctx.restore();
    }
    function draw() {
        ctx.fillStyle = COLORS.BG;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw Stars
        ctx.save();
        stars.forEach(star => {
            const parallaxX = -cameraX * star.speed;
            let starX = (star.x + parallaxX) % (canvas.width * 1.5);
            if (starX < -canvas.width * 0.5) starX += canvas.width * 1.5;

            ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
            ctx.beginPath();
            ctx.arc(starX, star.y, star.size, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        const glitchX = glitchTimer > 0 ? (Math.random() - 0.5) * 20 : 0;
        const glitchY = glitchTimer > 0 ? (Math.random() - 0.5) * 20 : 0;
        ctx.save();
        ctx.translate(glitchX, glitchY);

        ctx.save();
        let shakeX = 0;
        let shakeY = 0;
        if (screenShake > 0) {
            shakeX = (Math.random() - 0.5) * screenShake;
            shakeY = (Math.random() - 0.5) * screenShake;
        }
        ctx.translate(-cameraX + shakeX, -cameraY + shakeY);

        // Draw Ghost
        const ghostIndex = positionHistory.length - GHOST_DELAY;
        if (ghostIndex > 0) {
            const pos = positionHistory[ghostIndex];
            if (pos) {
                drawVectorEntity(ctx, 'player', pos.x, pos.y, player.w, player.h, 1, 1, COLORS.GHOST, player.vertices, false, pos.rotation);
            }
        }

        // Draw entities revealed by ripples and light sources
        const allLights = [
            ...ripples.map(r => ({ x: r.x, y: r.y, radius: r.radius, alpha: r.life, color: r.color })),
            ...lightSources.map(ls => ({ x: ls.x, y: ls.y, radius: ls.radius, alpha: 0.3, color: 'rgba(0, 255, 255, 0.2)' })),
            { x: player.x + player.w/2, y: player.y + player.h/2, radius: 850, alpha: 0.5, color: COLORS.NEON_BLUE } // Player passive light
        ];

        // First, draw the "Light Echoes" glow
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        allLights.forEach(l => {
            const grad = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.radius);
            grad.addColorStop(0, l.color);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.globalAlpha = l.alpha;
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.restore();

        // Then, draw the entities revealed by these lights
        // To avoid drawing entities multiple times, we'll use a single clipping path if possible
        // or just draw them once and use the mask.
        // For simplicity and to match the "brighter" requirement, we can draw them for each light.
        allLights.forEach(l => {
            ctx.save();
            // Alpha Limit: Cap the maximum opacity of a "Revealed" platform to 0.7 (70%)
            ctx.globalAlpha = Math.min(0.7, l.alpha);
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.radius, 0, Math.PI * 2);
            ctx.clip();

            // Exclude from Lighter Blend: Force source-over
            ctx.globalCompositeOperation = 'source-over';

            platforms.forEach(p => { drawPlatform(ctx, p); });
            enemies.forEach(e => { drawVectorEntity(ctx, 'enemy', e.x, e.y, e.w, e.h, 1, 1, COLORS.ENEMY, 4, true); });
            levelUpFragments.forEach(f => { drawVectorEntity(ctx, 'level_up', f.x, f.y, f.w, f.h, 1, 1, COLORS.LEVEL_UP, 4, true); });

            ctx.restore();
        });

        // Draw player always
        const isFlickering = player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 5) % 2 === 0;
        if (!isFlickering) {
            drawVectorEntity(ctx, 'player', player.x, player.y, player.w, player.h, player.scaleX, player.scaleY, player.color, player.vertices, true, player.rotation);
        }

        // Draw shards
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        shards.forEach(s => {
            const shard = s as any;
            if (shard.type === 'shatter' || shard.type === 'shockwave') {
                ctx.fillStyle = shard.color;
                ctx.globalAlpha = shard.life > 15 ? 1.0 : shard.life / 15;
                ctx.shadowColor = shard.color;
                ctx.shadowBlur = 8;
                ctx.fillRect(shard.x - 1.5, shard.y - 1.5, 3, 3);
                ctx.shadowBlur = 0;
            } else {
                ctx.fillStyle = shard.color || COLORS.ENEMY;
                ctx.globalAlpha = shard.life;
                ctx.fillRect(shard.x, shard.y, 3, 3);
            }
        });
        ctx.restore();
        ctx.globalAlpha = 1.0;
        ctx.globalAlpha = 1;

        ctx.restore(); // End world translation

        ctx.restore(); // End glitch effect

        // UI
        drawUI();

        if (showGrid) {
            drawDebugGrid();
        }

        requestAnimationFrame(draw);
    }

    function drawVectorEntity(ctx: CanvasRenderingContext2D, type: string, x: number, y: number, w: number, h: number, scaleX: number, scaleY: number, color: string, vertices: number, useGlow: boolean, rotation = 0) {
        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.scale(scaleX, scaleY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        if (useGlow) {
            ctx.shadowColor = color;
            // ShadowBlur Reduction: Set to a maximum of 5px
            ctx.shadowBlur = 5;
        }

        ctx.beginPath();
        if (type === 'player') {
            ctx.rotate(rotation);
            for (let i = 0; i < 3; i++) {
                const angle = (i / 3) * Math.PI * 2 - Math.PI / 2;
                const px = Math.cos(angle) * w/2;
                const py = Math.sin(angle) * h/2;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        } else if (type === 'enemy') {
             ctx.rect(-w/2, -h/2, w, h);
        } else if (type === 'level_up') {
            ctx.rect(-w/2, -h/2, w, h);
        }
        ctx.closePath();
        ctx.stroke();

        // Fills
        if (type === 'enemy') {
            ctx.beginPath();
            ctx.moveTo(-w * 0.3, -h * 0.3);
            ctx.lineTo(w * 0.3, h * 0.3);
            ctx.moveTo(w * 0.3, -h * 0.3);
            ctx.lineTo(-w * 0.3, h * 0.3);
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawPlatform(ctx: CanvasRenderingContext2D, p: any) {
        ctx.save();
        ctx.translate(p.jitterX || 0, p.jitterY || 0);
        
        ctx.strokeStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 5;

        if (p.type === 'crumble') {
            // Crumbling Distinction: Subtle white wireframe border or slight flicker
            ctx.strokeStyle = (gameTime % 10 < 5) ? '#ffffff' : p.color;
            ctx.lineWidth = 3;
        }

        if (p.type === 'rotating') {
            ctx.save();
            ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
            
            // Motion blur effect
            for (let i = 0; i < 3; i++) {
                ctx.save();
                ctx.rotate(p.angle - p.rotationSpeed * i * 0.8);
                ctx.globalAlpha = 0.4 - i * 0.1;
                ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            }

            // Glowing green core
            const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 15);
            coreGrad.addColorStop(0, '#39FF14');
            coreGrad.addColorStop(0.4, 'rgba(57, 255, 20, 0.4)');
            coreGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = coreGrad;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        } else {
            switch(p.type) {
                case 'crumble':
                    ctx.lineWidth = 2;
                    if (p.isCrumbling) {
                        ctx.setLineDash([15, 5]);
                        // Animate the dash offset to make it look unstable
                        ctx.lineDashOffset = -(gameTime % 20);
                    }
                    break;
                default:
                    ctx.lineWidth = 2;
                    break;
            }
            ctx.strokeRect(p.x, p.y, p.w, p.h);
        }
        
        ctx.restore();
    }

    function drawUI() {
        // Health
        for (let i = 0; i < player.maxHealth; i++) {
            ctx.strokeStyle = COLORS.NEON_BLUE;
            ctx.lineWidth = 2;
            ctx.shadowColor = COLORS.NEON_BLUE;
            ctx.shadowBlur = 5;
            if (i < player.health) {
                ctx.fillStyle = COLORS.NEON_BLUE;
                ctx.fillRect(20 + i * 35, 20, 30, 30);
            } else {
                ctx.strokeRect(20 + i * 35, 20, 30, 30);
            }
        }
        ctx.shadowBlur = 0;

        // Score
        ctx.fillStyle = 'white';
        ctx.font = '20px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`SCORE: ${score}`, canvas.width - 20, 40);

        if (gameState === 'level_up') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0,0,canvas.width, canvas.height);
            ctx.fillStyle = COLORS.LEVEL_UP;
            ctx.font = '40px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = COLORS.LEVEL_UP;
            ctx.shadowBlur = 10;
            ctx.fillText('EVOLVE', canvas.width/2, canvas.height/2 - 100);

            const UPGRADE_LIMITS = { aero: 5, vital: 3, pulse: 5 };
            const choices = [
                `AERO [+JUMP] (${player.upgrades.aero}/${UPGRADE_LIMITS.aero})`,
                `VITAL [+HEALTH] (${player.upgrades.vital}/${UPGRADE_LIMITS.vital})`,
                `PULSE [+RIPPLE] (${player.upgrades.pulse}/${UPGRADE_LIMITS.pulse})`
            ];
            choices.forEach((text, i) => {
                ctx.font = '24px monospace';
                if (i === levelUpChoice) {
                    ctx.fillStyle = COLORS.PLAYER;
                    ctx.shadowColor = COLORS.PLAYER;
                    ctx.shadowBlur = 8;
                    ctx.fillText(`> ${text} <`, canvas.width/2, canvas.height/2 + i * 50);
                } else {
                    const isMaxed = 
                        (i === 0 && player.upgrades.aero >= UPGRADE_LIMITS.aero) ||
                        (i === 1 && player.upgrades.vital >= UPGRADE_LIMITS.vital) ||
                        (i === 2 && player.upgrades.pulse >= UPGRADE_LIMITS.pulse);

                    if (i === levelUpChoice && isMaxed && upgradeErrorTimer > 0 && Math.floor(upgradeErrorTimer / 5) % 2 === 0) {
                        ctx.fillStyle = 'red';
                    } else {
                        ctx.fillStyle = isMaxed ? '#555' : 'white';
                    }
                    ctx.shadowBlur = 0;
                    ctx.fillText(text, canvas.width/2, canvas.height/2 + i * 50);
                }
            });
        } else if (gameState === 'dead') {
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(0,0,canvas.width, canvas.height);
            ctx.fillStyle = COLORS.ENEMY;
            ctx.font = '50px monospace';
            ctx.textAlign = 'center';
            ctx.shadowColor = COLORS.ENEMY;
            ctx.shadowBlur = 10;
            ctx.fillText('ECHO LOST', canvas.width/2, canvas.height/2 - 40);
            ctx.font = '20px monospace';
            ctx.fillStyle = 'white';
            ctx.shadowBlur = 0;
            ctx.fillText('Press Enter to Regenerate', canvas.width/2, canvas.height/2 + 20);
        }
    }

    // --- MAIN LOOP ---
    let animationFrameId: number;
    function gameLoop() {
        update();
        animationFrameId = requestAnimationFrame(gameLoop);
    }

    fullReset();
    gameLoop();
    draw();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="w-full h-screen overflow-hidden bg-[#0a0a0a]">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
