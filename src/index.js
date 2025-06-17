import "core-js";
import RainRenderer from "./rain-renderer";
import Raindrops from "./raindrops";
import loadImages from "./image-loader";
import createCanvas from "./create-canvas";
import TweenLite from "gsap";
import times from "./times";
import { random, chance } from "./random";
import TextCollisionSystem from "./TextCollisionSystem";

let textureRainFg,
  textureRainBg,
  textureStormLightningFg,
  textureStormLightningBg,
  textureFalloutFg,
  textureFalloutBg,
  textureSunFg,
  textureSunBg,
  textureDrizzleFg,
  textureDrizzleBg,
  dropColor,
  dropAlpha;

let textureFg, textureFgCtx, textureBg, textureBgCtx;

let textureBgSize = {
  width: 384,
  height: 256,
};
let textureFgSize = {
  width: 96,
  height: 64,
};

let raindrops, renderer, canvas;

let parallax = { x: 0, y: 0 };

let weatherData = null;
let curWeatherData = null;
let blend = { v: 0 };

// Enhanced collision tracking
let collisionEffects = {
  impactCount: 0,
  flowCount: 0,
  lastImpactTime: 0,
  lastFlowTime: 0,
  totalCollisions: 0,
};

function loadTextures() {
  loadImages([
    { name: "dropAlpha", src: "img/drop-alpha.png" },
    { name: "dropColor", src: "img/drop-color.png" },

    { name: "textureRainFg", src: "img/weather/texture-rain-fg.png" },
    { name: "textureRainBg", src: "img/weather/texture-rain-bg.png" },

    {
      name: "textureStormLightningFg",
      src: "img/weather/texture-storm-lightning-fg.png",
    },
    {
      name: "textureStormLightningBg",
      src: "img/weather/texture-storm-lightning-bg.png",
    },

    { name: "textureFalloutFg", src: "img/weather/texture-fallout-fg.png" },
    { name: "textureFalloutBg", src: "img/weather/texture-fallout-bg.png" },

    { name: "textureSunFg", src: "img/weather/texture-sun-fg.png" },
    { name: "textureSunBg", src: "img/weather/texture-sun-bg.png" },

    { name: "textureDrizzleFg", src: "img/weather/texture-drizzle-fg.png" },
    { name: "textureDrizzleBg", src: "img/weather/texture-drizzle-bg.png" },
  ]).then((images) => {
    textureRainFg = images.textureRainFg.img;
    textureRainBg = images.textureRainBg.img;

    textureFalloutFg = images.textureFalloutFg.img;
    textureFalloutBg = images.textureFalloutBg.img;

    textureStormLightningFg = images.textureStormLightningFg.img;
    textureStormLightningBg = images.textureStormLightningBg.img;

    textureSunFg = images.textureSunFg.img;
    textureSunBg = images.textureSunBg.img;

    textureDrizzleFg = images.textureDrizzleFg.img;
    textureDrizzleBg = images.textureDrizzleBg.img;

    dropColor = images.dropColor.img;
    dropAlpha = images.dropAlpha.img;

    init();
  });
}
loadTextures();

function init() {
  canvas = document.querySelector("#container");

  let dpi = window.devicePixelRatio;
  canvas.width = window.innerWidth * dpi;
  canvas.height = window.innerHeight * dpi;
  canvas.style.width = window.innerWidth + "px";
  canvas.style.height = window.innerHeight + "px";

  raindrops = new Raindrops(
    canvas.width,
    canvas.height,
    dpi,
    dropAlpha,
    dropColor,
    {
      trailRate: 1,
      trailScaleRange: [0.2, 0.45],
      collisionRadius: 0.45,
      dropletsCleaningRadiusMultiplier: 0.28,
      // Enhanced natural flow options
      textCollisionEnabled: true,
      bounceRestitution: 0.4,
      slideFriction: 0.12,
      splashProbability: 0.4,
      splashIntensity: 2,
      flowChanneling: true,
      naturalClustering: true,
    }
  );

  // Initialize enhanced text collision system
  raindrops.textCollisionSystem = new TextCollisionSystem(canvas);

  textureFg = createCanvas(textureFgSize.width, textureFgSize.height);
  textureFgCtx = textureFg.getContext("2d");
  textureBg = createCanvas(textureBgSize.width, textureBgSize.height);
  textureBgCtx = textureBg.getContext("2d");

  generateTextures(textureRainFg, textureRainBg);

  renderer = new RainRenderer(
    canvas,
    raindrops.canvas,
    textureFg,
    textureBg,
    null,
    {
      brightness: 1.04,
      alphaMultiply: 6,
      alphaSubtract: 3,
    }
  );

  setupEvents();
  initializeEnhancedRainFlow();

  console.log("🌧️ Enhanced rain flow system initialized!");
}

