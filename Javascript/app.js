import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import * as satellite from "satellite.js";

const BUILD_VERSION = "1.0.2";
let currentLanguage = localStorage.getItem("astronomy-language") === "fr" ? "fr" : "en";

const interfaceCopy = {
  en:{
    title:"ORRERY — Solar prototype", description:"Real-time, physically scaled Solar System explorer.",
    appAria:"Solar System explorer", canvasAria:"Real-time 3D view of the Solar System", brandAria:"Return to the Sun view",
    simulatedTime:"SIMULATED TIME", realTime:"REAL TIME ×1", demo:"DEMO ×350,000", languageAria:"Interface language",
    pickerAria:"Choose a celestial body", activeTarget:"ACTIVE TARGET", tracking:" CAMERA TRACKING ACTIVE",
    scaleNote:"POSITIONS AND RADII USE ONE UNIFORM PHYSICAL SCALE", labelsAria:"Visible celestial bodies", citiesAria:"Local city clocks",
    adminOpen:"Open administrator settings", renderControls:"RENDER CONTROLS", close:"Close", password:"PASSWORD", unlock:"UNLOCK",
    configLoaded:"CONFIGURATION LOADED", logout:"LOG OUT", autoSave:"AUTOMATIC SAVE",
    reference:"HELIOCENTRIC REFERENCE FRAME · J2000", clouds:"CLOUDS · LIVE CLOUD MAPS · CONTAINS MODIFIED EUMETSAT DATA",
    controlsAria:"Controls", orbit:" ORBIT", zoom:" ZOOM", pan:" PAN", follow:" TRACK A BODY",
    center:"Center the camera on", dimensions:"DIMENSIONS", actualRadius:"ACTUAL RADIUS", altitude:"ALTITUDE", earthDistance:"DIST. EARTH", sunDistance:"DIST. SUN",
    engineRealtime:"ASTRONOMY ENGINE · REAL TIME", engineAccelerated:"ASTRONOMY ENGINE · ACCELERATED SIMULATION", engineFallback:"FALLBACK ORBITAL MODE",
    pending:"CHANGES PENDING…", sessionExpired:"ADMIN SESSION EXPIRED", savedFile:"SAVED TO RUNTIME.JSON", savedBrowser:"SAVED IN BROWSER ONLY",
    verifying:"VERIFYING…", tooMany:"TOO MANY ATTEMPTS — TRY AGAIN LATER", wrongPassword:"INCORRECT PASSWORD", serverUnavailable:"SERVER UNAVAILABLE",
  },
  fr:{
    title:"ORRERY — Prototype solaire", description:"Prototype d’exploration du système solaire en temps réel et à l’échelle physique.",
    appAria:"Explorateur du système solaire", canvasAria:"Vue 3D du système solaire en temps réel", brandAria:"Retour à la vue du Soleil",
    simulatedTime:"TEMPS SIMULÉ", realTime:"TEMPS RÉEL ×1", demo:"DÉMO ×350 000", languageAria:"Langue de l’interface",
    pickerAria:"Choisir un corps céleste", activeTarget:"CIBLE ACTIVE", tracking:" SUIVI CAMÉRA ACTIF",
    scaleNote:"POSITIONS ET RAYONS À ÉCHELLE PHYSIQUE UNIFORME", labelsAria:"Corps célestes visibles", citiesAria:"Horloges des villes",
    adminOpen:"Ouvrir les réglages administrateur", renderControls:"CONTRÔLE DU RENDU", close:"Fermer", password:"MOT DE PASSE", unlock:"DÉVERROUILLER",
    configLoaded:"CONFIGURATION CHARGÉE", logout:"DÉCONNEXION", autoSave:"SAUVEGARDE AUTOMATIQUE",
    reference:"RÉFÉRENTIEL HÉLIOCENTRIQUE · J2000", clouds:"NUAGES · LIVE CLOUD MAPS · CONTAINS MODIFIED EUMETSAT DATA",
    controlsAria:"Commandes", orbit:" ORBITER", zoom:" ZOOMER", pan:" DÉPLACER", follow:" SUIVRE UN CORPS",
    center:"Centrer la caméra sur", dimensions:"DIMENSIONS", actualRadius:"RAYON RÉEL", altitude:"ALTITUDE", earthDistance:"DIST. TERRE", sunDistance:"DIST. SOLEIL",
    engineRealtime:"ASTRONOMY ENGINE · TEMPS RÉEL", engineAccelerated:"ASTRONOMY ENGINE · SIMULATION ACCÉLÉRÉE", engineFallback:"MODE ORBITAL DE SECOURS",
    pending:"MODIFICATIONS EN ATTENTE…", sessionExpired:"SESSION ADMIN EXPIRÉE", savedFile:"SAUVEGARDÉ DANS RUNTIME.JSON", savedBrowser:"SAUVEGARDÉ DANS LE NAVIGATEUR UNIQUEMENT",
    verifying:"VÉRIFICATION…", tooMany:"TROP DE TENTATIVES — RÉESSAYEZ PLUS TARD", wrongPassword:"MOT DE PASSE INCORRECT", serverUnavailable:"SERVEUR INDISPONIBLE",
  },
};

const bodyCopy = {
  sun:{ en:["SUN", "STAR · G2V TYPE"], fr:["SOLEIL", "ÉTOILE · TYPE G2V"] },
  mercury:{ en:["MERCURY", "TERRESTRIAL PLANET"], fr:["MERCURE", "PLANÈTE TELLURIQUE"] },
  venus:{ en:["VENUS", "TERRESTRIAL PLANET"], fr:["VÉNUS", "PLANÈTE TELLURIQUE"] },
  earth:{ en:["EARTH", "TERRESTRIAL PLANET"], fr:["TERRE", "PLANÈTE TELLURIQUE"] },
  moon:{ en:["MOON", "NATURAL SATELLITE"], fr:["LUNE", "SATELLITE NATUREL"] },
  mars:{ en:["MARS", "TERRESTRIAL PLANET"], fr:["MARS", "PLANÈTE TELLURIQUE"] },
  jupiter:{ en:["JUPITER", "GAS GIANT"], fr:["JUPITER", "GÉANTE GAZEUSE"] },
  saturn:{ en:["SATURN", "RINGED GAS GIANT"], fr:["SATURNE", "GÉANTE GAZEUSE À ANNEAUX"] },
  uranus:{ en:["URANUS", "ICE GIANT"], fr:["URANUS", "GÉANTE DE GLACES"] },
  neptune:{ en:["NEPTUNE", "ICE GIANT"], fr:["NEPTUNE", "GÉANTE DE GLACES"] },
  iss:{ en:["ISS", "SPACE STATION · NORAD 25544"], fr:["ISS", "STATION SPATIALE · NORAD 25544"] },
};

const t = (key) => interfaceCopy[currentLanguage][key];
const locale = () => currentLanguage === "fr" ? "fr-FR" : "en-US";
const bodyName = (body) => bodyCopy[body.id]?.[currentLanguage]?.[0] ?? body.name;
const bodyType = (body) => bodyCopy[body.id]?.[currentLanguage]?.[1] ?? body.type;

const defaultConfig = {
  render:{ exposure:1.05, bloomStrength:1.35, bloomRadius:0.75, bloomThreshold:0.72 },
  lighting:{ sunIntensity:3.6, ambientIntensity:0.08, sunColor:"#ffffff" },
  earth:{ cityIntensity:2.4, dayIntensity:1.08, nightAmbient:0.018, normalStrength:0.7, specularStrength:0.8, shininess:72, terminatorStart:-0.12, terminatorEnd:0.08, atmosphereOpacity:0.12, cloudOpacity:0.72, liveClouds:1 },
  atmosphere:{ thicknessKm:65, opacity:0.72, innerColor:"#2f8fff", outerColor:"#8edcff", innerIntensity:0.32, outerIntensity:0.9, innerPower:1.6, outerPower:5, outerExtensionKm:45, outerFadeRatio:0.015, sunEdgeStart:0, sunEdgeEnd:0.18 },
  venusAtmosphere:{ thicknessKm:100, opacity:0.72, innerColor:"#ffd28a", outerColor:"#fff0bd", innerIntensity:0.28, outerIntensity:0.72, innerPower:1.7, outerPower:5.2, outerExtensionKm:90, outerFadeRatio:0.015, sunEdgeStart:-0.04, sunEdgeEnd:0.18 },
  marsAtmosphere:{ thicknessKm:80, opacity:0.34, innerColor:"#d97b4b", outerColor:"#ffb27a", innerIntensity:0.2, outerIntensity:0.52, innerPower:1.8, outerPower:5.5, outerExtensionKm:35, outerFadeRatio:0.02, sunEdgeStart:0, sunEdgeEnd:0.2 },
  sun:{ glowOpacity:0.7, glowScale:5.5 },
  materials:{ mercuryRoughness:0.92, mercuryNormalStrength:1, mercuryNormalY:1, venusRoughness:0.88, venusCloudOpacity:0.96, jupiterRoughness:0.86, saturnRoughness:0.9, saturnRingOpacity:0.92, saturnRingAmbient:0.42, saturnPlanetShadow:0.92, saturnRingShadow:0.82, uranusRoughness:0.94, neptuneRoughness:0.94, moonRoughness:0.91, moonNormalStrength:1, moonNormalY:1, marsRoughness:0.91, marsNormalStrength:1, marsNormalY:1 },
  orbits:{ mercuryOpacity:0.2, venusOpacity:0.18, earthOpacity:0.16, moonOpacity:0.28, marsOpacity:0.13, jupiterOpacity:0.11, saturnOpacity:0.1, uranusOpacity:0.09, neptuneOpacity:0.08, minimumOpacity:0.025, fadePower:1.35, mercuryColor:"#c8a77a", venusColor:"#e8bd70", earthColor:"#4aa8ff", moonColor:"#c8d0da", marsColor:"#ff7048", jupiterColor:"#d9ad7c", saturnColor:"#d7c092", uranusColor:"#7ed6df", neptuneColor:"#426dff" },
  navigation:{ zoomSpeedNear:0.55, zoomSpeedFar:4, zoomRampDecades:3 },
  cities:{ visibleDistanceRadii:12, markerAltitudeKm:24, color:"#8edcff", showSeconds:0 },
  textures:{
    mercury:"./Assets/Images/8k_mercury.jpg",
    mercuryNormal:"./Assets/Images/mercury-normal.png",
    venusSurface:"./Assets/Images/8k_venus_surface.jpg",
    venusAtmosphere:"./Assets/Images/4k_venus_atmosphere.jpg",
    earthDay:"./Assets/Images/8k_earth_daymap.jpg",
    earthNight:"./Assets/Images/8k_earth_nightmap.png",
    earthClouds:"./Assets/Images/8k_earth_clouds.jpg",
    earthNormal:"./Assets/Images/8k_earth_normal_map.png",
    earthSpecular:"./Assets/Images/8k_earth_specular_map.png",
    moon:"./Assets/Images/moon_albedo_8k_decoded.png",
    moonNormal:"./Assets/Images/moon_normal_8k_decoded.png",
    mars:"./Assets/Images/8k_mars.jpg",
    marsNormal:"./Assets/Images/Mars_normal.png",
    jupiter:"./Assets/Images/8k_jupiter.jpg",
    saturn:"./Assets/Images/8k_saturn.jpg",
    saturnRing:"./Assets/Images/8k_saturn_ring_alpha.png",
    uranus:"./Assets/Images/2k_uranus.jpg",
    neptune:"./Assets/Images/2k_neptune.jpg",
    sky:"./Assets/Images/8k_stars_milky_way.jpg",
  },
};

function mergeConfig(base, saved) {
  const result = structuredClone(base);
  for (const [section, values] of Object.entries(saved || {})) {
    if (values && typeof values === "object" && !Array.isArray(values)) Object.assign(result[section] ??= {}, values);
  }
  return result;
}

async function loadSavedConfig() {
  const sources = [
    "/api/config",
    `./Assets/Configs/runtime.json?v=${BUILD_VERSION}`,
  ];
  for (const source of sources) {
    try {
      const response = await fetch(source, { cache:"no-store" });
      if (response.ok) return await response.json();
    } catch {
      // La version statique itch.io passe automatiquement à la source suivante.
    }
  }
  try {
    return JSON.parse(localStorage.getItem("astronomy-config") || "{}");
  } catch {
    return {};
  }
}
const savedConfig = await loadSavedConfig();
const config = mergeConfig(defaultConfig, savedConfig);

