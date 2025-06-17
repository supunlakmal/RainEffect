import loadImages from "./image-loader";
import times from "./times.js";
import createCanvas from "./create-canvas.js";
import { random, chance } from "./random";

let dropSize = 64;
const Drop = {
  x: 0,
  y: 0,
  r: 0,
  spreadX: 0,
  spreadY: 0,
  momentum: 0,
  momentumX: 0,
  lastSpawn: 0,
  nextSpawn: 0,
  parent: null,
  isNew: true,
  killed: false,
  shrink: 0,
  isSplash: false,
  isTrail: false,
};
const defaultOptions = {
  minR: 10,
  maxR: 40,
  maxDrops: 900,
  rainChance: 0.3,
  rainLimit: 3,
  dropletsRate: 50,
  dropletsSize: [2, 4],
  dropletsCleaningRadiusMultiplier: 0.43,
  raining: true,
  globalTimeScale: 1,
  trailRate: 1,
  autoShrink: true,
  spawnArea: [-0.1, 0.95],
  trailScaleRange: [0.2, 0.5],
  collisionRadius: 0.65,
  collisionRadiusIncrease: 0.01,
  dropFallMultiplier: 1,
  collisionBoostMultiplier: 0.05,
  collisionBoost: 1,
  // Text collision options
  textCollisionEnabled: true,
  bounceRestitution: 0.6,
  slideFriction: 0.1,
  splashProbability: 0.3,
  splashIntensity: 2,
  flowChanneling: true,
  windStrength: 0,
  windDirection: 0,
  naturalClustering: true,
};

function Raindrops(width, height, scale, dropAlpha, dropColor, options = {}) {
  this.width = width;
  this.height = height;
  this.scale = scale;
  this.dropAlpha = dropAlpha;
  this.dropColor = dropColor;
  this.options = Object.assign({}, defaultOptions, options);
  this.textCollisionSystem = null; // Will be set from outside
  this.init();
}