function setupEvents() {
  setupParallax();
  setupWeather();
  setupFlash();
  setupEnhancedCollisionEvents();
  setupInteractiveRainEffects();
}

function setupEnhancedCollisionEvents() {
  // Update collision boundaries on window resize
  window.addEventListener("resize", () => {
    if (raindrops && raindrops.textCollisionSystem) {
      setTimeout(() => {
        raindrops.textCollisionSystem.update();
      }, 100);
    }
  });

  // Update collision boundaries when slides transition
  const slides = document.querySelectorAll(".slide");
  slides.forEach((slide) => {
    slide.addEventListener("transitionend", () => {
      if (raindrops && raindrops.textCollisionSystem) {
        raindrops.textCollisionSystem.update();
      }
    });
  });

  // Enhanced collision tracking with visual feedback
  if (raindrops && raindrops.textCollisionSystem) {
    const originalHandleCollision =
      raindrops.textCollisionSystem.handleCollision.bind(
        raindrops.textCollisionSystem
      );

    raindrops.textCollisionSystem.handleCollision = function (
      drop,
      collisionInfo
    ) {
      const result = originalHandleCollision(drop, collisionInfo);

      // Track collision statistics
      collisionEffects.totalCollisions++;

      // Visual feedback based on collision type
      if (collisionInfo.type === "solid") {
        collisionEffects.impactCount++;
        collisionEffects.lastImpactTime = Date.now();

        // Add impact visual effect
        if (collisionInfo.element) {
          collisionInfo.element.classList.add("collision-impact");
          setTimeout(() => {
            collisionInfo.element.classList.remove("collision-impact");
          }, 400);
        }

        // Create ripple effect at collision point
        createCollisionRipple(drop.x, drop.y, "impact");
      } else if (collisionInfo.type === "flow") {
        collisionEffects.flowCount++;
        collisionEffects.lastFlowTime = Date.now();

        // Add flow visual effect
        if (collisionInfo.element) {
          collisionInfo.element.classList.add("collision-flow");
          setTimeout(() => {
            collisionInfo.element.classList.remove("collision-flow");
          }, 600);

          // Add water channel effect for sustained flow
          if (collisionInfo.flow && collisionInfo.flow.type === "channel") {
            collisionInfo.element.classList.add("water-channel");
            setTimeout(() => {
              collisionInfo.element.classList.remove("water-channel");
            }, 2000);
          }
        }

        // Create subtle flow ripple
        if (Math.random() < 0.3) {
          createCollisionRipple(drop.x, drop.y, "flow");
        }
      }

      return result;
    };
  }
}

function setupInteractiveRainEffects() {
  let mouseInfluence = { x: 0, y: 0, strength: 0 };

  document.addEventListener("mousemove", (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseInfluence.x =
      ((event.clientX - rect.left) / rect.width) *
      (canvas.width / raindrops.scale);
    mouseInfluence.y =
      ((event.clientY - rect.top) / rect.height) *
      (canvas.height / raindrops.scale);
    mouseInfluence.strength = 5;

    // Apply mouse influence to nearby drops
    if (raindrops && raindrops.drops) {
      raindrops.drops.forEach((drop) => {
        const dx = drop.x - mouseInfluence.x;
        const dy = drop.y - mouseInfluence.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50 && !drop.killed) {
          const influence = (50 - distance) / 50;
          drop.momentumX +=
            (dx / distance) * influence * mouseInfluence.strength;
          drop.momentum +=
            (dy / distance) * influence * mouseInfluence.strength * 0.3;
        }
      });
    }
  });

  // Decay mouse influence
  setInterval(() => {
    mouseInfluence.strength *= 0.95;
  }, 16);
}

