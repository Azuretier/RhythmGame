import * as THREE from 'three';
import { db } from '@/lib/MNSW/firebase';
import { doc, setDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { createTextureAtlas, BLOCK_FACE_TEXTURES, TOTAL_TEXTURES } from './TextureUtils';

// Post Processing
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type BlockType = 'grass' | 'dirt' | 'stone' | 'wood' | 'brick' | 'leaves' | 'water' | 'obsidian' | 'sand' | 'air';

const BLOCK_SIZE = 10;
const HALF_BLOCK = BLOCK_SIZE / 2;
const CHUNK_SIZE = 16;
const RENDER_DISTANCE = 4;

const PLAYER_WIDTH = 0.6 * BLOCK_SIZE;
const PLAYER_HEIGHT = 1.8 * BLOCK_SIZE;
const PLAYER_HALF_W = PLAYER_WIDTH / 2;
const EYE_HEIGHT = 1.6 * BLOCK_SIZE;

class Perlin {
    private p: number[] = [];
    constructor(seed: number) {
        this.p = new Array(512);
        const p = new Array(256).fill(0).map((_, i) => i);
        let currentSeed = seed;
        const random = () => {
            const x = Math.sin(currentSeed++) * 10000;
            return x - Math.floor(x);
        };
        for (let i = 255; i > 0; i--) {
            const r = Math.floor(random() * (i + 1));
            [p[i], p[r]] = [p[r], p[i]];
        }
        for (let i = 0; i < 512; i++) this.p[i] = p[i & 255];
    }
    fade(t: number) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t: number, a: number, b: number) { return a + t * (b - a); }
    grad(hash: number, x: number, y: number, z: number) {
        const h = hash & 15;
        const u = h < 8 ? x : y, v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    noise(x: number, y: number, z: number) {
        const X = Math.floor(x) & 255, Y = Math.floor(y) & 255, Z = Math.floor(z) & 255;
        x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
        const u = this.fade(x), v = this.fade(y), w = this.fade(z);
        const p = this.p;
        const A = p[X] + Y, AA = p[A] + Z, AB = p[A + 1] + Z, B = p[X + 1] + Y, BA = p[B] + Z, BB = p[B + 1] + Z;
        return this.lerp(w, this.lerp(v, this.lerp(u, this.grad(p[AA], x, y, z), this.grad(p[BA], x - 1, y, z)),
            this.lerp(u, this.grad(p[AB], x, y - 1, z), this.grad(p[BB], x - 1, y - 1, z))),
            this.lerp(v, this.lerp(u, this.grad(p[AA + 1], x, y, z - 1), this.grad(p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(p[AB + 1], x, y - 1, z - 1), this.grad(p[BB + 1], x - 1, y - 1, z - 1))));
    }
}

class Chunk {
    public mesh: THREE.Mesh | null = null;
    public data: Map<string, string> = new Map();
    public isDirty = true;
    public cx: number;
    public cz: number;
    constructor(cx: number, cz: number) { this.cx = cx; this.cz = cz; }
    setBlock(x: number, y: number, z: number, type: string) {
        const key = `${x},${y},${z}`;
        if (type === 'air') this.data.delete(key); else this.data.set(key, type);
        this.isDirty = true;
    }
    getBlock(x: number, y: number, z: number): string | undefined { return this.data.get(`${x},${y},${z}`); }
}

export class VoxelEngine {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private composer: EffectComposer;
    private raycaster: THREE.Raycaster;
    private chunks: Map<string, Chunk> = new Map();

    private velocity = new THREE.Vector3();
    private moveState = { fwd: false, bwd: false, left: false, right: false };
    private canJump = false;
    private onGround = false;
    private prevTime = performance.now();
    private frameCount = 0;

    public isRunning = false;
    public isPaused = false;
    public isInventoryOpen = false;
    public sensitivity = 0.002;

    private inventory: BlockType[] = [];

    private container: HTMLElement;
    private worldPath: string;
    private updateHUD: (x: number, y: number, z: number) => void;
    private perlin: Perlin;
    private worldType: 'default' | 'superflat';
    private matAtlas: THREE.MeshStandardMaterial;
    private texturesReady = false;

    constructor(
        container: HTMLElement,
        worldPath: string,
        updateHUD: (x: number, y: number, z: number) => void,
        settings: { seed: number, type: 'default' | 'superflat' } = { seed: 12345, type: 'default' }
    ) {
        this.container = container;
        this.worldPath = worldPath;
        this.updateHUD = updateHUD;
        this.worldType = settings.type;
        this.perlin = new Perlin(settings.seed);

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 400);

        this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 100, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.appendChild(this.renderer.domElement);

        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.85);
        this.composer.addPass(bloomPass);

        const outputPass = new OutputPass();
        this.composer.addPass(outputPass);

        // Placeholder material until textures load
        this.matAtlas = new THREE.MeshStandardMaterial({
            color: 0x888888,
            roughness: 0.9,
            metalness: 0.1,
            vertexColors: false
        });

        // Load texture atlas from image files asynchronously
        createTextureAtlas().then((texture) => {
            this.matAtlas.map = texture;
            this.matAtlas.color.set(0xffffff);
            this.matAtlas.needsUpdate = true;
            this.texturesReady = true;
            // Rebuild all chunks with the loaded textures
            for (const chunk of this.chunks.values()) {
                chunk.isDirty = true;
            }
            this.updateChunks(true);
        });

        this.setupLights();
        this.setupReferenceObject();
        this.raycaster = new THREE.Raycaster();

        this.updateChunks(true);

        window.addEventListener('resize', this.onResize);
        document.addEventListener('keydown', this.onKeyDown);
        document.addEventListener('keyup', this.onKeyUp);
        document.body.addEventListener('mousemove', this.onMouseMove);
        document.addEventListener('mousedown', this.onMouseDown);

        this.connectToFirebase();
        this.animate();
    }

    public setInventory(newInventory: BlockType[]) {
        this.inventory = newInventory;
    }

    public setSensitivity(val: number) {
        this.sensitivity = val;
    }

    private setupReferenceObject() {
        // Bedrock block
        const geo = new THREE.BoxGeometry(BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
        const mat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, -BLOCK_SIZE, 0);
        this.scene.add(mesh);
    }

    private setupLights() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambient);
        const sun = new THREE.DirectionalLight(0xffffee, 1.2);
        sun.position.set(50, 200, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        const d = 200;
        sun.shadow.camera.left = -d;
        sun.shadow.camera.right = d;
        sun.shadow.camera.top = d;
        sun.shadow.camera.bottom = -d;
        this.scene.add(sun);
    }

    private getChunkKey(cx: number, cz: number) { return `${cx},${cz}`; }

    private updateChunks(forceImmediate = false) {
        const playerCX = Math.floor(this.camera.position.x / (CHUNK_SIZE * BLOCK_SIZE));
        const playerCZ = Math.floor(this.camera.position.z / (CHUNK_SIZE * BLOCK_SIZE));
        const neededChunks = new Set<string>();

        for (let x = -RENDER_DISTANCE; x <= RENDER_DISTANCE; x++) {
            for (let z = -RENDER_DISTANCE; z <= RENDER_DISTANCE; z++) {
                neededChunks.add(this.getChunkKey(playerCX + x, playerCZ + z));
            }
        }
        for (const [key, chunk] of this.chunks) {
            if (!neededChunks.has(key)) {
                if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); }
                this.chunks.delete(key);
            }
        }
        neededChunks.forEach(key => {
            if (!this.chunks.has(key)) {
                const [cx, cz] = key.split(',').map(Number);
                const chunk = new Chunk(cx, cz);
                this.generateChunkData(chunk);
                this.chunks.set(key, chunk);
            }
        });

        let updates = 0;
        const maxUpdates = forceImmediate ? 100 : 8;
        for (const chunk of this.chunks.values()) {
            if (chunk.isDirty && updates < maxUpdates) {
                this.buildChunkMesh(chunk);
                updates++;
            }
        }
    }

    private generateChunkData(chunk: Chunk) {
        const startX = chunk.cx * CHUNK_SIZE;
        const startZ = chunk.cz * CHUNK_SIZE;
        for (let x = 0; x < CHUNK_SIZE; x++) {
            for (let z = 0; z < CHUNK_SIZE; z++) {
                const wx = startX + x;
                const wz = startZ + z;
                let h = 0;
                if (this.worldType === 'superflat') {
                    chunk.setBlock(x, 0, z, 'grass');
                    chunk.setBlock(x, -1, z, 'dirt');
                    chunk.setBlock(x, -2, z, 'obsidian');
                } else {
                    const n = this.perlin.noise(wx * 0.01, 0, wz * 0.01);
                    h = Math.floor(n * 20);
                    chunk.setBlock(x, h, z, 'grass');
                    for (let d = 1; d <= 3; d++) chunk.setBlock(x, h - d, z, 'dirt');
                    chunk.setBlock(x, h - 4, z, 'stone');
                }
            }
        }
    }

    private buildChunkMesh(chunk: Chunk) {
        if (chunk.mesh) { this.scene.remove(chunk.mesh); chunk.mesh.geometry.dispose(); chunk.mesh = null; }
        const vertices: number[] = [];
        const uvs: number[] = [];
        const normals: number[] = [];
        const indices: number[] = [];
        let vertCount = 0;

        const isSolid = (x: number, y: number, z: number) => {
            const b = chunk.getBlock(x, y, z);
            return b !== undefined && b !== 'water' && b !== 'leaves';
        };

        const defaultFace = { top: 2, bottom: 2, side: 2 }; // fallback to dirt

        chunk.data.forEach((type, key) => {
            const [x, y, z] = key.split(',').map(Number);
            const wx = x * BLOCK_SIZE + chunk.cx * CHUNK_SIZE * BLOCK_SIZE;
            const wy = y * BLOCK_SIZE;
            const wz = z * BLOCK_SIZE + chunk.cz * CHUNK_SIZE * BLOCK_SIZE;

            const faceTextures = BLOCK_FACE_TEXTURES[type] || defaultFace;

            const s = HALF_BLOCK;
            // Each face tagged with which texture slot to use: 'top', 'bottom', or 'side'
            const faces: { dir: number[]; pos: number[][]; check: number[]; face: 'top' | 'bottom' | 'side' }[] = [
                { dir: [1, 0, 0], pos: [[s, -s, s], [s, -s, -s], [s, s, -s], [s, s, s]], check: [x + 1, y, z], face: 'side' },
                { dir: [-1, 0, 0], pos: [[-s, -s, -s], [-s, -s, s], [-s, s, s], [-s, s, -s]], check: [x - 1, y, z], face: 'side' },
                { dir: [0, 1, 0], pos: [[-s, s, s], [s, s, s], [s, s, -s], [-s, s, -s]], check: [x, y + 1, z], face: 'top' },
                { dir: [0, -1, 0], pos: [[-s, -s, -s], [s, -s, -s], [s, -s, s], [-s, -s, s]], check: [x, y - 1, z], face: 'bottom' },
                { dir: [0, 0, 1], pos: [[-s, -s, s], [s, -s, s], [s, s, s], [-s, s, s]], check: [x, y, z + 1], face: 'side' },
                { dir: [0, 0, -1], pos: [[s, -s, -s], [-s, -s, -s], [-s, s, -s], [s, s, -s]], check: [x, y, z - 1], face: 'side' }
            ];

            for (const face of faces) {
                if (isSolid(face.check[0], face.check[1], face.check[2])) continue;

                // Pick the correct texture atlas index for this face direction
                const texIdx = faceTextures[face.face];
                const uStart = texIdx / TOTAL_TEXTURES;
                const uEnd = (texIdx + 1) / TOTAL_TEXTURES;

                for (const v of face.pos) {
                    vertices.push(wx + v[0] + HALF_BLOCK, wy + v[1] + HALF_BLOCK, wz + v[2] + HALF_BLOCK);
                    normals.push(face.dir[0], face.dir[1], face.dir[2]);
                }

                // UVs mapped to the correct atlas slice
                uvs.push(uStart, 0);
                uvs.push(uEnd, 0);
                uvs.push(uEnd, 1);
                uvs.push(uStart, 1);

                const a = vertCount, b = vertCount + 1, c = vertCount + 2, d = vertCount + 3;
                indices.push(a, b, c, a, c, d);
                vertCount += 4;
            }
        });

        if (vertices.length === 0) return;

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setIndex(indices);

        chunk.mesh = new THREE.Mesh(geometry, this.matAtlas);
        chunk.mesh.castShadow = true;
        chunk.mesh.receiveShadow = true;

        this.scene.add(chunk.mesh);
        chunk.isDirty = false;
    }

    private connectToFirebase() {
        if (!db) return;
        const q = collection(db, `${this.worldPath}/blocks`);
        onSnapshot(q, (snap) => {
            snap.docChanges().forEach(change => {
                const d = change.doc.data();
                const x = d.x / BLOCK_SIZE;
                const y = d.y / BLOCK_SIZE;
                const z = d.z / BLOCK_SIZE;

                const cx = Math.floor(x / CHUNK_SIZE);
                const cz = Math.floor(z / CHUNK_SIZE);
                const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
                const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
                const key = this.getChunkKey(cx, cz);
                let chunk = this.chunks.get(key);

                if (chunk) {
                    if (change.type === 'removed') {
                        chunk.setBlock(lx, y, lz, 'air');
                    }
                    else { chunk.setBlock(lx, y, lz, d.type); }
                }
            });
        });
    }

    private animate = () => {
        if (!this.renderer) return;
        requestAnimationFrame(this.animate);
        if (this.isRunning && !this.isPaused) {
            const time = performance.now();
            const delta = Math.min((time - this.prevTime) / 1000, 0.1);
            this.physics(delta);
            this.updateChunks();
            this.frameCount++;
            if (this.frameCount % 15 === 0) {
                this.updateHUD(Math.round(this.camera.position.x / BLOCK_SIZE), Math.round(this.camera.position.y / BLOCK_SIZE), Math.round(this.camera.position.z / BLOCK_SIZE));
            }
            this.prevTime = time;
        } else {
            this.prevTime = performance.now();
        }

        this.composer.render();
    };

    private physics(delta: number) {
        this.velocity.x *= 0.9;
        this.velocity.z *= 0.9;
        this.velocity.y -= 400 * delta;

        const direction = new THREE.Vector3();
        direction.set(Number(this.moveState.right) - Number(this.moveState.left), 0, Number(this.moveState.bwd) - Number(this.moveState.fwd));
        direction.normalize();

        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir); camDir.y = 0; camDir.normalize();
        const camRight = new THREE.Vector3();
        camRight.crossVectors(camDir, this.camera.up).normalize();

        if (direction.length() > 0) {
            const moveVec = new THREE.Vector3().addScaledVector(camDir, -direction.z).addScaledVector(camRight, direction.x);
            const speed = this.onGround ? 1500 : 500;
            this.velocity.addScaledVector(moveVec, speed * delta);
        }

        this.camera.position.x += this.velocity.x * delta;
        this.checkCol('x');

        this.camera.position.z += this.velocity.z * delta;
        this.checkCol('z');

        this.onGround = false;
        this.camera.position.y += this.velocity.y * delta;
        this.checkCol('y');

        if (this.camera.position.y < -200) {
            this.camera.position.set(0, 150, 0);
            this.velocity.set(0, 0, 0);
        }
    }

    private checkCol(axis: 'x' | 'y' | 'z') {
        const pos = this.camera.position;
        const pMinX = pos.x - PLAYER_HALF_W;
        const pMaxX = pos.x + PLAYER_HALF_W;
        const pMinZ = pos.z - PLAYER_HALF_W;
        const pMaxZ = pos.z + PLAYER_HALF_W;
        const pMinY = pos.y - EYE_HEIGHT;
        const pMaxY = pos.y + (PLAYER_HEIGHT - EYE_HEIGHT);

        const startX = Math.floor(pMinX / BLOCK_SIZE);
        const endX = Math.floor(pMaxX / BLOCK_SIZE);
        const startY = Math.floor(pMinY / BLOCK_SIZE);
        const endY = Math.floor(pMaxY / BLOCK_SIZE);
        const startZ = Math.floor(pMinZ / BLOCK_SIZE);
        const endZ = Math.floor(pMaxZ / BLOCK_SIZE);

        for (let x = startX; x <= endX; x++) {
            for (let y = startY; y <= endY; y++) {
                for (let z = startZ; z <= endZ; z++) {
                    const cx = Math.floor(x / CHUNK_SIZE);
                    const cz = Math.floor(z / CHUNK_SIZE);
                    const chunk = this.chunks.get(this.getChunkKey(cx, cz));

                    if (chunk) {
                        const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
                        const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
                        const blockType = chunk.getBlock(lx, y, lz);

                        if (blockType && blockType !== 'air' && blockType !== 'water') {
                            const bMinX = x * BLOCK_SIZE;
                            const bMaxX = bMinX + BLOCK_SIZE;
                            const bMinY = y * BLOCK_SIZE;
                            const bMaxY = bMinY + BLOCK_SIZE;
                            const bMinZ = z * BLOCK_SIZE;
                            const bMaxZ = bMinZ + BLOCK_SIZE;

                            const overlap =
                                pMinX < bMaxX && pMaxX > bMinX &&
                                pMinY < bMaxY && pMaxY > bMinY &&
                                pMinZ < bMaxZ && pMaxZ > bMinZ;

                            if (overlap) {
                                if (axis === 'y') {
                                    if (this.velocity.y < 0) {
                                        this.camera.position.y = bMaxY + EYE_HEIGHT + 0.001;
                                        this.velocity.y = 0;
                                        this.onGround = true;
                                        this.canJump = true;
                                    } else if (this.velocity.y > 0) {
                                        this.camera.position.y = bMinY - (PLAYER_HEIGHT - EYE_HEIGHT) - 0.001;
                                        this.velocity.y = 0;
                                    }
                                } else if (axis === 'x') {
                                    if (this.velocity.x > 0) {
                                        this.camera.position.x = bMinX - PLAYER_HALF_W - 0.001;
                                        this.velocity.x = 0;
                                    } else if (this.velocity.x < 0) {
                                        this.camera.position.x = bMaxX + PLAYER_HALF_W + 0.001;
                                        this.velocity.x = 0;
                                    }
                                } else if (axis === 'z') {
                                    if (this.velocity.z > 0) {
                                        this.camera.position.z = bMinZ - PLAYER_HALF_W - 0.001;
                                        this.velocity.z = 0;
                                    } else if (this.velocity.z < 0) {
                                        this.camera.position.z = bMaxZ + PLAYER_HALF_W + 0.001;
                                        this.velocity.z = 0;
                                    }
                                }
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    private onKeyDown = (e: KeyboardEvent) => {
        if (this.isInventoryOpen) return;
        switch (e.code) {
            case 'KeyW': this.moveState.fwd = true; break;
            case 'KeyS': this.moveState.bwd = true; break;
            case 'KeyA': this.moveState.left = true; break;
            case 'KeyD': this.moveState.right = true; break;
            case 'Space': if (this.canJump) { this.velocity.y = 130; this.canJump = false; } break;
        }
    }
    private onKeyUp = (e: KeyboardEvent) => {
        switch (e.code) {
            case 'KeyW': this.moveState.fwd = false; break;
            case 'KeyS': this.moveState.bwd = false; break;
            case 'KeyA': this.moveState.left = false; break;
            case 'KeyD': this.moveState.right = false; break;
        }
    }
    private onMouseMove = (e: MouseEvent) => {
        if (!this.isRunning || this.isPaused || this.isInventoryOpen) return;
        const euler = new THREE.Euler(0, 0, 0, 'YXZ');
        euler.setFromQuaternion(this.camera.quaternion);
        euler.y -= e.movementX * this.sensitivity;
        euler.x -= e.movementY * this.sensitivity;
        euler.x = Math.max(-1.5, Math.min(1.5, euler.x));
        this.camera.quaternion.setFromEuler(euler);
    }
    private onMouseDown = (e: MouseEvent) => {
        if (!this.isRunning || this.isPaused || this.isInventoryOpen) return;
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

        const meshes = Array.from(this.chunks.values())
            .map(c => c.mesh)
            .filter((m): m is THREE.Mesh => m !== null);

        const hits = this.raycaster.intersectObjects(meshes);
        if (hits.length === 0 || hits[0].distance > 60) return;

        const p = hits[0].point;
        const n = hits[0].face!.normal;

        const hitX = Math.floor((p.x - n.x * 0.1) / BLOCK_SIZE);
        const hitY = Math.floor((p.y - n.y * 0.1) / BLOCK_SIZE);
        const hitZ = Math.floor((p.z - n.z * 0.1) / BLOCK_SIZE);

        if (e.button === 0) {
            this.modifyBlock(hitX, hitY, hitZ, 'air');
        } else if (e.button === 2) {
            const selectedBlock = (window as any).__SELECTED_BLOCK__;
            if (!selectedBlock) return;

            const placeX = Math.floor((p.x + n.x * 0.1) / BLOCK_SIZE);
            const placeY = Math.floor((p.y + n.y * 0.1) / BLOCK_SIZE);
            const placeZ = Math.floor((p.z + n.z * 0.1) / BLOCK_SIZE);

            const px = this.camera.position.x;
            const py = this.camera.position.y;
            const pz = this.camera.position.z;

            const bMinX = placeX * BLOCK_SIZE; const bMaxX = bMinX + BLOCK_SIZE;
            const bMinY = placeY * BLOCK_SIZE; const bMaxY = bMinY + BLOCK_SIZE;
            const bMinZ = placeZ * BLOCK_SIZE; const bMaxZ = bMinZ + BLOCK_SIZE;

            const pMinX = px - PLAYER_HALF_W; const pMaxX = px + PLAYER_HALF_W;
            const pMinY = py - EYE_HEIGHT; const pMaxY = py + (PLAYER_HEIGHT - EYE_HEIGHT);
            const pMinZ = pz - PLAYER_HALF_W; const pMaxZ = pz + PLAYER_HALF_W;

            if (pMinX < bMaxX && pMaxX > bMinX && pMinY < bMaxY && pMaxY > bMinY && pMinZ < bMaxZ && pMaxZ > bMinZ) {
                return;
            }

            this.modifyBlock(placeX, placeY, placeZ, selectedBlock);
        }
    }

    private modifyBlock(x: number, y: number, z: number, type: string) {
        if (!db) return;
        const bid = `${x * BLOCK_SIZE}_${y * BLOCK_SIZE}_${z * BLOCK_SIZE}`;
        setDoc(doc(db, `${this.worldPath}/blocks`, bid), { x: x * BLOCK_SIZE, y: y * BLOCK_SIZE, z: z * BLOCK_SIZE, type });
        const cx = Math.floor(x / CHUNK_SIZE);
        const cz = Math.floor(z / CHUNK_SIZE);
        const lx = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const key = this.getChunkKey(cx, cz);
        const chunk = this.chunks.get(key);
        if (chunk) { chunk.setBlock(lx, y, lz, type); }
    }

    private onResize = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }
    public dispose() {
        this.chunks.forEach(c => { if (c.mesh) { this.scene.remove(c.mesh); c.mesh.geometry.dispose(); } });
        window.removeEventListener('resize', this.onResize);
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.body.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('mousedown', this.onMouseDown);
        if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        this.renderer.dispose();
    }
}