Raindrops.prototype = {
  dropColor: null,
  dropAlpha: null,
  canvas: null,
  ctx: null,
  width: 0,
  height: 0,
  scale: 0,
  dropletsPixelDensity: 1,
  droplets: null,
  dropletsCtx: null,
  dropletsCounter: 0,
  drops: null,
  dropsGfx: null,
  clearDropletsGfx: null,
  textureCleaningIterations: 0,
  lastRender: null,
  textCollisionSystem: null,

  options: null,

  init() {
    this.canvas = createCanvas(this.width, this.height);
    this.ctx = this.canvas.getContext("2d");

    this.droplets = createCanvas(
      this.width * this.dropletsPixelDensity,
      this.height * this.dropletsPixelDensity
    );
    this.dropletsCtx = this.droplets.getContext("2d");

    this.drops = [];
    this.dropsGfx = [];

    this.renderDropsGfx();

    this.update();
  },
  get deltaR() {
    return this.options.maxR - this.options.minR;
  },
  get area() {
    return (this.width * this.height) / this.scale;
  },
  get areaMultiplier() {
    return Math.sqrt(this.area / (1024 * 768));
  },
  drawDroplet(x, y, r) {
    this.drawDrop(
      this.dropletsCtx,
      Object.assign(Object.create(Drop), {
        x: x * this.dropletsPixelDensity,
        y: y * this.dropletsPixelDensity,
        r: r * this.dropletsPixelDensity,
      })
    );
  },

  renderDropsGfx() {
    let dropBuffer = createCanvas(dropSize, dropSize);
    let dropBufferCtx = dropBuffer.getContext("2d");
    this.dropsGfx = Array.apply(null, Array(255)).map((cur, i) => {
      let drop = createCanvas(dropSize, dropSize);
      let dropCtx = drop.getContext("2d");

      dropBufferCtx.clearRect(0, 0, dropSize, dropSize);

      // color
      dropBufferCtx.globalCompositeOperation = "source-over";
      dropBufferCtx.drawImage(this.dropColor, 0, 0, dropSize, dropSize);

      // blue overlay, for depth
      dropBufferCtx.globalCompositeOperation = "screen";
      dropBufferCtx.fillStyle = "rgba(0,0," + i + ",1)";
      dropBufferCtx.fillRect(0, 0, dropSize, dropSize);

      // alpha
      dropCtx.globalCompositeOperation = "source-over";
      dropCtx.drawImage(this.dropAlpha, 0, 0, dropSize, dropSize);

      dropCtx.globalCompositeOperation = "source-in";
      dropCtx.drawImage(dropBuffer, 0, 0, dropSize, dropSize);
      return drop;
    });

    // create circle that will be used as a brush to remove droplets
    this.clearDropletsGfx = createCanvas(128, 128);
    let clearDropletsCtx = this.clearDropletsGfx.getContext("2d");
    clearDropletsCtx.fillStyle = "#000";
    clearDropletsCtx.beginPath();
    clearDropletsCtx.arc(64, 64, 64, 0, Math.PI * 2);
    clearDropletsCtx.fill();
  },
  drawDrop(ctx, drop) {
    if (this.dropsGfx.length > 0) {
      let x = drop.x;
      let y = drop.y;
      let r = drop.r;
      let spreadX = drop.spreadX;
      let spreadY = drop.spreadY;

      let scaleX = 1;
      let scaleY = 1.5;

      let d = Math.max(
        0,
        Math.min(1, ((r - this.options.minR) / this.deltaR) * 0.9)
      );
      d *= 1 / ((drop.spreadX + drop.spreadY) * 0.5 + 1);

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";

      d = Math.floor(d * (this.dropsGfx.length - 1));
      ctx.drawImage(
        this.dropsGfx[d],
        (x - r * scaleX * (spreadX + 1)) * this.scale,
        (y - r * scaleY * (spreadY + 1)) * this.scale,
        r * 2 * scaleX * (spreadX + 1) * this.scale,
        r * 2 * scaleY * (spreadY + 1) * this.scale
      );
    }
  },
  clearDroplets(x, y, r = 30) {
    let ctx = this.dropletsCtx;
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(
      this.clearDropletsGfx,
      (x - r) * this.dropletsPixelDensity * this.scale,
      (y - r) * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale,
      r * 2 * this.dropletsPixelDensity * this.scale * 1.5
    );
  },
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.width, this.height);
  },
  createDrop(options) {
    if (this.drops.length >= this.options.maxDrops * this.areaMultiplier)
      return null;

    return Object.assign(Object.create(Drop), options);
  },
  addDrop(drop) {
    if (
      this.drops.length >= this.options.maxDrops * this.areaMultiplier ||
      drop == null
    )
      return false;

    this.drops.push(drop);
    return true;
  },
  updateRain(timeScale) {
    let rainDrops = [];
    if (this.options.raining) {
      let limit = this.options.rainLimit * timeScale * this.areaMultiplier;
      let count = 0;
      while (
        chance(this.options.rainChance * timeScale * this.areaMultiplier) &&
        count < limit
      ) {
        count++;
        let r = random(this.options.minR, this.options.maxR, (n) => {
          return Math.pow(n, 3);
        });
        let rainDrop = this.createDrop({
          x: random(this.width / this.scale),
          y: random(
            (this.height / this.scale) * this.options.spawnArea[0],
            (this.height / this.scale) * this.options.spawnArea[1]
          ),
          r: r,
          momentum: 1 + (r - this.options.minR) * 0.1 + random(2),
          spreadX: 1.5,
          spreadY: 1.5,
        });
        if (rainDrop != null) {
          rainDrops.push(rainDrop);
        }
      }
    }
    return rainDrops;
  },
  clearDrops() {
    this.drops.forEach((drop) => {
      setTimeout(() => {
        drop.shrink = 0.1 + random(0.5);
      }, random(1200));
    });
    this.clearTexture();
  },
  clearTexture() {
    this.textureCleaningIterations = 50;
  },
  updateDroplets(timeScale) {
    if (this.textureCleaningIterations > 0) {
      this.textureCleaningIterations -= 1 * timeScale;
      this.dropletsCtx.globalCompositeOperation = "destination-out";
      this.dropletsCtx.fillStyle = "rgba(0,0,0," + 0.05 * timeScale + ")";
      this.dropletsCtx.fillRect(
        0,
        0,
        this.width * this.dropletsPixelDensity,
        this.height * this.dropletsPixelDensity
      );
    }
    if (this.options.raining) {
      this.dropletsCounter +=
        this.options.dropletsRate * timeScale * this.areaMultiplier;
      times(this.dropletsCounter, (i) => {
        this.dropletsCounter--;
        this.drawDroplet(
          random(this.width / this.scale),
          random(this.height / this.scale),
          random(...this.options.dropletsSize, (n) => {
            return n * n;
          })
        );
      });
    }
    this.ctx.drawImage(this.droplets, 0, 0, this.width, this.height);
  },

  // Enhanced updateDrops method with text collision and natural flow
  updateDrops(timeScale) {
    let newDrops = [];

    this.updateDroplets(timeScale);
    let rainDrops = this.updateRain(timeScale);
    newDrops = newDrops.concat(rainDrops);

    this.drops.sort((a, b) => {
      let va = a.y * (this.width / this.scale) + a.x;
      let vb = b.y * (this.width / this.scale) + b.x;
      return va > vb ? 1 : va == vb ? 0 : -1;
    });

    this.drops.forEach(function (drop, i) {
      if (!drop.killed) {
        // === ENHANCED TEXT COLLISION DETECTION ===
        if (this.textCollisionSystem && this.options.textCollisionEnabled) {
          const collisionResult = this.textCollisionSystem.checkCollision(drop);

          if (collisionResult.collision) {
            this.handleTextCollision(drop, collisionResult);
          }
        }

        // === NATURAL PHYSICS ===
        // Enhanced gravity with air resistance
        const airResistance = 0.98; // Slight air resistance
        drop.momentum *= airResistance;
        drop.momentumX *= airResistance;

        // Gravity influence based on drop size
        const gravityInfluence = Math.min(1, drop.r / this.options.maxR);
        if (
          chance(
            (drop.r - this.options.minR * this.options.dropFallMultiplier) *
              (0.1 / this.deltaR) *
              timeScale
          )
        ) {
          drop.momentum +=
            random((drop.r / this.options.maxR) * 4) * gravityInfluence;
        }

        // Enhanced drop lifecycle
        if (
          this.options.autoShrink &&
          drop.r <= this.options.minR &&
          chance(0.05 * timeScale)
        ) {
          drop.shrink += 0.01;
        }

        // Special behavior for splash and trail drops
        if (drop.isSplash) {
          drop.shrink += 0.02 * timeScale; // Splash drops evaporate faster
          drop.momentum += 1; // Affected more by gravity
        }

        if (drop.isTrail) {
          drop.spreadY *= 1.02; // Trail drops become more elongated
        }

        drop.r -= drop.shrink * timeScale;
        if (drop.r <= 0) drop.killed = true;

        // === ENHANCED TRAIL GENERATION ===
        if (this.options.raining && !drop.isSplash) {
          drop.lastSpawn += drop.momentum * timeScale * this.options.trailRate;
          if (drop.lastSpawn > drop.nextSpawn) {
            // Create more realistic trail based on drop velocity
            const trailScale = Math.min(1, drop.momentum / 10);

            let trailDrop = this.createDrop({
              x: drop.x + random(-drop.r, drop.r) * 0.1,
              y: drop.y - drop.r * 0.01,
              r: drop.r * random(...this.options.trailScaleRange) * trailScale,
              spreadY: drop.momentum * 0.1,
              momentumX: drop.momentumX * 0.3,
              momentum: drop.momentum * 0.7,
              parent: drop,
            });

            if (trailDrop != null) {
              newDrops.push(trailDrop);
              drop.r *= Math.pow(0.97, timeScale);
              drop.lastSpawn = 0;
              drop.nextSpawn =
                random(this.options.minR, this.options.maxR) -
                drop.momentum * 2 * this.options.trailRate +
                (this.options.maxR - drop.r);
            }
          }
        }

        // === NATURAL SPREAD NORMALIZATION ===
        // More realistic spread decay
        drop.spreadX *= Math.pow(0.5, timeScale);
        drop.spreadY *= Math.pow(0.8, timeScale);

        // === ENHANCED POSITION UPDATE ===
        let moved = drop.momentum > 0;
        if (moved && !drop.killed) {
          drop.y += drop.momentum * this.options.globalTimeScale;
          drop.x += drop.momentumX * this.options.globalTimeScale;

          // Boundary checking
          if (drop.y > this.height / this.scale + drop.r) {
            drop.killed = true;
          }
          if (drop.x < -drop.r || drop.x > this.width / this.scale + drop.r) {
            drop.killed = true;
          }
        }

        // === EXISTING DROP-TO-DROP COLLISION ===
        let checkCollision = (moved || drop.isNew) && !drop.killed;
        drop.isNew = false;

        if (checkCollision) {
          this.drops.slice(i + 1, i + 70).forEach((drop2) => {
            if (
              drop != drop2 &&
              drop.r > drop2.r &&
              drop.parent != drop2 &&
              drop2.parent != drop &&
              !drop2.killed
            ) {
              let dx = drop2.x - drop.x;
              let dy = drop2.y - drop.y;
              var d = Math.sqrt(dx * dx + dy * dy);

              if (
                d <
                (drop.r + drop2.r) *
                  (this.options.collisionRadius +
                    drop.momentum *
                      this.options.collisionRadiusIncrease *
                      timeScale)
              ) {
                let pi = Math.PI;
                let r1 = drop.r;
                let r2 = drop2.r;
                let a1 = pi * (r1 * r1);
                let a2 = pi * (r2 * r2);
                let targetR = Math.sqrt((a1 + a2 * 0.8) / pi);

                if (targetR > this.options.maxR) {
                  targetR = this.options.maxR;
                }

                drop.r = targetR;
                drop.momentumX += dx * 0.1;
                drop.spreadX = 0;
                drop.spreadY = 0;
                drop2.killed = true;
                drop.momentum = Math.max(
                  drop2.momentum,
                  Math.min(
                    40,
                    drop.momentum +
                      targetR * this.options.collisionBoostMultiplier +
                      this.options.collisionBoost
                  )
                );
              }
            }
          });
        }

        // === ENHANCED MOMENTUM DECAY ===
        // More realistic momentum decay
        drop.momentum -=
          Math.max(1, this.options.minR * 0.5 - drop.momentum) *
          0.1 *
          timeScale;
        if (drop.momentum < 0) drop.momentum = 0;

        // Horizontal momentum decay with wind resistance
        drop.momentumX *= Math.pow(0.8, timeScale);

        // === FINAL DROP PROCESSING ===
        if (!drop.killed) {
          newDrops.push(drop);
          if (moved && this.options.dropletsRate > 0) {
            this.clearDroplets(
              drop.x,
              drop.y,
              drop.r * this.options.dropletsCleaningRadiusMultiplier
            );
          }
          this.drawDrop(this.ctx, drop);
        }
      }
    }, this);

    this.drops = newDrops;
  },

  // Enhanced text collision handling method
  handleTextCollision(drop, collisionInfo) {
    if (!this.textCollisionSystem) return;

    if (collisionInfo.type === "solid") {
      // Direct hit - create splash and bounce/slide
      this.handleSolidTextCollision(drop, collisionInfo);
    } else if (collisionInfo.type === "flow") {
      // Flow influence - guide rain around text
      this.handleFlowInfluence(drop, collisionInfo);
    }
  },

  handleSolidTextCollision(drop, collisionInfo) {
    const { bounds, normal } = collisionInfo;
    const impactSpeed = Math.sqrt(
      drop.momentum * drop.momentum + drop.momentumX * drop.momentumX
    );

    if (impactSpeed > 12) {
      // Strong impact - bounce with splash
      this.bounceOffSurface(drop, normal);

      // Create dramatic splash effect
      if (chance(0.6)) {
        this.createSplashEffect(drop, "impact");
      }
    } else {
      // Gentle impact - slide and flow
      this.slideAlongSurface(drop, normal, bounds);

      // Create gentle flow effect
      if (chance(0.3)) {
        this.createSplashEffect(drop, "flow");
      }
    }

    // Visual feedback
    drop.spreadX = Math.max(drop.spreadX, 0.8);
    drop.spreadY = Math.max(drop.spreadY, 0.6);

    // Energy loss
    drop.momentum *= 0.8;
    drop.momentumX *= 0.85;
  },

  handleFlowInfluence(drop, collisionInfo) {
    const flow = collisionInfo.flow;
    if (!flow) return;

    // Calculate influence based on drop size and distance
    const dropInfluence = Math.min(1.0, drop.r / 15);
    const flowStrength = flow.strength * dropInfluence;

    // Apply different flow behaviors
    switch (flow.type) {
      case "deflection":
        // Strong deflection around text edges
        drop.momentumX += flow.x * flowStrength * 1.2;
        drop.momentum += flow.y * flowStrength * 0.8;

        // Create stream effect
        if (chance(0.2)) {
          drop.spreadY = Math.max(drop.spreadY, 0.3);
        }
        break;

      case "flow":
        // Smooth flow around text
        drop.momentumX += flow.x * flowStrength * 0.6;
        drop.momentum += flow.y * flowStrength * 0.5;

        // Slight streaming
        drop.spreadX *= 1.1;
        break;

      case "channel":
        // Channeling effect below text
        drop.momentumX += flow.x * flowStrength * 0.8;
        drop.momentum += flow.y * flowStrength * 0.7;

        // Enhanced streaming effect
        drop.spreadY = Math.max(drop.spreadY, 0.4);

        // Create water trails
        if (chance(0.4)) {
          this.createWaterTrail(drop);
        }
        break;
    }

    // Limit velocity to realistic values
    const maxVel = 20;
    const totalVel = Math.sqrt(
      drop.momentumX * drop.momentumX + drop.momentum * drop.momentum
    );
    if (totalVel > maxVel) {
      const scale = maxVel / totalVel;
      drop.momentumX *= scale;
      drop.momentum *= scale;
    }
  },

  createSplashEffect(drop, type) {
    const splashCount = type === "impact" ? this.options.splashIntensity : 1;
    const splashRange = type === "impact" ? 1.5 : 0.8;

    for (let i = 0; i < splashCount; i++) {
      const angle = (Math.PI * 2 * i) / splashCount + random(-0.5, 0.5);
      const speed = random(2, 6);
      const size = drop.r * random(0.15, 0.4);

      const splashDrop = this.createDrop({
        x: drop.x + random(-drop.r, drop.r) * 0.5,
        y: drop.y + random(-drop.r, drop.r) * 0.5,
        r: size,
        momentumX: Math.cos(angle) * speed * splashRange,
        momentum: Math.sin(angle) * speed * 0.5 + random(1, 3),
        spreadX: 0.6,
        spreadY: 0.4,
        parent: drop,
        // Mark as splash drop for different behavior
        isSplash: true,
      });

      if (splashDrop) {
        this.addDrop(splashDrop);
      }
    }

    // Reduce original drop after splash
    drop.r *= type === "impact" ? 0.7 : 0.9;
  },

  createWaterTrail(drop) {
    // Create flowing water trail effect
    if (drop.momentum > 5) {
      const trailDrop = this.createDrop({
        x: drop.x + random(-2, 2),
        y: drop.y - drop.r * 0.5,
        r: drop.r * random(0.3, 0.6),
        momentumX: drop.momentumX * 0.8 + random(-1, 1),
        momentum: drop.momentum * 0.9,
        spreadX: 0.2,
        spreadY: 0.8, // Elongated for streaming effect
        parent: drop,
        isTrail: true,
      });

      if (trailDrop) {
        this.addDrop(trailDrop);
      }
    }
  },

  // Enhanced bouncing with more realistic physics
  bounceOffSurface(drop, normal) {
    const restitution = this.options.bounceRestitution * 0.6; // Reduced for more realistic bouncing

    // Calculate reflection
    const dotProduct = drop.momentumX * normal.x + drop.momentum * normal.y;

    drop.momentumX = drop.momentumX - 2 * dotProduct * normal.x * restitution;
    drop.momentum = drop.momentum - 2 * dotProduct * normal.y * restitution;

    // Add natural randomness
    drop.momentumX += random(-1, 1);
    drop.momentum += random(-0.5, 0.5);

    // Enhanced spread effect
    drop.spreadX = Math.max(drop.spreadX, 0.8);
    drop.spreadY = Math.max(drop.spreadY, 0.6);
  },

  // Enhanced sliding with flow physics
  slideAlongSurface(drop, normal, bounds) {
    const friction = this.options.slideFriction;

    if (normal.y < 0) {
      // Hit top - flow horizontally along surface
      drop.y = bounds.y - drop.r - 1; // Small offset to prevent sticking

      // Determine flow direction based on impact angle and surface slope
      const impactAngle = Math.atan2(drop.momentum, drop.momentumX);
      const surfaceFlow = drop.x > bounds.centerX ? 1 : -1;

      // Convert vertical momentum to horizontal flow
      const flowSpeed = Math.abs(drop.momentum) * 0.6;
      drop.momentumX = surfaceFlow * flowSpeed * (1 - friction);
      drop.momentum = Math.abs(drop.momentum) * 0.2; // Small downward component

      // Create flowing effect
      drop.spreadY = Math.max(drop.spreadY, 0.5);
    } else if (normal.y > 0) {
      // Hit bottom - bounce slightly and flow away
      drop.y = bounds.bottom + drop.r + 1;
      drop.momentum = -Math.abs(drop.momentum) * 0.3;
      drop.momentumX *= 0.8;
    } else if (normal.x !== 0) {
      // Hit side - flow around edge
      const offset = normal.x > 0 ? 2 : -2;
      drop.x = (normal.x > 0 ? bounds.right : bounds.x) + offset;

      // Flow around the edge
      drop.momentumX = normal.x * 1.5; // Flow away from surface
      drop.momentum += 4; // Accelerate downward due to gravity

      // Create edge flow effect
      drop.spreadX = Math.max(drop.spreadX, 0.4);
    }
  },

  // Add method to create natural rain clustering
  createRainCluster(centerX, centerY, intensity = 1) {
    const clusterSize = 3 + Math.floor(intensity * 3);
    const spreadRange = 15 + intensity * 10;

    for (let i = 0; i < clusterSize; i++) {
      const angle = (Math.PI * 2 * i) / clusterSize + random(-0.5, 0.5);
      const distance = random(0, spreadRange);

      const clusterDrop = this.createDrop({
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance * 0.5,
        r: random(this.options.minR, this.options.maxR * 0.8),
        momentum: random(2, 6) * intensity,
        momentumX: random(-2, 2),
        spreadX: 0.3,
        spreadY: 0.3,
      });

      if (clusterDrop) {
        this.addDrop(clusterDrop);
      }
    }
  },

  // Enhanced method to simulate wind effects
  applyWindEffect(windStrength = 0, windDirection = 0) {
    this.drops.forEach((drop) => {
      if (!drop.killed && !drop.isSplash) {
        const windInfluence = Math.min(1, windStrength * (1 / drop.r));
        drop.momentumX += Math.cos(windDirection) * windInfluence;
        drop.momentum += Math.sin(windDirection) * windInfluence * 0.3;
      }
    });
  },

  // Method to update text collision system
  updateTextCollisions() {
    if (this.textCollisionSystem) {
      this.textCollisionSystem.update();
    }
  },

  update() {
    this.clearCanvas();

    let now = Date.now();
    if (this.lastRender == null) this.lastRender = now;
    let deltaT = now - this.lastRender;
    let timeScale = deltaT / ((1 / 60) * 1000);
    if (timeScale > 1.1) timeScale = 1.1;
    timeScale *= this.options.globalTimeScale;
    this.lastRender = now;

    this.updateDrops(timeScale);

    requestAnimationFrame(this.update.bind(this));
  },
};

export default Raindrops;