const canvas = document.querySelector("#space");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = config.render.exposure;

const scene = new THREE.Scene();
const worldRoot = new THREE.Group();
scene.add(worldRoot);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.00005, 7000);
camera.position.set(1.8, 1.1, 2.4);
const renderCamera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.00005, 7000);
renderCamera.position.set(0, 0, 0);
const controls = new OrbitControls(camera, renderer.domElement);
Object.assign(controls, {
  enableDamping:true, dampingFactor:0.055, rotateSpeed:0.55, zoomSpeed:0.8,
  panSpeed:0.55, minDistance:0.0025, maxDistance:6000, screenSpacePanning:true,
});
controls.listenToKeyEvents(window);

const astronomy = window.Astronomy;
const AU_TO_SCENE = 160;
const KM_PER_AU = 149_597_870.7;
const REAL_TIME = 1;
const DEMO_TIME = 350_000;
const LIVE_CLOUDS_URL = "https://clouds.matteason.co.uk/images/8192x4096/clouds-alpha.png";
const LIVE_CLOUDS_FALLBACK_URL = "https://clouds.matteason.co.uk/images/4096x2048/clouds-alpha.png";
let timeScale = REAL_TIME;
let simulationDate = new Date();
let previousFrame = performance.now();

const textureLoader = new THREE.TextureLoader();
const bodies = [];
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tempVector = new THREE.Vector3();
const labelPosition = new THREE.Vector3();
const cityWorldPosition = new THREE.Vector3();
const cityWorldNormal = new THREE.Vector3();
const cityCameraDirection = new THREE.Vector3();
const orientationMatrix = new THREE.Matrix4();
const issRelativePosition = new THREE.Vector3();
const haloCameraRight = new THREE.Vector3();
const haloCameraUp = new THREE.Vector3();
const haloCameraForward = new THREE.Vector3();
const haloSunDirection = new THREE.Vector3();
const saturnSunDirectionLocal = new THREE.Vector3();
const saturnInverseQuaternion = new THREE.Quaternion();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, renderCamera));
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  config.render.bloomStrength,
  config.render.bloomRadius,
  config.render.bloomThreshold,
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

function loadColorTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function loadDataTexture(path) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.NoColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function kilometersToScene(kilometers) {
  return kilometers / KM_PER_AU * AU_TO_SCENE;
}

function makeGlowTexture() {
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 256;
  const context = glowCanvas.getContext("2d");
  const gradient = context.createRadialGradient(128, 128, 8, 128, 128, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.16, "rgba(255,250,224,.95)");
  gradient.addColorStop(0.42, "rgba(255,195,98,.24)");
  gradient.addColorStop(1, "rgba(255,160,64,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(glowCanvas);
}

function createBody(config) {
  const group = new THREE.Group();
  const material = config.isSun
    ? new THREE.MeshBasicMaterial({ color:new THREE.Color(5, 5, 5), toneMapped:false })
    : new THREE.MeshStandardMaterial({
      map:loadColorTexture(config.texture),
      emissive:0x010203,
      roughness:0.91,
      metalness:0,
    });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(config.visualRadius, 96, 64),
    material,
  );
  mesh.userData.bodyId = config.id;
  group.add(mesh);
  worldRoot.add(group);
  return { ...config, group, mesh };
}

const ambientLight = new THREE.AmbientLight(0x28313d, config.lighting.ambientIntensity);
scene.add(ambientLight);
const milkyWay = loadColorTexture(config.textures.sky);
milkyWay.mapping = THREE.EquirectangularReflectionMapping;
scene.background = milkyWay;

const sunlight = new THREE.PointLight(config.lighting.sunColor, config.lighting.sunIntensity, 0, 0);
worldRoot.add(sunlight);

const sun = createBody({
  id:"sun", index:"01", name:"SOLEIL", type:"ÉTOILE · TYPE G2V", radius:"696 340 km",
  visualRadius:kilometersToScene(696_340), astronomyBody:astronomy?.Body.Sun,
  focusDistance:3.2, isSun:true,
});
const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
  map:makeGlowTexture(), color:0xffd38c, transparent:true, opacity:0.7,
  blending:THREE.AdditiveBlending, depthWrite:false, toneMapped:false,
}));
sunGlow.material.opacity = config.sun.glowOpacity;
sunGlow.scale.setScalar(sun.visualRadius * config.sun.glowScale);
sun.group.add(sunGlow);

const mercury = createBody({
  id:"mercury", index:"02", name:"MERCURE", type:"PLANÈTE TELLURIQUE", radius:"2 440 km",
  visualRadius:kilometersToScene(2_439.7), texture:config.textures.mercury,
  astronomyBody:astronomy?.Body.Mercury, focusDistance:kilometersToScene(2_439.7) * 5,
});
const venus = createBody({
  id:"venus", index:"03", name:"VÉNUS", type:"PLANÈTE TELLURIQUE", radius:"6 052 km",
  visualRadius:kilometersToScene(6_051.8), texture:config.textures.venusSurface,
  astronomyBody:astronomy?.Body.Venus, focusDistance:kilometersToScene(6_051.8) * 5,
});
const earth = createBody({
  id:"earth", index:"04", name:"TERRE", type:"PLANÈTE TELLURIQUE", radius:"6 371 km",
  visualRadius:kilometersToScene(6_371), texture:config.textures.earthDay,
  astronomyBody:astronomy?.Body.Earth, focusDistance:kilometersToScene(6_371) * 5,
});
const moon = createBody({
  id:"moon", index:"05", name:"LUNE", type:"SATELLITE NATUREL", radius:"1 737 km",
  visualRadius:kilometersToScene(1_737.4), texture:config.textures.moon,
  astronomyBody:astronomy?.Body.Moon, focusDistance:kilometersToScene(1_737.4) * 5,
});
const mars = createBody({
  id:"mars", index:"06", name:"MARS", type:"PLANÈTE TELLURIQUE", radius:"3 390 km",
  visualRadius:kilometersToScene(3_389.5), texture:config.textures.mars,
  astronomyBody:astronomy?.Body.Mars, focusDistance:kilometersToScene(3_389.5) * 5,
});
const jupiter = createBody({
  id:"jupiter", index:"07", name:"JUPITER", type:"GÉANTE GAZEUSE", radius:"69 911 km",
  visualRadius:kilometersToScene(69_911), texture:config.textures.jupiter,
  astronomyBody:astronomy?.Body.Jupiter, focusDistance:kilometersToScene(69_911) * 5,
});
const saturn = createBody({
  id:"saturn", index:"08", name:"SATURNE", type:"GÉANTE GAZEUSE À ANNEAUX", radius:"58 232 km",
  visualRadius:kilometersToScene(58_232), texture:config.textures.saturn,
  astronomyBody:astronomy?.Body.Saturn, focusDistance:kilometersToScene(140_270) * 3.2,
  selectionRadius:kilometersToScene(140_270),
});
const uranus = createBody({
  id:"uranus", index:"09", name:"URANUS", type:"GÉANTE DE GLACES", radius:"25 362 km",
  visualRadius:kilometersToScene(25_362), texture:config.textures.uranus,
  astronomyBody:astronomy?.Body.Uranus, focusDistance:kilometersToScene(25_362) * 5,
});
const neptune = createBody({
  id:"neptune", index:"10", name:"NEPTUNE", type:"GÉANTE DE GLACES", radius:"24 622 km",
  visualRadius:kilometersToScene(24_622), texture:config.textures.neptune,
  astronomyBody:astronomy?.Body.Neptune, focusDistance:kilometersToScene(24_622) * 5,
});
const issGroup = new THREE.Group();
const issHitRadius = kilometersToScene(0.055);
const issHitMesh = new THREE.Mesh(
  new THREE.SphereGeometry(issHitRadius, 24, 16),
  new THREE.MeshBasicMaterial({ transparent:true, opacity:0, depthWrite:false, colorWrite:false }),
);
issHitMesh.userData.bodyId = "iss";
issGroup.add(issHitMesh);
worldRoot.add(issGroup);
const iss = {
  id:"iss", index:"11", name:"ISS", type:"STATION SPATIALE · NORAD 25544", radius:"109 m · ENVERGURE",
  visualRadius:issHitRadius, focusDistance:kilometersToScene(0.55), group:issGroup, mesh:issHitMesh,
  available:false,
};
bodies.push(sun, mercury, venus, earth, moon, mars, jupiter, saturn, uranus, neptune, iss);

const issLoader = new GLTFLoader();
issLoader.load(
  "./Assets/Models/international_space_station_-_iss_-_3d.glb",
  (gltf) => {
    const model = gltf.scene;
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const largestDimension = Math.max(size.x, size.y, size.z);
    const scale = kilometersToScene(0.109) / Math.max(largestDimension, Number.EPSILON);
    model.scale.setScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    model.traverse((child) => {
      if (!child.isMesh) return;
      child.userData.bodyId = "iss";
      child.material.toneMapped = true;
    });
    issGroup.add(model);
    iss.model = model;
  },
  undefined,
  (error) => console.error("Chargement du modèle ISS impossible", error),
);

let issSatrec = null;
let issTleSource = "cache local";
async function loadISSOrbit() {
  try {
    let tle;
    const apiResponse = await fetch("/api/iss-tle", { cache:"no-store" });
    if (apiResponse.ok) {
      tle = await apiResponse.json();
    } else {
      const staticResponse = await fetch(`./Assets/Configs/iss-tle.txt?v=${BUILD_VERSION}`, { cache:"no-store" });
      if (!staticResponse.ok) throw new Error(`HTTP ${staticResponse.status}`);
      const lines = (await staticResponse.text()).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      tle = {
        line1:lines.find((line) => line.startsWith("1 25544")),
        line2:lines.find((line) => line.startsWith("2 25544")),
        source:"bundled itch.io TLE",
      };
      if (!tle.line1 || !tle.line2) throw new Error("TLE ISS invalide");
    }
    issSatrec = satellite.twoline2satrec(tle.line1, tle.line2);
    issTleSource = tle.source;
    iss.available = true;
  } catch (error) {
    console.error("TLE ISS indisponible", error);
    iss.available = false;
  }
}
loadISSOrbit();
setInterval(loadISSOrbit, 4 * 60 * 60 * 1000);
mercury.mesh.material.roughness = config.materials.mercuryRoughness;
mercury.mesh.material.normalMap = loadDataTexture(config.textures.mercuryNormal);
mercury.mesh.material.normalScale.set(
  config.materials.mercuryNormalStrength,
  config.materials.mercuryNormalStrength * config.materials.mercuryNormalY,
);
moon.mesh.material.roughness = config.materials.moonRoughness;
moon.mesh.material.normalMap = loadDataTexture(config.textures.moonNormal);
moon.mesh.material.normalScale.set(
  config.materials.moonNormalStrength,
  config.materials.moonNormalStrength * config.materials.moonNormalY,
);
mars.mesh.material.roughness = config.materials.marsRoughness;
mars.mesh.material.normalMap = loadDataTexture(config.textures.marsNormal);
mars.mesh.material.normalScale.set(
  config.materials.marsNormalStrength,
  config.materials.marsNormalStrength * config.materials.marsNormalY,
);
venus.mesh.material.roughness = config.materials.venusRoughness;
jupiter.mesh.material.roughness = config.materials.jupiterRoughness;
venus.mesh.material.color.setScalar(0.62);
jupiter.mesh.material.color.setScalar(0.62);
// Jupiter est sensiblement aplatie : 71 492 km à l'équateur, 66 854 km aux pôles.
jupiter.mesh.scale.set(71_492 / 69_911, 66_854 / 69_911, 71_492 / 69_911);
// Saturne est elle aussi fortement aplatie : 60 268 km à l'équateur, 54 364 km aux pôles.
saturn.mesh.scale.set(60_268 / 58_232, 54_364 / 58_232, 60_268 / 58_232);
uranus.mesh.material.roughness = config.materials.uranusRoughness;
uranus.mesh.material.color.setScalar(0.62);
uranus.mesh.scale.set(25_559 / 25_362, 24_973 / 25_362, 25_559 / 25_362);
neptune.mesh.material.roughness = config.materials.neptuneRoughness;
neptune.mesh.material.color.setScalar(0.62);
neptune.mesh.scale.set(24_764 / 24_622, 24_341 / 24_622, 24_764 / 24_622);