function setupParallax() {
  document.addEventListener("mousemove", (event) => {
    let x = event.pageX;
    let y = event.pageY;

    TweenLite.to(parallax, 1, {
      x: (x / window.innerWidth) * 2 - 1,
      y: (y / window.innerHeight) * 2 - 1,
      ease: Quint.easeOut,
      onUpdate: () => {
        renderer.parallaxX = parallax.x;
        renderer.parallaxY = parallax.y;
      },
    });
  });
}

function setupFlash() {
  setInterval(() => {
    if (chance(curWeatherData.flashChance)) {
      flash(
        curWeatherData.bg,
        curWeatherData.fg,
        curWeatherData.flashBg,
        curWeatherData.flashFg
      );
    }
  }, 500);
}

function setupWeather() {
  setupWeatherData();
  window.addEventListener("hashchange", (event) => {
    updateWeatherWithFlow();
  });
  updateWeatherWithFlow();
}

function setupWeatherData() {
  let defaultWeather = {
    raining: true,
    minR: 20,
    maxR: 50,
    rainChance: 0.35,
    rainLimit: 6,
    dropletsRate: 50,
    dropletsSize: [3, 5.5],
    trailRate: 1,
    trailScaleRange: [0.25, 0.35],
    fg: textureRainFg,
    bg: textureRainBg,
    flashFg: null,
    flashBg: null,
    flashChance: 0,
    collisionRadiusIncrease: 0.0002,
    // Enhanced natural flow settings
    textCollisionEnabled: true,
    bounceRestitution: 0.4,
    slideFriction: 0.12,
    splashProbability: 0.4,
    splashIntensity: 2,
    flowChanneling: true,
    windStrength: 0,
    windDirection: 0,
    naturalClustering: true,
  };

  function weather(data) {
    return Object.assign({}, defaultWeather, data);
  }

  weatherData = {
    rain: weather({
      rainChance: 0.35,
      dropletsRate: 50,
      raining: true,
      fg: textureRainFg,
      bg: textureRainBg,
      textCollisionEnabled: true,
      bounceRestitution: 0.4,
      slideFriction: 0.12,
      splashProbability: 0.4,
      splashIntensity: 2,
      windStrength: 2,
      windDirection: Math.PI * 0.1, // Slight angle
      naturalClustering: true,
    }),
    storm: weather({
      maxR: 55,
      rainChance: 0.4,
      dropletsRate: 80,
      dropletsSize: [3, 5.5],
      trailRate: 2.5,
      trailScaleRange: [0.25, 0.4],
      fg: textureRainFg,
      bg: textureRainBg,
      flashFg: textureStormLightningFg,
      flashBg: textureStormLightningBg,
      flashChance: 0.1,
      textCollisionEnabled: true,
      bounceRestitution: 0.6, // More energetic in storms
      slideFriction: 0.08, // Less friction in heavy rain
      splashProbability: 0.6,
      splashIntensity: 4,
      windStrength: 8,
      windDirection: Math.PI * 0.15, // Stronger wind angle
      naturalClustering: true,
    }),
    fallout: weather({
      minR: 30,
      maxR: 60,
      rainChance: 0.35,
      dropletsRate: 20,
      trailRate: 4,
      fg: textureFalloutFg,
      bg: textureFalloutBg,
      collisionRadiusIncrease: 0,
      textCollisionEnabled: true,
      bounceRestitution: 0.3,
      slideFriction: 0.06, // Very low friction for radioactive rain
      splashProbability: 0.3,
      splashIntensity: 1,
      windStrength: 1,
      windDirection: Math.PI * 0.05,
      naturalClustering: false, // Radioactive rain is more uniform
    }),
    drizzle: weather({
      minR: 10,
      maxR: 40,
      rainChance: 0.15,
      rainLimit: 2,
      dropletsRate: 10,
      dropletsSize: [3.5, 6],
      fg: textureDrizzleFg,
      bg: textureDrizzleBg,
      textCollisionEnabled: true,
      bounceRestitution: 0.2, // Very gentle bouncing
      slideFriction: 0.18, // High friction for light drops
      splashProbability: 0.15,
      splashIntensity: 1,
      windStrength: 0.5,
      windDirection: Math.PI * 0.02,
      naturalClustering: false,
    }),
    sunny: weather({
      rainChance: 0,
      rainLimit: 0,
      droplets: 0,
      raining: false,
      fg: textureSunFg,
      bg: textureSunBg,
      textCollisionEnabled: false,
      naturalClustering: false,
    }),
  };
}

