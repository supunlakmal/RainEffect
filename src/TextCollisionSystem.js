// TextCollisionSystem.js - Add this to your src folder

class TextCollisionSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.textElements = [];
    this.collisionBounds = [];
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    this.collisionGrid = new Map();
    this.gridSize = 50; // Grid cell size for spatial partitioning

    this.init();
  }

  init() {
    // Set up off-screen canvas for collision detection
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;

    // Scan for text elements in the DOM
    this.scanTextElements();

    // Create collision boundaries
    this.createCollisionBounds();
  }

  scanTextElements() {
    // Find all text elements that should interact with rain
    const slides = document.querySelectorAll(".slide__element");

    slides.forEach((element) => {
      if (element.offsetParent !== null) {
        // Only visible elements
        this.textElements.push(element);
      }
    });
  }

  createCollisionBounds() {
    this.collisionBounds = [];
    this.collisionGrid.clear();

    this.textElements.forEach((element, index) => {
      const bounds = this.getElementCollisionBounds(element);
      if (bounds) {
        this.collisionBounds.push({
          element,
          bounds,
          index,
          type: "text",
        });

        // Add to spatial grid
        this.addToGrid(bounds, index);
      }
    });
  }

  getElementCollisionBounds(element) {
    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    // Convert to canvas coordinates
    const canvasX = rect.left - canvasRect.left;
    const canvasY = rect.top - canvasRect.top;

    // Scale to actual canvas size (considering device pixel ratio)
    const scaleX = this.canvas.width / canvasRect.width;
    const scaleY = this.canvas.height / canvasRect.height;

    return {
      x: canvasX * scaleX,
      y: canvasY * scaleY,
      width: rect.width * scaleX,
      height: rect.height * scaleY,
      right: (canvasX + rect.width) * scaleX,
      bottom: (canvasY + rect.height) * scaleY,
      centerX: (canvasX + rect.width / 2) * scaleX,
      centerY: (canvasY + rect.height / 2) * scaleY,
    };
  }

  addToGrid(bounds, index) {
    // Add bounds to spatial grid for fast collision queries
    const startX = Math.floor(bounds.x / this.gridSize);
    const endX = Math.floor(bounds.right / this.gridSize);
    const startY = Math.floor(bounds.y / this.gridSize);
    const endY = Math.floor(bounds.bottom / this.gridSize);

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x},${y}`;
        if (!this.collisionGrid.has(key)) {
          this.collisionGrid.set(key, []);
        }
        this.collisionGrid.get(key).push(index);
      }
    }
  }

  checkCollision(drop) {
    // Get potential collisions from spatial grid
    const gridX = Math.floor(drop.x / this.gridSize);
    const gridY = Math.floor(drop.y / this.gridSize);
    const key = `${gridX},${gridY}`;

    const potentialCollisions = this.collisionGrid.get(key) || [];

    for (let i = 0; i < potentialCollisions.length; i++) {
      const boundsIndex = potentialCollisions[i];
      const collision = this.collisionBounds[boundsIndex];

      if (this.circleRectCollision(drop, collision.bounds)) {
        return {
          collision: true,
          bounds: collision.bounds,
          element: collision.element,
          normal: this.calculateCollisionNormal(drop, collision.bounds),
        };
      }
    }

    return { collision: false };
  }

  circleRectCollision(circle, rect) {
    // Find closest point on rectangle to circle center
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.right));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.bottom));

    // Calculate distance between circle center and closest point
    const distanceX = closestX - circle.x;
    const distanceY = closestY - circle.y;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < circle.r * circle.r;
  }

  calculateCollisionNormal(drop, bounds) {
    // Calculate surface normal for collision response
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const dx = drop.x - centerX;
    const dy = drop.y - centerY;

    // Determine which edge was hit
    const overlapX = bounds.width / 2 + drop.r - Math.abs(dx);
    const overlapY = bounds.height / 2 + drop.r - Math.abs(dy);

    if (overlapX < overlapY) {
      // Hit left or right edge
      return { x: dx > 0 ? 1 : -1, y: 0 };
    } else {
      // Hit top or bottom edge
      return { x: 0, y: dy > 0 ? 1 : -1 };
    }
  }

  handleCollision(drop, collisionInfo) {
    const { bounds, normal } = collisionInfo;

    // Calculate collision response based on impact velocity
    const impactSpeed = Math.sqrt(
      drop.momentum * drop.momentum + drop.momentumX * drop.momentumX
    );

    if (impactSpeed > 15) {
      // High velocity - bounce
      this.bounceOffSurface(drop, normal);
    } else {
      // Low velocity - slide along surface
      this.slideAlongSurface(drop, normal, bounds);
    }

    // Add some randomness for more natural behavior
    drop.momentumX += (Math.random() - 0.5) * 2;
    drop.momentum *= 0.8; // Energy loss from collision
  }

  bounceOffSurface(drop, normal) {
    const restitution = 0.6; // Bounciness factor

    // Reflect velocity off surface normal
    const dotProduct = drop.momentumX * normal.x + drop.momentum * normal.y;

    drop.momentumX = drop.momentumX - 2 * dotProduct * normal.x * restitution;
    drop.momentum = drop.momentum - 2 * dotProduct * normal.y * restitution;

    // Add some spread effect
    drop.spreadX = Math.max(drop.spreadX, 0.5);
    drop.spreadY = Math.max(drop.spreadY, 0.5);
  }

  slideAlongSurface(drop, normal, bounds) {
    const friction = 0.1;

    if (normal.y < 0) {
      // Hit top surface - slide along it
      drop.y = bounds.y - drop.r;
      drop.momentum = Math.abs(drop.momentum) * 0.3; // Reduce downward velocity
      drop.momentumX *= 1 - friction; // Apply friction

      // Add slight downward slope effect
      if (Math.abs(drop.momentumX) < 1) {
        drop.momentumX += drop.x > bounds.centerX ? 0.5 : -0.5;
      }
    } else if (normal.y > 0) {
      // Hit bottom surface
      drop.y = bounds.bottom + drop.r;
      drop.momentum = -Math.abs(drop.momentum) * 0.2;
    } else if (normal.x !== 0) {
      // Hit side surface - slide down
      drop.x = normal.x > 0 ? bounds.right + drop.r : bounds.x - drop.r;
      drop.momentumX = 0;
      drop.momentum += 2; // Increase downward velocity
    }
  }

  createFlowField(bounds) {
    // Create vector field around text for more realistic water flow
    const field = [];
    const resolution = 10;

    for (let x = bounds.x - 20; x < bounds.right + 20; x += resolution) {
      for (let y = bounds.y - 20; y < bounds.bottom + 20; y += resolution) {
        const flowVector = this.calculateFlowVector(x, y, bounds);
        field.push({ x, y, flow: flowVector });
      }
    }

    return field;
  }

  calculateFlowVector(x, y, bounds) {
    // Simple flow field that directs water around text
    const centerX = bounds.centerX;
    const centerY = bounds.centerY;

    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < bounds.width * 0.6) {
      // Inside text area - flow around edges
      const angle = Math.atan2(dy, dx);
      return {
        x: Math.cos(angle + Math.PI / 2) * 0.5,
        y: Math.sin(angle + Math.PI / 2) * 0.5 + 0.3, // Add downward bias
      };
    } else {
      // Outside text - normal gravity
      return { x: 0, y: 1 };
    }
  }

  update() {
    // Update collision bounds for moving/changing text
    this.createCollisionBounds();
  }

  // Debug visualization
  drawDebugBounds(ctx) {
    ctx.strokeStyle = "red";
    ctx.lineWidth = 2;

    this.collisionBounds.forEach((collision) => {
      const bounds = collision.bounds;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    });
  }
}

export default TextCollisionSystem;