const saturnRingInnerKm = 66_900;
const saturnRingOuterKm = 140_270;
const saturnRingInner = kilometersToScene(saturnRingInnerKm);
const saturnRingOuter = kilometersToScene(saturnRingOuterKm);
const saturnRingGeometry = new THREE.RingGeometry(saturnRingInner, saturnRingOuter, 512, 1);
const saturnRingPositions = saturnRingGeometry.attributes.position;
const saturnRingUvs = saturnRingGeometry.attributes.uv;
for (let index = 0; index < saturnRingPositions.count; index += 1) {
  const radius = Math.hypot(saturnRingPositions.getX(index), saturnRingPositions.getY(index));
  saturnRingUvs.setXY(index, (radius - saturnRingInner) / (saturnRingOuter - saturnRingInner), 0.5);
}
saturnRingGeometry.rotateX(Math.PI / 2);
const saturnSurfaceMap = saturn.mesh.material.map;
const saturnRingMap = loadColorTexture(config.textures.saturnRing);
saturn.mesh.material.dispose();
saturn.mesh.material = new THREE.ShaderMaterial({
  uniforms:{
    surfaceMap:{ value:saturnSurfaceMap },
    ringMap:{ value:saturnRingMap },
    sunPosition:{ value:new THREE.Vector3() },
    sunDirectionLocal:{ value:new THREE.Vector3(1, 0, 0) },
    meanRadius:{ value:kilometersToScene(58_232) },
    ellipsoidRadii:{ value:new THREE.Vector3(kilometersToScene(60_268), kilometersToScene(54_364), kilometersToScene(60_268)) },
    ringInner:{ value:saturnRingInner },
    ringOuter:{ value:saturnRingOuter },
    shadowStrength:{ value:config.materials.saturnRingShadow },
    bloomSafeLimit:{ value:Math.max(config.render.bloomThreshold * 0.9, 0.05) },
  },
  vertexShader:`
    uniform float meanRadius;
    uniform vec3 ellipsoidRadii;
    varying vec2 vUv;
    varying vec3 vBodyPosition;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    void main() {
      vUv = uv;
      vBodyPosition = position * (ellipsoidRadii / meanRadius);
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vWorldNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader:`
    uniform sampler2D surfaceMap;
    uniform sampler2D ringMap;
    uniform vec3 sunPosition;
    uniform vec3 sunDirectionLocal;
    uniform float ringInner;
    uniform float ringOuter;
    uniform float shadowStrength;
    uniform float bloomSafeLimit;
    varying vec2 vUv;
    varying vec3 vBodyPosition;
    varying vec3 vWorldPosition;
    varying vec3 vWorldNormal;
    void main() {
      vec3 toSun = normalize(sunPosition - vWorldPosition);
      vec3 toSunView = normalize(mat3(viewMatrix) * toSun);
      float daylight = max(dot(normalize(vWorldNormal), toSunView), 0.0);
      float ringShadow = 0.0;
      if (abs(sunDirectionLocal.y) > 0.0001) {
        float distanceToRing = -vBodyPosition.y / sunDirectionLocal.y;
        if (distanceToRing > 0.0) {
          vec3 ringPoint = vBodyPosition + sunDirectionLocal * distanceToRing;
          float ringRadius = length(ringPoint.xz);
          float ringUv = (ringRadius - ringInner) / (ringOuter - ringInner);
          if (ringUv >= 0.0 && ringUv <= 1.0) ringShadow = texture2D(ringMap, vec2(ringUv, 0.5)).a;
        }
      }
      vec3 color = texture2D(surfaceMap, vUv).rgb * (daylight * 0.92);
      color *= 1.0 - ringShadow * shadowStrength;
      float peak = max(color.r, max(color.g, color.b));
      color *= min(1.0, bloomSafeLimit / max(peak, 0.0001));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
  depthTest:true,
  depthWrite:true,
  toneMapped:true,
});
const saturnRing = new THREE.Mesh(
  saturnRingGeometry,
  new THREE.ShaderMaterial({
    uniforms:{
      ringMap:{ value:saturnRingMap },
      sunDirectionLocal:{ value:new THREE.Vector3(1, 0, 0) },
      ellipsoidRadii:{ value:new THREE.Vector3(kilometersToScene(60_268), kilometersToScene(54_364), kilometersToScene(60_268)) },
      opacity:{ value:config.materials.saturnRingOpacity },
      ambient:{ value:config.materials.saturnRingAmbient },
      shadowStrength:{ value:config.materials.saturnPlanetShadow },
    },
    vertexShader:`
      varying vec2 vUv;
      varying vec3 vBodyPosition;
      void main() {
        vUv = uv;
        vBodyPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader:`
      uniform sampler2D ringMap;
      uniform vec3 sunDirectionLocal;
      uniform vec3 ellipsoidRadii;
      uniform float opacity;
      uniform float ambient;
      uniform float shadowStrength;
      varying vec2 vUv;
      varying vec3 vBodyPosition;
      void main() {
        vec4 ringColor = texture2D(ringMap, vUv);
        float alpha = ringColor.a * opacity;
        if (alpha < 0.005) discard;
        vec3 rayOrigin = vBodyPosition / ellipsoidRadii;
        vec3 rayDirection = sunDirectionLocal / ellipsoidRadii;
        float a = dot(rayDirection, rayDirection);
        float b = dot(rayOrigin, rayDirection);
        float c = dot(rayOrigin, rayOrigin) - 1.0;
        float discriminant = b * b - a * c;
        float hitDistance = (-b - sqrt(max(discriminant, 0.0))) / max(a, 0.000001);
        float planetShadow = step(0.0, discriminant) * step(0.0, hitDistance);
        float twoSidedLight = mix(ambient, 1.0, abs(sunDirectionLocal.y));
        twoSidedLight *= 1.0 - planetShadow * shadowStrength;
        gl_FragColor = vec4(ringColor.rgb * twoSidedLight, alpha);
      }
    `,
    transparent:true,
    side:THREE.DoubleSide,
    depthWrite:false,
    depthTest:true,
    toneMapped:true,
  }),
);
saturnRing.userData.bodyId = "saturn";
saturn.group.add(saturnRing);
saturn.hitMeshes = [saturn.mesh, saturnRing];

const venusClouds = new THREE.Mesh(
  new THREE.SphereGeometry(kilometersToScene(6_121.8), 96, 64),
  new THREE.MeshStandardMaterial({
    map:loadColorTexture(config.textures.venusAtmosphere),
    roughness:0.9,
    metalness:0,
    color:0x9e9e9e,
    transparent:true,
    opacity:config.materials.venusCloudOpacity,
    depthWrite:true,
  }),
);
venus.group.add(venusClouds);

function createAtmosphere(body, planetRadiusKm, settings) {
  const material = new THREE.ShaderMaterial({
    uniforms:{
      sunPosition:{ value:new THREE.Vector3(0, 0, 0) },
      innerColor:{ value:new THREE.Color(settings.innerColor) },
      outerColor:{ value:new THREE.Color(settings.outerColor) },
      opacity:{ value:settings.opacity },
      innerIntensity:{ value:settings.innerIntensity },
      outerIntensity:{ value:settings.outerIntensity },
      innerPower:{ value:settings.innerPower },
      outerPower:{ value:settings.outerPower },
      sunEdgeStart:{ value:settings.sunEdgeStart },
      sunEdgeEnd:{ value:settings.sunEdgeEnd },
    },
    vertexShader:`
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader:`
      uniform vec3 sunPosition;
      uniform vec3 innerColor;
      uniform vec3 outerColor;
      uniform float opacity;
      uniform float innerIntensity;
      uniform float outerIntensity;
      uniform float innerPower;
      uniform float outerPower;
      uniform float sunEdgeStart;
      uniform float sunEdgeEnd;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPosition;
      void main() {
        vec3 normalDirection = normalize(vWorldNormal);
        vec3 viewDirection = normalize(-vWorldPosition);
        vec3 sunDirection = normalize(sunPosition - vWorldPosition);
        float cameraFacing = clamp(abs(dot(normalDirection, viewDirection)), 0.0, 1.0);
        // Fresnel explicite : alpha nul au centre, maximum sur le contour.
        float fresnel = pow(1.0 - cameraFacing, max(innerPower, 0.01));
        float sunlight = smoothstep(sunEdgeStart, sunEdgeEnd, dot(normalDirection, sunDirection));
        float edgeDensity = 0.8 + innerIntensity * 1.6;
        float alpha = clamp(fresnel * sunlight * opacity * edgeDensity, 0.0, 0.92);
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(innerColor, alpha);
      }
    `,
    side:THREE.FrontSide,
    transparent:true,
    blending:THREE.NormalBlending,
    depthTest:true,
    depthWrite:false,
    toneMapped:false,
  });
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(kilometersToScene(planetRadiusKm), 128, 96),
    material,
  );
  mesh.userData.planetRadiusKm = planetRadiusKm;
  mesh.renderOrder = 2;
  body.group.add(mesh);
  return mesh;
}

function createOuterGlow(body, planetRadiusKm, settings) {
  const material = new THREE.ShaderMaterial({
    uniforms:{
      glowColor:{ value:new THREE.Color(settings.outerColor) },
      opacity:{ value:settings.opacity },
      intensity:{ value:settings.outerIntensity },
      power:{ value:settings.outerPower },
      sunEdgeStart:{ value:settings.sunEdgeStart },
      sunEdgeEnd:{ value:settings.sunEdgeEnd },
      innerRadius:{ value:planetRadiusKm / (planetRadiusKm + settings.thicknessKm + settings.outerExtensionKm) },
      sunDirection:{ value:new THREE.Vector2(1, 0) },
      sunProjection:{ value:1 },
    },
    vertexShader:`
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader:`
      uniform vec3 glowColor;
      uniform float opacity;
      uniform float intensity;
      uniform float power;
      uniform float sunEdgeStart;
      uniform float sunEdgeEnd;
      uniform float innerRadius;
      uniform vec2 sunDirection;
      uniform float sunProjection;
      varying vec2 vUv;
      void main() {
        vec2 point = vUv * 2.0 - 1.0;
        float radius = length(point);
        if (radius > 1.0) discard;
        float fadePosition = clamp((radius - innerRadius) / max(1.0 - innerRadius, 0.0001), 0.0, 1.0);
        // Le centre est masqué par la planète. À l'extérieur, une courbe sans marche
        // part du limbe puis s'évapore progressivement sur toute la largeur du halo.
        float fade = exp(-fadePosition * fadePosition * max(1.2, power * 0.55));
        fade *= 1.0 - smoothstep(0.72, 1.0, fadePosition);
        float directionalLight = dot(normalize(point), sunDirection);
        float lightSample = mix(0.35, directionalLight, sunProjection);
        float sunlight = smoothstep(sunEdgeStart, sunEdgeEnd, lightSample);
        float alpha = clamp(fade * sunlight * opacity * intensity * 1.2, 0.0, 0.68);
        if (alpha < 0.001) discard;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent:true,
    blending:THREE.NormalBlending,
    depthTest:true,
    depthWrite:false,
    toneMapped:true,
  });
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(kilometersToScene(planetRadiusKm) * 2, kilometersToScene(planetRadiusKm) * 2),
    material,
  );
  mesh.userData.planetRadiusKm = planetRadiusKm;
  mesh.userData.body = body;
  mesh.renderOrder = 0;
  worldRoot.add(mesh);
  return mesh;
}

const atmosphere = createAtmosphere(earth, 6_371, config.atmosphere);
const venusAtmosphere = createAtmosphere(venus, 6_051.8, config.venusAtmosphere);
const marsAtmosphere = createAtmosphere(mars, 3_389.5, config.marsAtmosphere);
const atmosphereOuterGlow = createOuterGlow(earth, 6_371, config.atmosphere);
const venusOuterGlow = createOuterGlow(venus, 6_051.8, config.venusAtmosphere);
const marsOuterGlow = createOuterGlow(mars, 3_389.5, config.marsAtmosphere);