function updateWeatherWithFlow() {
  let hash = window.location.hash;
  let currentSlide = null;
  let currentNav = null;

  if (hash != "") {
    currentSlide = document.querySelector(hash);
  }
  if (currentSlide == null) {
    currentSlide = document.querySelector(".slide");
    hash = "#" + currentSlide.getAttribute("id");
  }

  currentNav = document.querySelector("[href='" + hash + "']");
  let data = weatherData[currentSlide.getAttribute("data-weather")];
  curWeatherData = data;

  raindrops.options = Object.assign(raindrops.options, data);
  raindrops.clearDrops();

  // Update collision system with flow enhancement
  if (raindrops.textCollisionSystem) {
    setTimeout(() => {
      raindrops.textCollisionSystem.update();
      console.log(
        `🌊 Natural flow updated for ${currentSlide.getAttribute(
          "data-weather"
        )} weather`
      );
    }, 100);
  }

  // Apply wind effects for natural movement
  if (data.windStrength > 0) {
    setInterval(() => {
      if (raindrops.applyWindEffect) {
        raindrops.applyWindEffect(data.windStrength, data.windDirection);
      }
    }, 100);
  }

  // Enhanced texture transition
  TweenLite.fromTo(
    blend,
    1,
    {
      v: 0,
    },
    {
      v: 1,
      ease: Power2.easeInOut,
      onUpdate: () => {
        generateTextures(data.fg, data.bg, blend.v);
        renderer.updateTextures();
      },
      onComplete: () => {
        console.log(
          `✨ Weather transition complete: ${currentSlide.getAttribute(
            "data-weather"
          )}`
        );
      },
    }
  );

  let lastSlide = document.querySelector(".slide--current");
  if (lastSlide != null) lastSlide.classList.remove("slide--current");

  let lastNav = document.querySelector(".nav-item--current");
  if (lastNav != null) lastNav.classList.remove("nav-item--current");

  currentSlide.classList.add("slide--current");
  currentNav.classList.add("nav-item--current");
}

function flash(baseBg, baseFg, flashBg, flashFg) {
  let flashValue = { v: 0 };
  function transitionFlash(to, t = 0.025) {
    return new Promise((resolve, reject) => {
      TweenLite.to(flashValue, t, {
        v: to,
        ease: Quint.easeOut,
        onUpdate: () => {
          generateTextures(baseFg, baseBg);
          generateTextures(flashFg, flashBg, flashValue.v);
          renderer.updateTextures();
        },
        onComplete: () => {
          resolve();
        },
      });
    });
  }

  let lastFlash = transitionFlash(1);
  times(random(2, 7), (i) => {
    lastFlash = lastFlash.then(() => {
      return transitionFlash(random(0.1, 1));
    });
  });
  lastFlash = lastFlash
    .then(() => {
      return transitionFlash(1, 0.1);
    })
    .then(() => {
      transitionFlash(0, 0.25);
    });
}

function generateTextures(fg, bg, alpha = 1) {
  textureFgCtx.globalAlpha = alpha;
  textureFgCtx.drawImage(fg, 0, 0, textureFgSize.width, textureFgSize.height);

  textureBgCtx.globalAlpha = alpha;
  textureBgCtx.drawImage(bg, 0, 0, textureBgSize.width, textureBgSize.height);
}

