// Enhanced TextCollisionSystem.js with natural rain flow

class TextCollisionSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.textElements = [];
    this.collisionBounds = [];
    this.flowFields = new Map();
    this.offscreenCanvas = document.createElement("canvas");
    this.offscreenCtx = this.offscreenCanvas.getContext("2d");
    this.collisionGrid = new Map();
    this.gridSize = 30; // Smaller grid for better flow precision
    this.waterChannels = new Map(); // Track water flow channels
    this.poolingAreas = new Map(); // Track water pooling areas

    this.init();
  }

  init() {
    this.offscreenCanvas.width = this.canvas.width;
    this.offscreenCanvas.height = this.canvas.height;

    this.scanTextElements();
    this.createCollisionBounds();
    this.generateFlowFields();
  }

  scanTextElements() {
    const slides = document.querySelectorAll(".slide__element");
    this.textElements = [];

    slides.forEach((element) => {
      if (element.offsetParent !== null) {
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
        // Create expanded bounds for flow detection
        const expandedBounds = {
          ...bounds,
          // Expand detection area around text
          x: bounds.x - 20,
          y: bounds.y - 15,
          width: bounds.width + 40,
          height: bounds.height + 30,
          right: bounds.right + 20,
          bottom: bounds.bottom + 15,
          // Keep original tight bounds for collision
          innerBounds: bounds,
        };

        this.collisionBounds.push({
          element,
          bounds: expandedBounds,
          innerBounds: bounds,
          index,
          type: "text",
        });

        this.addToGrid(expandedBounds, index);
      }
    });
  }

  getElementCollisionBounds(element) {
    const rect = element.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();

    const canvasX = rect.left - canvasRect.left;
    const canvasY = rect.top - canvasRect.top;

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

  generateFlowFields() {
    this.flowFields.clear();

    this.collisionBounds.forEach((collision, index) => {
      const field = this.createFlowFieldAroundText(collision.bounds);
      this.flowFields.set(index, field);
    });
  }

  createFlowFieldAroundText(bounds) {
    const field = new Map();
    const resolution = 8;
    const expandedArea = 60;

    // Create flow field around text
    for (
      let x = bounds.x - expandedArea;
      x < bounds.right + expandedArea;
      x += resolution
    ) {
      for (
        let y = bounds.y - expandedArea;
        y < bounds.bottom + expandedArea;
        y += resolution
      ) {
        const flowVector = this.calculateFlowVector(x, y, bounds);
        const key = `${Math.floor(x / resolution)},${Math.floor(
          y / resolution
        )}`;
        field.set(key, flowVector);
      }
    }

    return field;
  }

  calculateFlowVector(x, y, bounds) {
    const centerX = bounds.centerX;
    const centerY = bounds.centerY;
    const dx = x - centerX;
    const dy = y - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Distance from text edge
    const edgeDistance = this.getDistanceToEdge(x, y, bounds);

    if (edgeDistance < 5) {
      // Very close to text - strong deflection
      const angle = Math.atan2(dy, dx);
      const deflectionStrength = Math.max(0.8, 1.2 - edgeDistance / 20);

      return {
        x: Math.cos(angle) * deflectionStrength,
        y: Math.sin(angle) * deflectionStrength + 0.6, // Gravity influence
        strength: deflectionStrength,
        type: "deflection",
      };
    } else if (edgeDistance < 25) {
      // Near text - gradual flow around edges
      const angle = Math.atan2(dy, dx);
      const flowStrength = 0.4 + ((25 - edgeDistance) / 25) * 0.4;

      // Create flow around edges
      let flowAngle = angle;
      if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal flow around sides
        flowAngle = dx > 0 ? Math.PI / 6 : -Math.PI / 6;
      } else {
        // Vertical flow over/under text
        flowAngle = dy > 0 ? Math.PI / 2 : -Math.PI / 2;
      }

      return {
        x: Math.cos(flowAngle) * flowStrength,
        y: Math.sin(flowAngle) * flowStrength + 0.8, // Stronger gravity
        strength: flowStrength,
        type: "flow",
      };
    } else if (y > bounds.bottom && Math.abs(dx) < bounds.width * 0.7) {
      // Below text - channeling effect
      const channelStrength = Math.max(
        0,
        1 - Math.abs(dx) / (bounds.width * 0.5)
      );
      return {
        x: dx * 0.1 * channelStrength, // Slight inward flow
        y: 1.2 + channelStrength * 0.5, // Accelerated downward
        strength: channelStrength,
        type: "channel",
      };
    } else {
      // Normal area - slight influence
      return {
        x: (dx * 0.05) / distance,
        y: 1.0, // Normal gravity
        strength: 0.1,
        type: "normal",
      };
    }
  }

  getDistanceToEdge(x, y, bounds) {
    // Calculate shortest distance to text boundary
    const distToLeft = Math.abs(x - bounds.x);
    const distToRight = Math.abs(x - bounds.right);
    const distToTop = Math.abs(y - bounds.y);
    const distToBottom = Math.abs(y - bounds.bottom);

    let minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

    // If inside bounds, distance is 0
    if (
      x >= bounds.x &&
      x <= bounds.right &&
      y >= bounds.y &&
      y <= bounds.bottom
    ) {
      minDist = 0;
    }

    return minDist;
  }

  checkCollision(drop) {
    const gridX = Math.floor(drop.x / this.gridSize);
    const gridY = Math.floor(drop.y / this.gridSize);
    const key = `${gridX},${gridY}`;

    const potentialCollisions = this.collisionGrid.get(key) || [];

    for (let i = 0; i < potentialCollisions.length; i++) {
      const boundsIndex = potentialCollisions[i];
      const collision = this.collisionBounds[boundsIndex];

      // Check against inner bounds for solid collision
      if (this.circleRectCollision(drop, collision.innerBounds)) {
        return {
          collision: true,
          bounds: collision.innerBounds,
          element: collision.element,
          normal: this.calculateCollisionNormal(drop, collision.innerBounds),
          type: "solid",
        };
      }

      // Check against outer bounds for flow influence
      if (this.circleRectCollision(drop, collision.bounds)) {
        return {
          collision: true,
          bounds: collision.bounds,
          element: collision.element,
          flow: this.getFlowInfluence(drop, boundsIndex),
          type: "flow",
        };
      }
    }

    return { collision: false };
  }

  getFlowInfluence(drop, boundsIndex) {
    const field = this.flowFields.get(boundsIndex);
    if (!field) return { x: 0, y: 1, strength: 0 };

    const resolution = 8;
    const gridX = Math.floor(drop.x / resolution);
    const gridY = Math.floor(drop.y / resolution);
    const key = `${gridX},${gridY}`;

    return field.get(key) || { x: 0, y: 1, strength: 0, type: "normal" };
  }

  circleRectCollision(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.right));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.bottom));

    const distanceX = closestX - circle.x;
    const distanceY = closestY - circle.y;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    return distanceSquared < circle.r * circle.r;
  }

  calculateCollisionNormal(drop, bounds) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const dx = drop.x - centerX;
    const dy = drop.y - centerY;

    const overlapX = bounds.width / 2 + drop.r - Math.abs(dx);
    const overlapY = bounds.height / 2 + drop.r - Math.abs(dy);

    if (overlapX < overlapY) {
      return { x: dx > 0 ? 1 : -1, y: 0 };
    } else {
      return { x: 0, y: dy > 0 ? 1 : -1 };
    }
  }

  handleCollision(drop, collisionInfo) {
    if (collisionInfo.type === "solid") {
      // Hard collision with text
      this.handleSolidCollision(drop, collisionInfo);
    } else if (collisionInfo.type === "flow") {
      // Flow influence around text
      this.handleFlowInfluence(drop, collisionInfo);
    }
  }

  handleSolidCollision(drop, collisionInfo) {
    const { bounds, normal } = collisionInfo;
    const impactSpeed = Math.sqrt(
      drop.momentum * drop.momentum + drop.momentumX * drop.momentumX
    );

    if (impactSpeed > 12) {
      // Bounce with energy loss
      const restitution = 0.4;
      const dotProduct = drop.momentumX * normal.x + drop.momentum * normal.y;

      drop.momentumX = drop.momentumX - 2 * dotProduct * normal.x * restitution;
      drop.momentum = drop.momentum - 2 * dotProduct * normal.y * restitution;

      // Create splash effect
      drop.spreadX = Math.max(drop.spreadX, 1.2);
      drop.spreadY = Math.max(drop.spreadY, 1.0);
    } else {
      // Slide along surface
      this.slideAlongSurface(drop, normal, bounds);
    }

    // Energy loss from collision
    drop.momentum *= 0.85;
    drop.momentumX *= 0.9;
  }

  handleFlowInfluence(drop, collisionInfo) {
    const flow = collisionInfo.flow;

    // Apply flow influence based on drop size and momentum
    const influence = Math.min(1.0, flow.strength * (drop.r / 20));

    if (flow.type === "deflection") {
      // Strong deflection around text
      drop.momentumX += flow.x * influence * 0.8;
      drop.momentum += flow.y * influence * 0.6;
    } else if (flow.type === "flow") {
      // Gradual flow around edges
      drop.momentumX += flow.x * influence * 0.4;
      drop.momentum += flow.y * influence * 0.3;
    } else if (flow.type === "channel") {
      // Channeling effect below text
      drop.momentumX += flow.x * influence * 0.6;
      drop.momentum += flow.y * influence * 0.4;

      // Create streaming effect
      if (Math.random() < 0.3) {
        drop.spreadY = Math.max(drop.spreadY, 0.5);
      }
    }

    // Limit maximum velocity to prevent unrealistic behavior
    const maxVelocity = 25;
    const totalVelocity = Math.sqrt(
      drop.momentumX * drop.momentumX + drop.momentum * drop.momentum
    );
    if (totalVelocity > maxVelocity) {
      const scale = maxVelocity / totalVelocity;
      drop.momentumX *= scale;
      drop.momentum *= scale;
    }
  }

  slideAlongSurface(drop, normal, bounds) {
    const friction = 0.1;

    if (normal.y < 0) {
      // Hit top surface - flow along it
      drop.y = bounds.y - drop.r;
      drop.momentum = Math.abs(drop.momentum) * 0.4;

      // Create horizontal flow
      const sideDirection = drop.x > bounds.centerX ? 1 : -1;
      drop.momentumX += sideDirection * 3;
      drop.momentumX *= 1 - friction;
    } else if (normal.y > 0) {
      // Hit bottom surface
      drop.y = bounds.bottom + drop.r;
      drop.momentum = Math.abs(drop.momentum) * 0.6;
    } else if (normal.x !== 0) {
      // Hit side surface - flow down
      drop.x = normal.x > 0 ? bounds.right + drop.r : bounds.x - drop.r;
      drop.momentumX = normal.x * 2; // Flow away from surface
      drop.momentum += 3; // Accelerate downward
    }
  }

  update() {
    this.scanTextElements();
    this.createCollisionBounds();
    this.generateFlowFields();
  }

  drawDebugBounds(ctx) {
    ctx.save();

    // Draw collision bounds
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;

    this.collisionBounds.forEach((collision) => {
      const bounds = collision.innerBounds;
      ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    });

    // Draw flow field (optional - performance intensive)
    ctx.strokeStyle = "blue";
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.3;

    this.flowFields.forEach((field, index) => {
      field.forEach((vector, key) => {
        const [gridX, gridY] = key.split(",").map(Number);
        const x = gridX * 8;
        const y = gridY * 8;

        if (vector.strength > 0.1) {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + vector.x * 10, y + vector.y * 10);
          ctx.stroke();
        }
      });
    });

    ctx.restore();
  }
}

export default TextCollisionSystem;