const earthDayMap = earth.mesh.material.map;
earth.mesh.material.dispose();
earth.mesh.material = new THREE.ShaderMaterial({
  uniforms:{
    dayMap:{ value:earthDayMap },
    nightMap:{ value:loadColorTexture(config.textures.earthNight) },
    cloudsMap:{ value:loadColorTexture(config.textures.earthClouds) },
    normalMap:{ value:loadDataTexture(config.textures.earthNormal) },
    specularMap:{ value:loadDataTexture(config.textures.earthSpecular) },
    sunPosition:{ value:new THREE.Vector3(0, 0, 0) },
    cityIntensity:{ value:config.earth.cityIntensity },
    cloudOpacity:{ value:config.earth.cloudOpacity },
    cloudUsesAlpha:{ value:0 },
    dayIntensity:{ value:config.earth.dayIntensity },
    nightAmbient:{ value:config.earth.nightAmbient },
    normalStrength:{ value:config.earth.normalStrength },
    specularStrength:{ value:config.earth.specularStrength },
    shininess:{ value:config.earth.shininess },
    bloomSafeLimit:{ value:Math.max(config.render.bloomThreshold * 0.9, 0.05) },
    terminatorStart:{ value:config.earth.terminatorStart },
    terminatorEnd:{ value:config.earth.terminatorEnd },
  },
  vertexShader:`
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vWorldNormal = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader:`
    uniform sampler2D dayMap;
    uniform sampler2D nightMap;
    uniform sampler2D cloudsMap;
    uniform sampler2D normalMap;
    uniform sampler2D specularMap;
    uniform vec3 sunPosition;
    uniform float cityIntensity;
    uniform float cloudOpacity;
    uniform float cloudUsesAlpha;
    uniform float dayIntensity;
    uniform float nightAmbient;
    uniform float normalStrength;
    uniform float specularStrength;
    uniform float shininess;
    uniform float bloomSafeLimit;
    uniform float terminatorStart;
    uniform float terminatorEnd;
    varying vec2 vUv;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;
    void main() {
      vec3 toSun = normalize(sunPosition - vWorldPosition);
      vec3 geometricNormal = normalize(vWorldNormal);
      vec3 mapNormal = texture2D(normalMap, vUv).xyz * 2.0 - 1.0;
      mapNormal.xy *= normalStrength;
      vec3 positionDx = dFdx(vWorldPosition);
      vec3 positionDy = dFdy(vWorldPosition);
      vec2 uvDx = dFdx(vUv);
      vec2 uvDy = dFdy(vUv);
      vec3 tangent = normalize(positionDx * uvDy.y - positionDy * uvDx.y);
      vec3 bitangent = normalize(-positionDx * uvDy.x + positionDy * uvDx.x);
      vec3 shadedNormal = normalize(mat3(tangent, bitangent, geometricNormal) * mapNormal);
      float solarIncidence = dot(geometricNormal, toSun);
      float terrainDaylight = max(dot(shadedNormal, toSun), 0.0);
      float cloudDaylight = max(dot(geometricNormal, toSun), 0.0);
      float night = 1.0 - smoothstep(terminatorStart, terminatorEnd, solarIncidence);
      vec3 surface = texture2D(dayMap, vUv).rgb;
      vec4 cloudSample = texture2D(cloudsMap, vUv);
      float cloudMask = mix(cloudSample.r, cloudSample.a, cloudUsesAlpha);
      float clouds = cloudMask * cloudOpacity;
      vec3 cityLights = texture2D(nightMap, vUv).rgb;
      float specularMask = texture2D(specularMap, vUv).r;
      vec3 viewDirection = normalize(-vWorldPosition);
      vec3 halfwayDirection = normalize(toSun + viewDirection);
      float highlight = pow(max(dot(shadedNormal, halfwayDirection), 0.0), shininess);
      float specular = highlight * specularMask * specularStrength * step(0.0, solarIncidence) * (1.0 - clouds);
      vec3 terrainColor = surface * (nightAmbient + terrainDaylight * dayIntensity);
      vec3 cloudColor = cloudSample.rgb * (nightAmbient + cloudDaylight * dayIntensity);
      vec3 dayColor = mix(terrainColor, cloudColor, clouds);
      vec3 nightColor = cityLights * night * cityIntensity * (1.0 - clouds * 0.9);
      vec3 litSurface = dayColor + vec3(1.0) * specular;
      float surfacePeak = max(litSurface.r, max(litSurface.g, litSurface.b));
      litSurface *= min(1.0, bloomSafeLimit / max(surfacePeak, 0.0001));
      // La surface reste sous le seuil du bloom ; les villes nocturnes restent indépendantes.
      gl_FragColor = vec4(litSurface + nightColor, 1.0);
    }
  `,
  depthTest:true,
  depthWrite:true,
  toneMapped:true,
});

let liveCloudsActive = false;
let liveCloudRequestPending = false;
let liveCloudRefreshTimer = null;

function scheduleLiveCloudRefresh(delay) {
  clearTimeout(liveCloudRefreshTimer);
  liveCloudRefreshTimer = setTimeout(refreshLiveClouds, delay);
}

function refreshLiveClouds() {
  if (!config.earth.liveClouds || liveCloudRequestPending) return;
  liveCloudRequestPending = true;
  const version = Math.floor(Date.now() / (15 * 60 * 1000));
  const candidates = [
    `/api/live-clouds?v=${version}`,
    `${LIVE_CLOUDS_URL}?v=${version}`,
    `${LIVE_CLOUDS_FALLBACK_URL}?v=${version}`,
    `./Assets/Cache/live-clouds.png?v=${BUILD_VERSION}`,
  ];
  const tryCandidate = (index) => {
    textureLoader.load(candidates[index], (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const uniforms = earth.mesh.material.uniforms;
      uniforms.cloudsMap.value?.dispose?.();
      uniforms.cloudsMap.value = texture;
      uniforms.cloudUsesAlpha.value = 1;
      liveCloudsActive = true;
      liveCloudRequestPending = false;
      scheduleLiveCloudRefresh(15 * 60 * 1000);
    }, undefined, (error) => {
      if (index + 1 < candidates.length) {
        tryCandidate(index + 1);
        return;
      }
      liveCloudRequestPending = false;
      scheduleLiveCloudRefresh(60 * 1000);
      console.error("Carte nuageuse temps réel indisponible, nouvel essai dans une minute", error);
    });
  };
  tryCandidate(0);
}

function toSceneVector(vector) {
  return new THREE.Vector3(vector.x, vector.z, -vector.y);
}

function helioPosition(body, date) {
  if (body.id === "sun") return new THREE.Vector3();
  if (astronomy) {
    return toSceneVector(astronomy.HelioVector(body.astronomyBody, date)).multiplyScalar(AU_TO_SCENE);
  }
  const days = date.getTime() / 86_400_000;
  if (body.id === "mercury") {
    const angle = days / 87.969 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0.122, Math.sin(angle)).multiplyScalar(0.387 * AU_TO_SCENE);
  }
  if (body.id === "venus") {
    const angle = days / 224.701 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0.043, Math.sin(angle)).multiplyScalar(0.723 * AU_TO_SCENE);
  }
  if (body.id === "earth") {
    const angle = days / 365.256 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(AU_TO_SCENE);
  }
  if (body.id === "moon") {
    const position = helioPosition(earth, date);
    const angle = days / 27.322 * Math.PI * 2;
    return position.add(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(0.00257 * AU_TO_SCENE));
  }
  if (body.id === "mars") {
    const angle = days / 686.98 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0.032, Math.sin(angle)).multiplyScalar(1.524 * AU_TO_SCENE);
  }
  if (body.id === "jupiter") {
    const angle = days / 4_332.59 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0.023, Math.sin(angle)).multiplyScalar(5.204 * AU_TO_SCENE);
  }
  if (body.id === "saturn") {
    const angle = days / 10_759.22 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0.043, Math.sin(angle)).multiplyScalar(9.583 * AU_TO_SCENE);
  }
  if (body.id === "uranus") {
    const angle = days / 30_688.5 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle), 0.0135, Math.sin(angle)).multiplyScalar(19.191 * AU_TO_SCENE);
  }
  const angle = days / 60_182 * Math.PI * 2;
  return new THREE.Vector3(Math.cos(angle), 0.0309, Math.sin(angle)).multiplyScalar(30.07 * AU_TO_SCENE);
}

// Repère IAU : X = méridien origine, Y = pôle nord, Z = 90° ouest.
function applyAstronomicalOrientation(body, date) {
  if (!astronomy) return;
  const axis = astronomy.RotationAxis(body.astronomyBody, date);
  const north = toSceneVector(axis.north).normalize();
  const rightAscension = THREE.MathUtils.degToRad(axis.ra * 15);
  const primeEqj = new THREE.Vector3(-Math.sin(rightAscension), Math.cos(rightAscension), 0);
  const prime = toSceneVector(primeEqj)
    .normalize()
    .applyAxisAngle(north, THREE.MathUtils.degToRad(axis.spin));
  const west = prime.clone().cross(north).normalize();
  orientationMatrix.makeBasis(prime, north, west);
  body.group.quaternion.setFromRotationMatrix(orientationMatrix);
}

function createOrbit(body, days, segments, opacity, color, relativeTo = null) {
  const points = [];
  const phases = new Float32Array(segments + 1);
  const start = simulationDate.getTime() - days * 86_400_000 / 2;
  for (let index = 0; index <= segments; index += 1) {
    const sampleDate = new Date(start + index / segments * days * 86_400_000);
    const point = helioPosition(body, sampleDate);
    if (relativeTo) point.sub(helioPosition(relativeTo, sampleDate));
    points.push(point);
    phases[index] = index / segments;
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  geometry.setAttribute("orbitPhase", new THREE.BufferAttribute(phases, 1));
  const material = new THREE.ShaderMaterial({
    uniforms:{
      orbitColor:{ value:new THREE.Color(color) },
      currentPhase:{ value:0.5 },
      minimumOpacity:{ value:config.orbits.minimumOpacity },
      maximumOpacity:{ value:opacity },
      fadePower:{ value:config.orbits.fadePower },
    },
    vertexShader:`
      attribute float orbitPhase;
      uniform float currentPhase;
      uniform float minimumOpacity;
      uniform float maximumOpacity;
      uniform float fadePower;
      varying float vOpacity;
      void main() {
        float futureDistance = mod(orbitPhase - currentPhase + 1.0, 1.0);
        float trail = pow(futureDistance, fadePower);
        vOpacity = mix(minimumOpacity, maximumOpacity, trail);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader:`
      uniform vec3 orbitColor;
      varying float vOpacity;
      void main() {
        gl_FragColor = vec4(orbitColor, vOpacity);
      }
    `,
    transparent:true,
    depthWrite:false,
    blending:THREE.NormalBlending,
    toneMapped:false,
  });
  const orbit = new THREE.Line(
    geometry,
    material,
  );
  orbit.userData.epoch = start;
  orbit.userData.periodMs = days * 86_400_000;
  worldRoot.add(orbit);
  return orbit;
}

const mercuryOrbit = createOrbit(mercury, 87.969, 1024, config.orbits.mercuryOpacity, config.orbits.mercuryColor);
const venusOrbit = createOrbit(venus, 224.701, 1024, config.orbits.venusOpacity, config.orbits.venusColor);
const earthOrbit = createOrbit(earth, 365.256, 1024, config.orbits.earthOpacity, config.orbits.earthColor);
const marsOrbit = createOrbit(mars, 686.98, 1024, config.orbits.marsOpacity, config.orbits.marsColor);
const jupiterOrbit = createOrbit(jupiter, 4_332.59, 1024, config.orbits.jupiterOpacity, config.orbits.jupiterColor);
const saturnOrbit = createOrbit(saturn, 10_759.22, 1024, config.orbits.saturnOpacity, config.orbits.saturnColor);
const uranusOrbit = createOrbit(uranus, 30_688.5, 1024, config.orbits.uranusOpacity, config.orbits.uranusColor);
const neptuneOrbit = createOrbit(neptune, 60_182, 1024, config.orbits.neptuneOpacity, config.orbits.neptuneColor);
const moonOrbit = createOrbit(moon, 29.5, 1024, config.orbits.moonOpacity, config.orbits.moonColor, earth);

const selectionRing = new THREE.Mesh(
  new THREE.RingGeometry(1.08, 1.12, 64),
  new THREE.MeshBasicMaterial({ color:0xffffff, transparent:true, opacity:0.5, side:THREE.DoubleSide, depthTest:false }),
);
selectionRing.renderOrder = 3;
worldRoot.add(selectionRing);