// Create visual ripple effects at collision points
function createCollisionRipple(x, y, type) {
  const canvasRect = canvas.getBoundingClientRect();

  // Convert canvas coordinates to screen coordinates
  const screenX = (x / canvas.width) * canvasRect.width + canvasRect.left;
  const screenY = (y / canvas.height) * canvasRect.height + canvasRect.top;

  const ripple = document.createElement("div");
  ripple.className = `rain-ripple ripple-${type}`;

  // Style the ripple
  ripple.style.position = "fixed";
  ripple.style.left = screenX - 10 + "px";
  ripple.style.top = screenY - 10 + "px";
  ripple.style.width = "20px";
  ripple.style.height = "20px";
  ripple.style.borderRadius = "50%";
  ripple.style.pointerEvents = "none";
  ripple.style.zIndex = "9999";

  if (type === "impact") {
    ripple.style.border = "2px solid rgba(255, 255, 255, 0.8)";
    ripple.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
  } else {
    ripple.style.border = "1px solid rgba(255, 255, 255, 0.4)";
    ripple.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
  }

  document.body.appendChild(ripple);

  // Animate and remove
  setTimeout(() => {
    ripple.style.transition = "all 0.6s cubic-bezier(0.4, 0, 0.2, 1)";
    ripple.style.transform = "scale(3)";
    ripple.style.opacity = "0";

    setTimeout(() => {
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }, 10);
}

// Natural rain clustering effects
function enableNaturalRainClustering() {
  if (!raindrops || !curWeatherData.naturalClustering) return;

  setInterval(() => {
    if (curWeatherData.raining && Math.random() < 0.1) {
      // Create natural rain clusters
      const clusterX = Math.random() * (raindrops.width / raindrops.scale);
      const clusterY =
        Math.random() * (raindrops.height / raindrops.scale) * 0.3; // Upper area
      const intensity = 0.5 + Math.random() * 1.5;

      if (raindrops.createRainCluster) {
        raindrops.createRainCluster(clusterX, clusterY, intensity);
      }
    }
  }, 2000);
}

// Performance monitoring for rain effects
function setupPerformanceMonitoring() {
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;

  function measurePerformance() {
    frameCount++;
    const currentTime = performance.now();

    if (currentTime - lastTime >= 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;

      // Adjust quality based on performance
      if (fps < 45 && raindrops) {
        // Reduce particle count for better performance
        raindrops.options.maxDrops = Math.max(
          300,
          raindrops.options.maxDrops * 0.9
        );
        raindrops.options.dropletsRate = Math.max(
          20,
          raindrops.options.dropletsRate * 0.9
        );
      } else if (fps > 55 && raindrops) {
        // Increase quality if performance allows
        raindrops.options.maxDrops = Math.min(
          900,
          raindrops.options.maxDrops * 1.05
        );
        raindrops.options.dropletsRate = Math.min(
          80,
          raindrops.options.dropletsRate * 1.05
        );
      }
    }

    requestAnimationFrame(measurePerformance);
  }

  measurePerformance();
}

// Enhanced debug mode with flow visualization
function enableEnhancedDebugMode() {
  console.log("🔍 Enhanced debug mode enabled - Natural flow patterns visible");

  document.body.classList.add("debug-mode");

  const debugCanvas = document.createElement("canvas");
  debugCanvas.width = canvas.width;
  debugCanvas.height = canvas.height;
  debugCanvas.style.position = "absolute";
  debugCanvas.style.top = "0";
  debugCanvas.style.left = "0";
  debugCanvas.style.pointerEvents = "none";
  debugCanvas.style.zIndex = "1000";
  debugCanvas.style.opacity = "0.6";

  const debugCtx = debugCanvas.getContext("2d");
  document.body.appendChild(debugCanvas);

  function drawEnhancedDebugInfo() {
    debugCtx.clearRect(0, 0, debugCanvas.width, debugCanvas.height);

    if (raindrops && raindrops.textCollisionSystem) {
      // Draw collision bounds
      raindrops.textCollisionSystem.drawDebugBounds(debugCtx);

      // Draw statistics
      debugCtx.fillStyle = "white";
      debugCtx.font = "14px Arial";
      debugCtx.globalAlpha = 1;

      const stats = [
        `Collision Bounds: ${raindrops.textCollisionSystem.collisionBounds.length}`,
        `Active Drops: ${raindrops.drops.length}`,
        `Weather: ${
          curWeatherData
            ? Object.keys(weatherData).find(
                (key) => weatherData[key] === curWeatherData
              )
            : "None"
        }`,
        `Flow Fields: ${raindrops.textCollisionSystem.flowFields.size}`,
        `Wind: ${curWeatherData ? curWeatherData.windStrength : 0}`,
        `Clustering: ${
          curWeatherData ? curWeatherData.naturalClustering : false
        }`,
        `Total Collisions: ${collisionEffects.totalCollisions}`,
        `Impacts: ${collisionEffects.impactCount} | Flows: ${collisionEffects.flowCount}`,
      ];

      stats.forEach((stat, index) => {
        debugCtx.fillText(stat, 10, 25 + index * 20);
      });

      // Draw drop velocity vectors
      debugCtx.strokeStyle = "yellow";
      debugCtx.lineWidth = 0.5;
      debugCtx.globalAlpha = 0.3;

      raindrops.drops.forEach((drop) => {
        if (!drop.killed) {
          const canvasX = drop.x * raindrops.scale;
          const canvasY = drop.y * raindrops.scale;

          debugCtx.beginPath();
          debugCtx.moveTo(canvasX, canvasY);
          debugCtx.lineTo(
            canvasX + drop.momentumX * 3,
            canvasY + drop.momentum * 3
          );
          debugCtx.stroke();
        }
      });
    }

    requestAnimationFrame(drawEnhancedDebugInfo);
  }

  drawEnhancedDebugInfo();
}

// Main initialization with enhanced flow
function initializeEnhancedRainFlow() {
  // Enable natural clustering
  enableNaturalRainClustering();

  // Setup performance monitoring
  setupPerformanceMonitoring();

  console.log("🌧️ Enhanced natural rain flow system ready!");
}

// Enhanced collision statistics
function getEnhancedCollisionStats() {
  if (raindrops && raindrops.textCollisionSystem) {
    return {
      collisionBounds: raindrops.textCollisionSystem.collisionBounds.length,
      flowFields: raindrops.textCollisionSystem.flowFields.size,
      activeDrops: raindrops.drops.length,
      weatherType: curWeatherData
        ? Object.keys(weatherData).find(
            (key) => weatherData[key] === curWeatherData
          )
        : "None",
      windStrength: curWeatherData ? curWeatherData.windStrength : 0,
      naturalClustering: curWeatherData
        ? curWeatherData.naturalClustering
        : false,
      textCollisionEnabled: curWeatherData
        ? curWeatherData.textCollisionEnabled
        : false,
      totalCollisions: collisionEffects.totalCollisions,
      impactCollisions: collisionEffects.impactCount,
      flowCollisions: collisionEffects.flowCount,
      lastImpact: new Date(
        collisionEffects.lastImpactTime
      ).toLocaleTimeString(),
      lastFlow: new Date(collisionEffects.lastFlowTime).toLocaleTimeString(),
    };
  }
  return null;
}

// Log collision statistics periodically
setInterval(() => {
  if (curWeatherData && curWeatherData.textCollisionEnabled) {
    console.log(
      `🌊 Rain Flow Stats - Impacts: ${collisionEffects.impactCount}, Flows: ${collisionEffects.flowCount}, Total: ${collisionEffects.totalCollisions}`
    );
  }
}, 15000);

// Global debug functions for console access
window.enableEnhancedRainDebug = enableEnhancedDebugMode;
window.getEnhancedCollisionStats = getEnhancedCollisionStats;
window.createTestRainCluster = function (x, y, intensity = 1) {
  if (raindrops && raindrops.createRainCluster) {
    raindrops.createRainCluster(
      x || Math.random() * (raindrops.width / raindrops.scale),
      y || Math.random() * (raindrops.height / raindrops.scale) * 0.3,
      intensity
    );
    console.log(
      `🌧️ Test rain cluster created at (${x}, ${y}) with intensity ${intensity}`
    );
  }
};

// Optional: Auto-enable debug mode for development (comment out for production)
// setTimeout(() => enableEnhancedDebugMode(), 2000);