const ui = {
  time:document.querySelector("#sim-time"), mode:document.querySelector("#time-mode"),
  modeLabel:document.querySelector(".mode-label"), index:document.querySelector("#target-index"),
  name:document.querySelector("#target-name"), type:document.querySelector("#target-type"),
  distance:document.querySelector("#target-distance"), distanceLabel:document.querySelector("#target-distance-label"),
  radius:document.querySelector("#target-radius"), sizeLabel:document.querySelector("#target-size-label"), labelsLayer:document.querySelector("#labels-layer"),
  engine:document.querySelector("#engine-status"), picker:[...document.querySelectorAll("[data-body]")],
  cityLayer:document.querySelector("#city-markers-layer"),
};
ui.engine.textContent = astronomy ? t("engineRealtime") : t("engineFallback");
ui.engine.style.color = astronomy ? "#6ecb93" : "#f8a73e";

for (const body of bodies) {
  const label = document.createElement("button");
  label.type = "button";
  label.className = "object-label";
  label.innerHTML = `<span aria-hidden="true"></span><b>${bodyName(body)}</b>`;
  label.setAttribute("aria-label", `${t("center")} ${bodyName(body)}`);
  label.addEventListener("click", () => focusBody(body));
  ui.labelsLayer.append(label);
  body.labelElement = label;
}

const cities = [
  { name:"PARIS", latitude:48.8566, longitude:2.3522, timeZone:"Europe/Paris" },
  { name:"NEW YORK", latitude:40.7128, longitude:-74.0060, timeZone:"America/New_York" },
  { name:"TOKYO", latitude:35.6762, longitude:139.6503, timeZone:"Asia/Tokyo" },
  { name:"SYDNEY", latitude:-33.8688, longitude:151.2093, timeZone:"Australia/Sydney" },
  { name:"BRASÍLIA", latitude:-15.7939, longitude:-47.8828, timeZone:"America/Sao_Paulo" },
].map((city) => {
  const latitude = THREE.MathUtils.degToRad(city.latitude);
  const longitude = THREE.MathUtils.degToRad(city.longitude);
  city.surfaceNormal = new THREE.Vector3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    -Math.cos(latitude) * Math.sin(longitude),
  );
  city.formatter = new Intl.DateTimeFormat(locale(), {
    timeZone:city.timeZone, hour:"2-digit", minute:"2-digit", hourCycle:"h23",
  });
  city.secondsFormatter = new Intl.DateTimeFormat(locale(), {
    timeZone:city.timeZone, hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23",
  });
  city.element = document.createElement("div");
  city.element.className = "city-marker";
  city.element.innerHTML = `<div class="city-marker-content"><b>${city.name}</b><time>--:--</time></div>`;
  ui.cityLayer.append(city.element);
  return city;
});

function formatDistance(body) {
  if (body.id === "sun") return "0 km";
  if (body.id === "iss") {
    const centerDistanceKm = body.group.position.distanceTo(earth.group.position) / AU_TO_SCENE * KM_PER_AU;
    return `${new Intl.NumberFormat(locale(), { maximumFractionDigits:1 }).format(centerDistanceKm - 6_371)} km`;
  }
  if (body.id === "moon") {
    const kilometers = body.group.position.distanceTo(earth.group.position) / AU_TO_SCENE * 149_597_870.7;
    return `${new Intl.NumberFormat(locale(), { maximumFractionDigits:0 }).format(kilometers)} km`;
  }
  const au = body.group.position.length() / AU_TO_SCENE;
  return `${new Intl.NumberFormat(locale(), { maximumFractionDigits:4 }).format(au)} ${currentLanguage === "fr" ? "UA" : "AU"}`;
}

function updatePanel(body) {
  ui.index.textContent = body.index;
  ui.name.textContent = bodyName(body);
  ui.type.textContent = bodyType(body);
  ui.radius.textContent = body.id === "iss"
    ? `109 m · ${currentLanguage === "fr" ? "ENVERGURE" : "SPAN"}`
    : body.radius.replace(/(\d) (\d{3})/, `$1${currentLanguage === "fr" ? " " : ","}$2`);
  ui.sizeLabel.textContent = body.id === "iss" ? t("dimensions") : t("actualRadius");
  ui.distanceLabel.textContent = body.id === "iss" ? t("altitude") : body.id === "moon" ? t("earthDistance") : t("sunDistance");
  ui.distance.textContent = formatDistance(body);
  bodies.forEach((item) => item.labelElement.classList.toggle("active", item === body));
  ui.picker.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.body === body.id)));
}

let activeBody = earth;
let lastTrackedPosition = earth.group.position.clone();
let cameraTransition = null;

function focusBody(body, immediate = false) {
  activeBody = body;
  controls.minDistance = (body.selectionRadius ?? body.visualRadius) * 1.15;
  const closeSatelliteView = body.id === "iss";
  camera.near = renderCamera.near = closeSatelliteView ? 1e-9 : 0.00005;
  camera.far = renderCamera.far = closeSatelliteView ? 10 : 7000;
  camera.updateProjectionMatrix();
  renderCamera.updateProjectionMatrix();
  updatePanel(body);
  const target = body.group.position.clone();
  const direction = camera.position.clone().sub(controls.target).normalize();
  if (direction.lengthSq() < 0.5) direction.set(1, 0.5, 1).normalize();
  const destination = target.clone().add(direction.multiplyScalar(body.focusDistance));
  if (immediate) {
    controls.target.copy(target);
    camera.position.copy(destination);
    lastTrackedPosition.copy(target);
    return;
  }
  cameraTransition = {
    startedAt:performance.now(), duration:1100, fromCamera:camera.position.clone(),
    fromTarget:controls.target.clone(), offset:destination.sub(target),
  };
  controls.enabled = false;
}

function animateCamera(now) {
  const bodyPosition = activeBody.group.position;
  if (cameraTransition) {
    const progress = Math.min((now - cameraTransition.startedAt) / cameraTransition.duration, 1);
    const eased = 1 - Math.pow(1 - progress, 4);
    controls.target.lerpVectors(cameraTransition.fromTarget, bodyPosition, eased);
    camera.position.lerpVectors(cameraTransition.fromCamera, bodyPosition.clone().add(cameraTransition.offset), eased);
    if (progress >= 1) {
      cameraTransition = null;
      controls.enabled = true;
      lastTrackedPosition.copy(bodyPosition);
    }
  } else {
    tempVector.copy(bodyPosition).sub(lastTrackedPosition);
    camera.position.add(tempVector);
    controls.target.add(tempVector);
    lastTrackedPosition.copy(bodyPosition);
  }
}

function updateDynamicZoomSpeed() {
  const distance = camera.position.distanceTo(activeBody.group.position);
  const ratio = Math.max(distance / Math.max(activeBody.focusDistance, 0.000001), 1);
  const ramp = Math.min(Math.log10(ratio) / config.navigation.zoomRampDecades, 1);
  controls.zoomSpeed = THREE.MathUtils.lerp(
    config.navigation.zoomSpeedNear,
    config.navigation.zoomSpeedFar,
    ramp,
  );
}

function updateBodies() {
  for (const body of bodies) {
    if (body.id === "iss") continue;
    body.group.position.copy(helioPosition(body, simulationDate));
    applyAstronomicalOrientation(body, simulationDate);
  }
  updateISSPosition(simulationDate);
  moonOrbit.position.copy(earth.group.position);
  for (const orbit of [mercuryOrbit, venusOrbit, earthOrbit, moonOrbit, marsOrbit, jupiterOrbit, saturnOrbit, uranusOrbit, neptuneOrbit]) {
    const elapsed = simulationDate.getTime() - orbit.userData.epoch;
    orbit.material.uniforms.currentPhase.value = ((elapsed / orbit.userData.periodMs) % 1 + 1) % 1;
  }
  selectionRing.position.copy(activeBody.group.position);
  selectionRing.scale.setScalar(activeBody.selectionRadius ?? activeBody.visualRadius * 1.42);
  selectionRing.quaternion.copy(camera.quaternion);
  ui.distance.textContent = formatDistance(activeBody);
}

function updateISSPosition(date) {
  if (!issSatrec) {
    iss.group.visible = false;
    return;
  }
  const state = satellite.propagate(issSatrec, date);
  if (!state?.position) {
    iss.group.visible = false;
    return;
  }
  const earthFixed = satellite.eciToEcf(state.position, satellite.gstime(date));
  issRelativePosition.set(earthFixed.x, earthFixed.z, -earthFixed.y)
    .multiplyScalar(AU_TO_SCENE / KM_PER_AU)
    .applyQuaternion(earth.group.quaternion);
  iss.group.position.copy(earth.group.position).add(issRelativePosition);
  iss.group.visible = true;
  iss.available = true;
}

function syncFloatingOrigin() {
  // La caméra de navigation conserve les coordonnées astronomiques en double précision.
  // Le GPU ne reçoit que des coordonnées relatives à une caméra de rendu placée à l'origine.
  worldRoot.position.copy(camera.position).multiplyScalar(-1);
  renderCamera.quaternion.copy(camera.quaternion);
  renderCamera.updateMatrixWorld(true);
  worldRoot.updateMatrixWorld(true);
  earth.mesh.material.uniforms.sunPosition.value.copy(worldRoot.position);
  atmosphere.material.uniforms.sunPosition.value.copy(worldRoot.position);
  venusAtmosphere.material.uniforms.sunPosition.value.copy(worldRoot.position);
  marsAtmosphere.material.uniforms.sunPosition.value.copy(worldRoot.position);
  saturn.mesh.material.uniforms.sunPosition.value.copy(worldRoot.position);
  saturnSunDirectionLocal.copy(saturn.group.position).multiplyScalar(-1).normalize();
  saturnInverseQuaternion.copy(saturn.group.quaternion).invert();
  saturnSunDirectionLocal.applyQuaternion(saturnInverseQuaternion);
  saturn.mesh.material.uniforms.sunDirectionLocal.value.copy(saturnSunDirectionLocal);
  saturnRing.material.uniforms.sunDirectionLocal.value.copy(saturnSunDirectionLocal);
  haloCameraRight.set(1, 0, 0).applyQuaternion(camera.quaternion);
  haloCameraUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
  haloCameraForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
  for (const glow of [atmosphereOuterGlow, venusOuterGlow, marsOuterGlow]) {
    const body = glow.userData.body;
    // Le disque de halo est derrière la planète : sa surface masque naturellement
    // le centre, sans découpe artificielle susceptible de former une bande.
    glow.position.copy(body.group.position).addScaledVector(haloCameraForward, body.visualRadius * 0.2);
    glow.quaternion.copy(camera.quaternion);
    haloSunDirection.copy(body.group.position).multiplyScalar(-1).normalize();
    const screenX = haloSunDirection.dot(haloCameraRight);
    const screenY = haloSunDirection.dot(haloCameraUp);
    const projection = Math.min(Math.hypot(screenX, screenY), 1);
    glow.material.uniforms.sunDirection.value.set(screenX, screenY).normalize();
    glow.material.uniforms.sunProjection.value = projection;
  }
}

function updateLabel() {
  for (const body of bodies) {
    if (body.id === "iss" && (!body.available || !body.group.visible)) {
      body.labelElement.style.display = "none";
      continue;
    }
    labelPosition.copy(body.group.position).sub(camera.position).project(renderCamera);
    const visible = labelPosition.z > -1 && labelPosition.z < 1
      && Math.abs(labelPosition.x) < 1.08 && Math.abs(labelPosition.y) < 1.08;
    body.labelElement.style.display = visible ? "flex" : "none";
    if (!visible) continue;
    body.labelElement.style.left = `${(labelPosition.x * 0.5 + 0.5) * window.innerWidth}px`;
    body.labelElement.style.top = `${(-labelPosition.y * 0.5 + 0.5) * window.innerHeight}px`;
  }
}

let lastCityClockTick = -1;
function updateCityMarkers() {
  const distanceToEarth = camera.position.distanceTo(earth.group.position);
  const markersEnabled = activeBody === earth
    && distanceToEarth <= earth.visualRadius * config.cities.visibleDistanceRadii;
  const clockTick = Math.floor(simulationDate.getTime() / 1000);
  const updateClocks = clockTick !== lastCityClockTick;
  const markerRadius = kilometersToScene(6_371 + config.cities.markerAltitudeKm);

  for (const city of cities) {
    if (!markersEnabled) {
      city.element.style.display = "none";
      continue;
    }
    cityWorldNormal.copy(city.surfaceNormal).applyQuaternion(earth.group.quaternion).normalize();
    cityWorldPosition.copy(cityWorldNormal).multiplyScalar(markerRadius).add(earth.group.position);
    cityCameraDirection.copy(camera.position).sub(cityWorldPosition).normalize();
    const facingCamera = cityWorldNormal.dot(cityCameraDirection) > 0.015;
    labelPosition.copy(cityWorldPosition).sub(camera.position).project(renderCamera);
    const onScreen = labelPosition.z > -1 && labelPosition.z < 1
      && Math.abs(labelPosition.x) < 1.04 && Math.abs(labelPosition.y) < 1.04;
    const visible = facingCamera && onScreen;
    city.element.style.display = visible ? "flex" : "none";
    if (!visible) continue;
    city.element.style.left = `${(labelPosition.x * 0.5 + 0.5) * window.innerWidth}px`;
    city.element.style.top = `${(-labelPosition.y * 0.5 + 0.5) * window.innerHeight}px`;
    if (updateClocks) {
      const formatter = config.cities.showSeconds ? city.secondsFormatter : city.formatter;
      city.element.querySelector("time").textContent = formatter.format(simulationDate);
    }
  }
  if (markersEnabled && updateClocks) lastCityClockTick = clockTick;
}

function animate(now) {
  requestAnimationFrame(animate);
  const deltaSeconds = Math.min((now - previousFrame) / 1000, 0.1);
  previousFrame = now;
  simulationDate = new Date(simulationDate.getTime() + deltaSeconds * 1000 * timeScale);
  updateBodies();
  animateCamera(now);
  updateDynamicZoomSpeed();
  controls.update(deltaSeconds);
  syncFloatingOrigin();
  updateLabel();
  updateCityMarkers();
  ui.time.dateTime = simulationDate.toISOString();
  ui.time.textContent = simulationDate.toLocaleString(locale(), {
    dateStyle:"medium", timeStyle:"medium", timeZone:"UTC",
  }).toUpperCase() + " UTC";
  composer.render(deltaSeconds);
}

function bodyAtPointer(event) {
  const bounds = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, renderCamera);
  const hit = raycaster.intersectObjects(bodies.flatMap((body) => body.hitMeshes ?? [body.mesh]), false)[0];
  return hit ? bodies.find((body) => body.id === hit.object.userData.bodyId) : null;
}

let pointerStart = null;
canvas.addEventListener("pointerdown", (event) => { pointerStart = { x:event.clientX, y:event.clientY }; });
canvas.addEventListener("pointerup", (event) => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) return;
  const body = bodyAtPointer(event);
  if (body) focusBody(body);
});
canvas.addEventListener("pointermove", (event) => { canvas.style.cursor = bodyAtPointer(event) ? "pointer" : "grab"; });

ui.picker.forEach((button) => button.addEventListener("click", () => {
  focusBody(bodies.find((body) => body.id === button.dataset.body));
}));
document.querySelector(".brand").addEventListener("click", (event) => { event.preventDefault(); focusBody(earth); });
ui.mode.addEventListener("click", () => {
  timeScale = timeScale === REAL_TIME ? DEMO_TIME : REAL_TIME;
  const demo = timeScale === DEMO_TIME;
  ui.mode.setAttribute("aria-pressed", String(demo));
  ui.modeLabel.textContent = demo ? t("demo") : t("realTime");
  ui.engine.textContent = astronomy
    ? t(demo ? "engineAccelerated" : "engineRealtime")
    : t("engineFallback");
});

const adminFields = [
  { group:"POST-PROCESSING", path:"render.exposure", label:"Exposition", min:0.1, max:3, step:0.01 },
  { group:"POST-PROCESSING", path:"render.bloomStrength", label:"Bloom · intensité", min:0, max:4, step:0.01 },
  { group:"POST-PROCESSING", path:"render.bloomRadius", label:"Bloom · rayon", min:0, max:1, step:0.01 },
  { group:"POST-PROCESSING", path:"render.bloomThreshold", label:"Bloom · seuil", min:0, max:2, step:0.01 },
  { group:"LUMIÈRES", path:"lighting.sunIntensity", label:"Soleil · puissance", min:0, max:12, step:0.05 },
  { group:"LUMIÈRES", path:"lighting.sunColor", label:"Soleil · couleur", type:"color" },
  { group:"LUMIÈRES", path:"lighting.ambientIntensity", label:"Ambiante", min:0, max:1, step:0.005 },
  { group:"TERRE", path:"earth.cityIntensity", label:"Villes · intensité", min:0, max:8, step:0.05 },
  { group:"TERRE", path:"earth.dayIntensity", label:"Surface · lumière", min:0, max:3, step:0.01 },
  { group:"TERRE", path:"earth.nightAmbient", label:"Surface · nuit", min:0, max:0.2, step:0.001 },
  { group:"TERRE", path:"earth.normalStrength", label:"Normal map", min:0, max:3, step:0.01 },
  { group:"TERRE", path:"earth.specularStrength", label:"Specular map", min:0, max:4, step:0.01 },
  { group:"TERRE", path:"earth.shininess", label:"Brillance océan", min:2, max:256, step:1 },
  { group:"TERRE", path:"earth.terminatorStart", label:"Terminateur · nuit", min:-0.5, max:0.2, step:0.01 },
  { group:"TERRE", path:"earth.terminatorEnd", label:"Terminateur · jour", min:-0.2, max:0.5, step:0.01 },
  { group:"TERRE", path:"earth.cloudOpacity", label:"Nuages", min:0, max:1, step:0.01 },
  { group:"TERRE", path:"earth.liveClouds", label:"Nuages réels en direct", min:0, max:1, step:1 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.thicknessKm", label:"Altitude (km)", min:0, max:500, step:1 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.opacity", label:"Opacité globale", min:0, max:2, step:0.01 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.innerColor", label:"Inner glow · couleur", type:"color" },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.innerIntensity", label:"Inner glow · intensité", min:0, max:3, step:0.01 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.innerPower", label:"Inner glow · courbe", min:0.1, max:10, step:0.1 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.outerColor", label:"Outer glow · couleur", type:"color" },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.outerIntensity", label:"Outer glow · intensité", min:0, max:4, step:0.01 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.outerPower", label:"Outer glow · courbe", min:0.1, max:16, step:0.1 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.outerExtensionKm", label:"Outer glow · extension km", min:0, max:500, step:1 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.outerFadeRatio", label:"Outer glow · largeur visuelle", min:0, max:0.25, step:0.005 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.sunEdgeStart", label:"Lumière · début", min:-0.5, max:0.2, step:0.01 },
  { group:"ATMOSPHÈRE TERRE", path:"atmosphere.sunEdgeEnd", label:"Lumière · fin", min:-0.2, max:0.5, step:0.01 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.thicknessKm", label:"Altitude (km)", min:0, max:500, step:1 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.opacity", label:"Opacité globale", min:0, max:2, step:0.01 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.innerColor", label:"Inner glow · couleur", type:"color" },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.innerIntensity", label:"Inner glow · intensité", min:0, max:3, step:0.01 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.innerPower", label:"Inner glow · courbe", min:0.1, max:10, step:0.1 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.outerColor", label:"Outer glow · couleur", type:"color" },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.outerIntensity", label:"Outer glow · intensité", min:0, max:4, step:0.01 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.outerPower", label:"Outer glow · courbe", min:0.1, max:16, step:0.1 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.outerExtensionKm", label:"Outer glow · extension km", min:0, max:500, step:1 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.outerFadeRatio", label:"Outer glow · largeur visuelle", min:0, max:0.25, step:0.005 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.sunEdgeStart", label:"Lumière · début", min:-0.5, max:0.2, step:0.01 },
  { group:"ATMOSPHÈRE VÉNUS", path:"venusAtmosphere.sunEdgeEnd", label:"Lumière · fin", min:-0.2, max:0.5, step:0.01 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.thicknessKm", label:"Altitude (km)", min:0, max:500, step:1 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.opacity", label:"Opacité globale", min:0, max:2, step:0.01 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.innerColor", label:"Inner glow · couleur", type:"color" },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.innerIntensity", label:"Inner glow · intensité", min:0, max:3, step:0.01 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.innerPower", label:"Inner glow · courbe", min:0.1, max:10, step:0.1 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.outerColor", label:"Outer glow · couleur", type:"color" },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.outerIntensity", label:"Outer glow · intensité", min:0, max:4, step:0.01 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.outerPower", label:"Outer glow · courbe", min:0.1, max:16, step:0.1 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.outerExtensionKm", label:"Outer glow · extension km", min:0, max:500, step:1 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.outerFadeRatio", label:"Outer glow · largeur visuelle", min:0, max:0.25, step:0.005 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.sunEdgeStart", label:"Lumière · début", min:-0.5, max:0.2, step:0.01 },
  { group:"ATMOSPHÈRE MARS", path:"marsAtmosphere.sunEdgeEnd", label:"Lumière · fin", min:-0.2, max:0.5, step:0.01 },
  { group:"SOLEIL", path:"sun.glowOpacity", label:"Halo · opacité", min:0, max:1, step:0.01 },
  { group:"SOLEIL", path:"sun.glowScale", label:"Halo · taille", min:1, max:15, step:0.1 },
  { group:"MATÉRIAUX", path:"materials.moonRoughness", label:"Lune · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.mercuryRoughness", label:"Mercure · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.mercuryNormalStrength", label:"Mercure · relief", min:0, max:4, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.mercuryNormalY", label:"Mercure · axe normal Y", min:-1, max:1, step:2 },
  { group:"MATÉRIAUX", path:"materials.venusRoughness", label:"Vénus · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.venusCloudOpacity", label:"Vénus · opacité nuages", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.jupiterRoughness", label:"Jupiter · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.saturnRoughness", label:"Saturne · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.saturnRingOpacity", label:"Saturne · opacité anneaux", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.saturnRingAmbient", label:"Saturne · lumière face sombre", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.saturnPlanetShadow", label:"Saturne · ombre sur anneaux", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.saturnRingShadow", label:"Anneaux · ombre sur Saturne", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.uranusRoughness", label:"Uranus · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.neptuneRoughness", label:"Neptune · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.moonNormalStrength", label:"Lune · relief", min:0, max:4, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.moonNormalY", label:"Lune · axe normal Y", min:-1, max:1, step:2 },
  { group:"MATÉRIAUX", path:"materials.marsRoughness", label:"Mars · rugosité", min:0, max:1, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.marsNormalStrength", label:"Mars · relief", min:0, max:4, step:0.01 },
  { group:"MATÉRIAUX", path:"materials.marsNormalY", label:"Mars · axe normal Y", min:-1, max:1, step:2 },
  { group:"ORBITES", path:"orbits.earthOpacity", label:"Orbite Terre", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.mercuryOpacity", label:"Orbite Mercure", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.venusOpacity", label:"Orbite Vénus", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.moonOpacity", label:"Orbite Lune", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.marsOpacity", label:"Orbite Mars", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.jupiterOpacity", label:"Orbite Jupiter", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.saturnOpacity", label:"Orbite Saturne", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.uranusOpacity", label:"Orbite Uranus", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.neptuneOpacity", label:"Orbite Neptune", min:0, max:1, step:0.01 },
  { group:"ORBITES", path:"orbits.minimumOpacity", label:"Opacité devant", min:0, max:0.5, step:0.005 },
  { group:"ORBITES", path:"orbits.fadePower", label:"Courbe directionnelle", min:0.1, max:6, step:0.05 },
  { group:"ORBITES", path:"orbits.earthColor", label:"Couleur Terre", type:"color" },
  { group:"ORBITES", path:"orbits.mercuryColor", label:"Couleur Mercure", type:"color" },
  { group:"ORBITES", path:"orbits.venusColor", label:"Couleur Vénus", type:"color" },
  { group:"ORBITES", path:"orbits.moonColor", label:"Couleur Lune", type:"color" },
  { group:"ORBITES", path:"orbits.marsColor", label:"Couleur Mars", type:"color" },
  { group:"ORBITES", path:"orbits.jupiterColor", label:"Couleur Jupiter", type:"color" },
  { group:"ORBITES", path:"orbits.saturnColor", label:"Couleur Saturne", type:"color" },
  { group:"ORBITES", path:"orbits.uranusColor", label:"Couleur Uranus", type:"color" },
  { group:"ORBITES", path:"orbits.neptuneColor", label:"Couleur Neptune", type:"color" },
  { group:"NAVIGATION", path:"navigation.zoomSpeedNear", label:"Zoom · proche", min:0.1, max:3, step:0.05 },
  { group:"NAVIGATION", path:"navigation.zoomSpeedFar", label:"Zoom · lointain", min:1, max:12, step:0.1 },
  { group:"NAVIGATION", path:"navigation.zoomRampDecades", label:"Zoom · progression", min:0.5, max:6, step:0.1 },
  { group:"HORLOGE MONDIALE", path:"cities.visibleDistanceRadii", label:"Distance d’apparition (rayons)", min:2, max:50, step:0.5 },
  { group:"HORLOGE MONDIALE", path:"cities.markerAltitudeKm", label:"Altitude des marqueurs (km)", min:0, max:500, step:1 },
  { group:"HORLOGE MONDIALE", path:"cities.color", label:"Couleur des marqueurs", type:"color" },
  { group:"HORLOGE MONDIALE", path:"cities.showSeconds", label:"Afficher les secondes", min:0, max:1, step:1 },
  { group:"TEXTURES", path:"textures.earthDay", label:"Terre · jour", type:"text" },
  { group:"TEXTURES", path:"textures.mercury", label:"Mercure", type:"text" },
  { group:"TEXTURES", path:"textures.mercuryNormal", label:"Mercure · normales", type:"text", data:true },
  { group:"TEXTURES", path:"textures.venusSurface", label:"Vénus · surface", type:"text" },
  { group:"TEXTURES", path:"textures.venusAtmosphere", label:"Vénus · nuages", type:"text" },
  { group:"TEXTURES", path:"textures.earthNight", label:"Terre · villes nocturnes", type:"text" },
  { group:"TEXTURES", path:"textures.earthClouds", label:"Terre · nuages", type:"text" },
  { group:"TEXTURES", path:"textures.earthNormal", label:"Terre · normales", type:"text", data:true },
  { group:"TEXTURES", path:"textures.earthSpecular", label:"Terre · spéculaire", type:"text", data:true },
  { group:"TEXTURES", path:"textures.moon", label:"Lune", type:"text" },
  { group:"TEXTURES", path:"textures.moonNormal", label:"Lune · normales", type:"text", data:true },
  { group:"TEXTURES", path:"textures.mars", label:"Mars", type:"text" },
  { group:"TEXTURES", path:"textures.marsNormal", label:"Mars · normales", type:"text", data:true },
  { group:"TEXTURES", path:"textures.jupiter", label:"Jupiter", type:"text" },
  { group:"TEXTURES", path:"textures.saturn", label:"Saturne", type:"text" },
  { group:"TEXTURES", path:"textures.saturnRing", label:"Saturne · anneaux", type:"text" },
  { group:"TEXTURES", path:"textures.uranus", label:"Uranus", type:"text" },
  { group:"TEXTURES", path:"textures.neptune", label:"Neptune", type:"text" },
  { group:"TEXTURES", path:"textures.sky", label:"Voie lactée", type:"text" },
];

const adminGroupEnglish = {
  "POST-PROCESSING":"POST-PROCESSING", "LUMIÈRES":"LIGHTING", "TERRE":"EARTH",
  "ATMOSPHÈRE TERRE":"EARTH ATMOSPHERE", "ATMOSPHÈRE VÉNUS":"VENUS ATMOSPHERE", "ATMOSPHÈRE MARS":"MARS ATMOSPHERE",
  "SOLEIL":"SUN", "MATÉRIAUX":"MATERIALS", "ORBITES":"ORBITS", "NAVIGATION":"NAVIGATION",
  "HORLOGE MONDIALE":"WORLD CLOCK", "TEXTURES":"TEXTURES",
};

const adminExactEnglish = {
  "Exposition":"Exposure", "Ambiante":"Ambient light", "Normal map":"Normal map", "Specular map":"Specular map",
  "Nuages réels en direct":"Live cloud map", "Opacité globale":"Overall opacity", "Brillance océan":"Ocean shininess",
  "Distance d’apparition (rayons)":"Appearance distance (radii)", "Altitude des marqueurs (km)":"Marker altitude (km)",
  "Couleur des marqueurs":"Marker color", "Afficher les secondes":"Show seconds", "Voie lactée":"Milky Way",
  "Opacité devant":"Forward opacity", "Courbe directionnelle":"Directional curve",
};

function adminGroupName(group) {
  return currentLanguage === "fr" ? group : adminGroupEnglish[group] ?? group;
}

function adminFieldName(field) {
  if (currentLanguage === "fr") return field.label;
  if (adminExactEnglish[field.label]) return adminExactEnglish[field.label];
  let label = field.label;
  const replacements = [
    ["Saturne · lumière face sombre", "Saturn · dark-side lighting"], ["Saturne · ombre sur anneaux", "Saturn · shadow on rings"],
    ["Anneaux · ombre sur Saturne", "Rings · shadow on Saturn"], ["Outer glow · largeur visuelle", "Outer glow · visual width"],
    ["Outer glow · extension km", "Outer glow · extension km"], ["Inner glow · couleur", "Inner glow · color"],
    ["Inner glow · intensité", "Inner glow · intensity"], ["Inner glow · courbe", "Inner glow · curve"],
    ["Outer glow · couleur", "Outer glow · color"], ["Outer glow · intensité", "Outer glow · intensity"],
    ["Outer glow · courbe", "Outer glow · curve"], ["Lumière · début", "Light · start"], ["Lumière · fin", "Light · end"],
    ["Surface · lumière", "Surface · lighting"], ["Surface · nuit", "Surface · night"],
    ["Terminateur · nuit", "Terminator · night"], ["Terminateur · jour", "Terminator · day"],
    ["Villes · intensité", "Cities · intensity"], ["Halo · opacité", "Halo · opacity"], ["Halo · taille", "Halo · size"],
    ["Zoom · proche", "Zoom · near"], ["Zoom · lointain", "Zoom · far"], ["Zoom · progression", "Zoom · progression"],
    ["Terre · villes nocturnes", "Earth · city lights"], ["Terre · spéculaire", "Earth · specular"],
    ["Saturne · opacité anneaux", "Saturn · ring opacity"], ["Vénus · opacité nuages", "Venus · cloud opacity"],
    ["axe normal Y", "normal Y axis"], ["rugosité", "roughness"], ["relief", "normal strength"],
    ["puissance", "power"], ["intensité", "intensity"], ["opacité", "opacity"], ["couleur", "color"],
    ["rayon", "radius"], ["seuil", "threshold"], ["taille", "size"], ["jour", "day"], ["nuit", "night"],
    ["nuages", "clouds"], ["normales", "normals"], ["anneaux", "rings"], ["Couleur", "Color"], ["Orbite", "Orbit"],
    ["Soleil", "Sun"], ["Mercure", "Mercury"], ["Vénus", "Venus"], ["Terre", "Earth"], ["Lune", "Moon"], ["Saturne", "Saturn"],
  ];
  for (const [source, translated] of replacements) label = label.replaceAll(source, translated);
  return label;
}

function setLanguage(language, persist = true) {
  currentLanguage = language === "fr" ? "fr" : "en";
  if (persist) localStorage.setItem("astronomy-language", currentLanguage);
  document.documentElement.lang = currentLanguage;
  document.title = t("title");
  document.querySelector('meta[name="description"]').content = t("description");
  document.querySelector("#app").setAttribute("aria-label", t("appAria"));
  canvas.setAttribute("aria-label", t("canvasAria"));
  document.querySelector(".brand").setAttribute("aria-label", t("brandAria"));
  document.querySelector(".clock-label").textContent = t("simulatedTime");
  document.querySelector(".language-switch").setAttribute("aria-label", t("languageAria"));
  document.querySelector(".body-picker").setAttribute("aria-label", t("pickerAria"));
  document.querySelector(".eyebrow").textContent = t("activeTarget");
  document.querySelector(".tracking").lastChild.nodeValue = t("tracking");
  document.querySelector(".scale-note").textContent = t("scaleNote");
  ui.labelsLayer.setAttribute("aria-label", t("labelsAria"));
  ui.cityLayer.setAttribute("aria-label", t("citiesAria"));
  document.querySelector("#admin-open").setAttribute("aria-label", t("adminOpen"));
  document.querySelector(".admin-titlebar strong").textContent = t("renderControls");
  document.querySelector("#admin-close").setAttribute("aria-label", t("close"));
  document.querySelector('label[for="admin-password"]').textContent = t("password");
  document.querySelector('#admin-login button[type="submit"]').textContent = t("unlock");
  document.querySelector("#save-status").textContent = t("configLoaded");
  document.querySelector("#admin-logout").textContent = t("logout");
  document.querySelector(".admin-path span").textContent = t("autoSave");
  document.querySelector(".coordinates > span:first-child").textContent = t("reference");
  document.querySelector(".cloud-credit").textContent = t("clouds");
  const controlsHelp = document.querySelector(".controls-help");
  controlsHelp.setAttribute("aria-label", t("controlsAria"));
  ["orbit", "zoom", "pan", "follow"].forEach((key, index) => { controlsHelp.children[index].lastChild.nodeValue = t(key); });
  document.querySelector("noscript").textContent = currentLanguage === "fr" ? "Cette expérience nécessite JavaScript." : "This experience requires JavaScript.";

  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
  });
  ui.picker.forEach((button) => {
    const body = bodies.find((item) => item.id === button.dataset.body);
    if (body) button.lastChild.nodeValue = ` ${bodyName(body)}`;
  });
  for (const body of bodies) {
    body.labelElement.querySelector("b").textContent = bodyName(body);
    body.labelElement.setAttribute("aria-label", `${t("center")} ${bodyName(body)}`);
  }
  for (const city of cities) {
    city.formatter = new Intl.DateTimeFormat(locale(), { timeZone:city.timeZone, hour:"2-digit", minute:"2-digit", hourCycle:"h23" });
    city.secondsFormatter = new Intl.DateTimeFormat(locale(), { timeZone:city.timeZone, hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23" });
  }
  document.querySelectorAll(".admin-group").forEach((group) => {
    group.querySelector("h3").textContent = adminGroupName(group.dataset.group);
  });
  document.querySelectorAll(".admin-field").forEach((wrapper) => {
    const field = adminFields.find((item) => item.path === wrapper.dataset.path);
    if (field) wrapper.querySelector("label").textContent = adminFieldName(field);
  });
  const demo = timeScale === DEMO_TIME;
  ui.modeLabel.textContent = demo ? t("demo") : t("realTime");
  ui.engine.textContent = astronomy ? t(demo ? "engineAccelerated" : "engineRealtime") : t("engineFallback");
  updatePanel(activeBody);
}

function valueAtPath(path) {
  return path.split(".").reduce((value, key) => value[key], config);
}

function setValueAtPath(path, value) {
  const keys = path.split(".");
  const finalKey = keys.pop();
  const parent = keys.reduce((object, key) => object[key], config);
  parent[finalKey] = value;
}

function replaceTexture(target, key, path, isData = false) {
  const previous = target[key];
  target[key] = isData ? loadDataTexture(path) : loadColorTexture(path);
  previous?.dispose?.();
}

function applyTextureConfig(path) {
  const texturePath = valueAtPath(path);
  const uniforms = earth.mesh.material.uniforms;
  if (path === "textures.earthDay") replaceTexture(uniforms.dayMap, "value", texturePath);
  if (path === "textures.mercury") replaceTexture(mercury.mesh.material, "map", texturePath);
  if (path === "textures.mercuryNormal") replaceTexture(mercury.mesh.material, "normalMap", texturePath, true);
  if (path === "textures.venusSurface") replaceTexture(venus.mesh.material, "map", texturePath);
  if (path === "textures.venusAtmosphere") replaceTexture(venusClouds.material, "map", texturePath);
  if (path === "textures.earthNight") replaceTexture(uniforms.nightMap, "value", texturePath);
  if (path === "textures.earthClouds") {
    config.earth.liveClouds = 0;
    liveCloudsActive = false;
    uniforms.cloudUsesAlpha.value = 0;
    replaceTexture(uniforms.cloudsMap, "value", texturePath);
  }
  if (path === "textures.earthNormal") replaceTexture(uniforms.normalMap, "value", texturePath, true);
  if (path === "textures.earthSpecular") replaceTexture(uniforms.specularMap, "value", texturePath, true);
  if (path === "textures.moon") replaceTexture(moon.mesh.material, "map", texturePath);
  if (path === "textures.moonNormal") replaceTexture(moon.mesh.material, "normalMap", texturePath, true);
  if (path === "textures.mars") replaceTexture(mars.mesh.material, "map", texturePath);
  if (path === "textures.marsNormal") replaceTexture(mars.mesh.material, "normalMap", texturePath, true);
  if (path === "textures.jupiter") replaceTexture(jupiter.mesh.material, "map", texturePath);
  if (path === "textures.saturn") replaceTexture(saturn.mesh.material.uniforms.surfaceMap, "value", texturePath);
  if (path === "textures.saturnRing") {
    const previous = saturnRing.material.uniforms.ringMap.value;
    const next = loadColorTexture(texturePath);
    saturnRing.material.uniforms.ringMap.value = next;
    saturn.mesh.material.uniforms.ringMap.value = next;
    previous?.dispose?.();
  }
  if (path === "textures.uranus") replaceTexture(uranus.mesh.material, "map", texturePath);
  if (path === "textures.neptune") replaceTexture(neptune.mesh.material, "map", texturePath);
  if (path === "textures.sky") {
    const nextSky = loadColorTexture(texturePath);
    nextSky.mapping = THREE.EquirectangularReflectionMapping;
    scene.background?.dispose?.();
    scene.background = nextSky;
  }
}

function applyVisualConfig() {
  renderer.toneMappingExposure = config.render.exposure;
  ui.cityLayer.style.setProperty("--city-color", config.cities.color);
  bloomPass.strength = config.render.bloomStrength;
  bloomPass.radius = config.render.bloomRadius;
  bloomPass.threshold = config.render.bloomThreshold;
  sunlight.intensity = config.lighting.sunIntensity;
  sunlight.color.set(config.lighting.sunColor);
  ambientLight.intensity = config.lighting.ambientIntensity;
  const uniforms = earth.mesh.material.uniforms;
  uniforms.bloomSafeLimit.value = Math.max(config.render.bloomThreshold * 0.9, 0.05);
  if (config.earth.liveClouds && !liveCloudsActive) refreshLiveClouds();
  if (!config.earth.liveClouds && liveCloudsActive) {
    replaceTexture(uniforms.cloudsMap, "value", config.textures.earthClouds);
    uniforms.cloudUsesAlpha.value = 0;
    liveCloudsActive = false;
  }
  for (const name of ["cityIntensity", "cloudOpacity", "dayIntensity", "nightAmbient", "normalStrength", "specularStrength", "shininess", "terminatorStart", "terminatorEnd"]) {
    uniforms[name].value = config.earth[name];
  }
  const applyAtmosphereConfig = (mesh, settings) => {
    const uniforms = mesh.material.uniforms;
    for (const name of ["opacity", "innerIntensity", "outerIntensity", "innerPower", "outerPower", "sunEdgeStart", "sunEdgeEnd"]) {
      uniforms[name].value = settings[name];
    }
    uniforms.innerColor.value.set(settings.innerColor);
    uniforms.outerColor.value.set(settings.outerColor);
    mesh.scale.setScalar((mesh.userData.planetRadiusKm + settings.thicknessKm) / mesh.userData.planetRadiusKm);
  };
  const applyOuterGlowConfig = (mesh, settings) => {
    const uniforms = mesh.material.uniforms;
    uniforms.glowColor.value.set(settings.outerColor);
    uniforms.opacity.value = settings.opacity;
    uniforms.intensity.value = settings.outerIntensity;
    uniforms.power.value = settings.outerPower;
    uniforms.sunEdgeStart.value = settings.sunEdgeStart;
    uniforms.sunEdgeEnd.value = settings.sunEdgeEnd;
    const radius = mesh.userData.planetRadiusKm;
    // L'extension physique et la largeur artistique du fade restent indépendantes.
    const outerRadius = radius + settings.thicknessKm + settings.outerExtensionKm
      + radius * settings.outerFadeRatio;
    uniforms.innerRadius.value = radius / outerRadius;
    mesh.scale.setScalar(outerRadius / radius);
  };
  applyAtmosphereConfig(atmosphere, config.atmosphere);
  applyAtmosphereConfig(venusAtmosphere, config.venusAtmosphere);
  applyAtmosphereConfig(marsAtmosphere, config.marsAtmosphere);
  applyOuterGlowConfig(atmosphereOuterGlow, config.atmosphere);
  applyOuterGlowConfig(venusOuterGlow, config.venusAtmosphere);
  applyOuterGlowConfig(marsOuterGlow, config.marsAtmosphere);
  sunGlow.material.opacity = config.sun.glowOpacity;
  sunGlow.scale.setScalar(sun.visualRadius * config.sun.glowScale);
  moon.mesh.material.roughness = config.materials.moonRoughness;
  mercury.mesh.material.roughness = config.materials.mercuryRoughness;
  venus.mesh.material.roughness = config.materials.venusRoughness;
  venus.mesh.material.color.setScalar(0.62);
  venusClouds.material.opacity = config.materials.venusCloudOpacity;
  jupiter.mesh.material.roughness = config.materials.jupiterRoughness;
  jupiter.mesh.material.color.setScalar(0.62);
  saturnRing.material.uniforms.opacity.value = config.materials.saturnRingOpacity;
  saturnRing.material.uniforms.ambient.value = config.materials.saturnRingAmbient;
  saturnRing.material.uniforms.shadowStrength.value = config.materials.saturnPlanetShadow;
  saturn.mesh.material.uniforms.shadowStrength.value = config.materials.saturnRingShadow;
  saturn.mesh.material.uniforms.bloomSafeLimit.value = Math.max(config.render.bloomThreshold * 0.9, 0.05);
  uranus.mesh.material.roughness = config.materials.uranusRoughness;
  uranus.mesh.material.color.setScalar(0.62);
  neptune.mesh.material.roughness = config.materials.neptuneRoughness;
  neptune.mesh.material.color.setScalar(0.62);
  mercury.mesh.material.normalScale.set(
    config.materials.mercuryNormalStrength,
    config.materials.mercuryNormalStrength * config.materials.mercuryNormalY,
  );
  moon.mesh.material.normalScale.set(
    config.materials.moonNormalStrength,
    config.materials.moonNormalStrength * config.materials.moonNormalY,
  );
  mars.mesh.material.roughness = config.materials.marsRoughness;
  mars.mesh.material.normalScale.set(
    config.materials.marsNormalStrength,
    config.materials.marsNormalStrength * config.materials.marsNormalY,
  );
  const orbitSettings = [
    [mercuryOrbit, config.orbits.mercuryOpacity, config.orbits.mercuryColor],
    [venusOrbit, config.orbits.venusOpacity, config.orbits.venusColor],
    [earthOrbit, config.orbits.earthOpacity, config.orbits.earthColor],
    [moonOrbit, config.orbits.moonOpacity, config.orbits.moonColor],
    [marsOrbit, config.orbits.marsOpacity, config.orbits.marsColor],
    [jupiterOrbit, config.orbits.jupiterOpacity, config.orbits.jupiterColor],
    [saturnOrbit, config.orbits.saturnOpacity, config.orbits.saturnColor],
    [uranusOrbit, config.orbits.uranusOpacity, config.orbits.uranusColor],
    [neptuneOrbit, config.orbits.neptuneOpacity, config.orbits.neptuneColor],
  ];
  for (const [orbit, maximumOpacity, color] of orbitSettings) {
    orbit.material.uniforms.maximumOpacity.value = maximumOpacity;
    orbit.material.uniforms.minimumOpacity.value = config.orbits.minimumOpacity;
    orbit.material.uniforms.fadePower.value = config.orbits.fadePower;
    orbit.material.uniforms.orbitColor.value.set(color);
  }
}

let saveTimer;
function scheduleConfigSave() {
  localStorage.setItem("astronomy-config", JSON.stringify(config));
  const status = document.querySelector("#save-status");
  status.textContent = t("pending");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      const response = await fetch("/api/config", {
        method:"POST",
        headers:{ "Content-Type":"application/json", "X-Astronomy-Admin":"1" },
        body:JSON.stringify(config),
      });
      if (response.status === 401) {
        status.textContent = t("sessionExpired");
        document.querySelector("#admin-panel").hidden = true;
        document.querySelector("#admin-login").hidden = false;
        return;
      }
      if (!response.ok) throw new Error(String(response.status));
      status.textContent = t("savedFile");
    } catch {
      status.textContent = t("savedBrowser");
    }
  }, 450);
}

function initializeAdmin() {
  const dialog = document.querySelector("#admin-dialog");
  const login = document.querySelector("#admin-login");
  const panel = document.querySelector("#admin-panel");
  const fieldsRoot = document.querySelector("#admin-fields");
  let currentGroup;
  let groupElement;

  for (const field of adminFields) {
    if (field.group !== currentGroup) {
      currentGroup = field.group;
      groupElement = document.createElement("section");
      groupElement.className = "admin-group";
      groupElement.dataset.group = currentGroup;
      groupElement.innerHTML = `<h3>${adminGroupName(currentGroup)}</h3>`;
      fieldsRoot.append(groupElement);
    }
    const wrapper = document.createElement("div");
    wrapper.className = `admin-field${field.type === "text" ? " texture" : ""}${field.type === "color" ? " color" : ""}`;
    wrapper.dataset.path = field.path;
    const label = document.createElement("label");
    label.textContent = adminFieldName(field);
    const input = document.createElement("input");
    input.dataset.path = field.path;
    if (field.type === "text") {
      input.type = "text";
      input.value = valueAtPath(field.path);
      input.addEventListener("change", () => {
        setValueAtPath(field.path, input.value.trim());
        applyTextureConfig(field.path);
        scheduleConfigSave();
      });
      wrapper.append(label, input);
    } else if (field.type === "color") {
      input.type = "color";
      input.value = valueAtPath(field.path);
      const output = document.createElement("output");
      output.textContent = input.value.toUpperCase();
      input.addEventListener("input", () => {
        setValueAtPath(field.path, input.value);
        output.textContent = input.value.toUpperCase();
        applyVisualConfig();
        scheduleConfigSave();
      });
      wrapper.append(label, output, input);
    } else {
      input.type = "range";
      input.min = field.min;
      input.max = field.max;
      input.step = field.step;
      input.value = valueAtPath(field.path);
      const output = document.createElement("output");
      output.textContent = input.value;
      input.addEventListener("input", () => {
        const value = Number(input.value);
        setValueAtPath(field.path, value);
        output.textContent = String(value);
        applyVisualConfig();
        scheduleConfigSave();
      });
      wrapper.append(label, output, input);
    }
    groupElement.append(wrapper);
  }

  const passwordInput = document.querySelector("#admin-password");
  const error = document.querySelector("#admin-error");

  function showAdminPanel(authenticated) {
    login.hidden = authenticated;
    panel.hidden = !authenticated;
    if (!authenticated) passwordInput.focus();
  }

  document.querySelector("#admin-open").addEventListener("click", async () => {
    dialog.showModal();
    try {
      const response = await fetch("/api/admin/session", { cache:"no-store" });
      const state = response.ok ? await response.json() : { authenticated:false };
      showAdminPanel(state.authenticated === true);
    } catch {
      showAdminPanel(false);
    }
  });
  document.querySelector("#admin-close").addEventListener("click", () => dialog.close());
  document.querySelector("#admin-logout").addEventListener("click", async () => {
    await fetch("/api/admin/logout", { method:"POST" }).catch(() => {});
    showAdminPanel(false);
    passwordInput.value = "";
    error.textContent = "";
  });
  login.addEventListener("submit", async (event) => {
    event.preventDefault();
    error.textContent = t("verifying");
    try {
      const response = await fetch("/api/admin/login", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ password:passwordInput.value }),
      });
      if (response.status === 429) {
        error.textContent = t("tooMany");
        return;
      }
      if (!response.ok) {
        error.textContent = t("wrongPassword");
        passwordInput.select();
        return;
      }
      passwordInput.value = "";
      error.textContent = "";
      showAdminPanel(true);
    } catch {
      error.textContent = t("serverUnavailable");
    }
  });
}

applyVisualConfig();
initializeAdmin();
document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});
setLanguage(currentLanguage, false);

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderCamera.aspect = camera.aspect;
  renderCamera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  composer.setSize(window.innerWidth, window.innerHeight);
});

updateBodies();
focusBody(earth, true);
requestAnimationFrame(animate);
