(function () {
	'use strict';

	const overlay = document.getElementById('afterlifeOverlay');
	const textEl = document.getElementById('afterlifeText');
	const mazeOverlay = document.getElementById('mazeOverlay');
	const mazeCanvas = document.getElementById('mazeCanvas');
	const mazeHint = document.getElementById('mazeHint');

	let sequenceRunning = false;

	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

	function redactedLine(wordLengths) {
		const span = document.createElement('div');
		wordLengths.forEach((len, i) => {
			const bar = document.createElement('span');
			bar.className = 'redacted-bar';
			bar.style.width = len * 0.62 + 'em';
			bar.style.height = '1em';
			bar.textContent = '.'.repeat(len);
			span.appendChild(bar);
			if (i < wordLengths.length - 1) span.appendChild(document.createTextNode(' '));
		});
		return span;
	}

	async function showLine(text, holdMs) {
		textEl.innerHTML = '';
		textEl.classList.remove('show');
		await sleep(50);
		textEl.textContent = text;
		textEl.classList.add('show');
		await sleep(holdMs);
		textEl.classList.remove('show');
		await sleep(800);
	}

	async function showRedactedLine(prefix, wordLengths, holdMs) {
		textEl.innerHTML = '';
		textEl.classList.remove('show');
		await sleep(50);

		const prefixNode = document.createTextNode(prefix + ' ');
		textEl.appendChild(prefixNode);
		textEl.appendChild(redactedLine(wordLengths));

		textEl.classList.add('show');
		await sleep(holdMs);
		textEl.classList.remove('show');
		await sleep(800);
	}

	async function runSummerSequence() {
		if (sequenceRunning) return;
		sequenceRunning = true;

		overlay.classList.add('show');
		await sleep(600);

		await showLine('you did it.', 2200);
		await showLine('you got the last rarity in your collection.', 2600);
		await showRedactedLine('you can now', [4, 6, 3, 8, 5], 3200);

		await sleep(2000);

		overlay.classList.remove('show');
		await sleep(1200);

		startMaze();
	}

	let mazeState = null;

	function buildMazeGrid(size) {
		const grid = [];
		for (let y = 0; y < size; y++) {
			grid.push(new Array(size).fill(1));
		}

		function carve(x, y) {
			grid[y][x] = 0;
			const dirs = [
				[0, -2],
				[0, 2],
				[-2, 0],
				[2, 0],
			];
			for (let i = dirs.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[dirs[i], dirs[j]] = [dirs[j], dirs[i]];
			}
			for (const [dx, dy] of dirs) {
				const nx = x + dx;
				const ny = y + dy;
				if (nx > 0 && nx < size - 1 && ny > 0 && ny < size - 1 && grid[ny][nx] === 1) {
					grid[y + dy / 2][x + dx / 2] = 0;
					carve(nx, ny);
				}
			}
		}

		carve(1, 1);
		return grid;
	}

	function makeBrickTexture() {
		const c = document.createElement('canvas');
		c.width = 32;
		c.height = 32;
		const ctx = c.getContext('2d');
		ctx.fillStyle = '#2a2a2a';
		ctx.fillRect(0, 0, 32, 32);
		ctx.fillStyle = '#1a1a1a';
		for (let y = 0; y < 32; y += 8) {
			const offset = (y / 8) % 2 === 0 ? 0 : 8;
			for (let x = -8; x < 32; x += 16) {
				ctx.fillRect(x + offset, y, 14, 6);
			}
		}
		const tex = new THREE.CanvasTexture(c);
		tex.magFilter = THREE.NearestFilter;
		tex.minFilter = THREE.NearestFilter;
		tex.wrapS = THREE.RepeatWrapping;
		tex.wrapT = THREE.RepeatWrapping;
		return tex;
	}

	function startMaze() {
		mazeOverlay.classList.add('show');

		const size = 21;
		const grid = buildMazeGrid(size);
		const cellSize = 4;

		const scene = new THREE.Scene();
		scene.background = new THREE.Color(0x030305);
		scene.fog = new THREE.Fog(0x030305, 5, 40);

		const camera = new THREE.PerspectiveCamera(
			70,
			window.innerWidth / window.innerHeight,
			0.1,
			100
		);

		let startX = 1,
			startY = 1;
		outer: for (let y = 1; y < size - 1; y++) {
			for (let x = 1; x < size - 1; x++) {
				if (grid[y][x] === 0) {
					startX = x;
					startY = y;
					break outer;
				}
			}
		}

		camera.position.set(startX * cellSize, 1.6, startY * cellSize);
		let yaw = 0;
		let pitch = 0;

		const renderer = new THREE.WebGLRenderer({ canvas: mazeCanvas, antialias: true });
		renderer.setSize(window.innerWidth, window.innerHeight);
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

		const brickTex = makeBrickTexture();
		const wallGeo = new THREE.BoxGeometry(cellSize, cellSize, cellSize);
		const wallMat = new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 });

		const wallMesh = new THREE.InstancedMesh(wallGeo, wallMat, size * size);
		let wallCount = 0;
		const dummy = new THREE.Object3D();
		const occupied = [];

		for (let y = 0; y < size; y++) {
			occupied.push(new Array(size).fill(false));
			for (let x = 0; x < size; x++) {
				if (grid[y][x] === 1) {
					dummy.position.set(x * cellSize, cellSize / 2, y * cellSize);
					dummy.updateMatrix();
					wallMesh.setMatrixAt(wallCount++, dummy.matrix);
					occupied[y][x] = true;
				}
			}
		}
		wallMesh.count = wallCount;
		scene.add(wallMesh);

		const floorGeo = new THREE.PlaneGeometry(size * cellSize, size * cellSize);
		const floorMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 1 });
		const floor = new THREE.Mesh(floorGeo, floorMat);
		floor.rotation.x = -Math.PI / 2;
		floor.position.set(((size - 1) * cellSize) / 2, 0, ((size - 1) * cellSize) / 2);
		scene.add(floor);

		const ambient = new THREE.AmbientLight(0x222233, 1.2);
		scene.add(ambient);

		const headLight = new THREE.PointLight(0xffffff, 0.6, 12);
		camera.add(headLight);
		scene.add(camera);

		let orbX = size - 2,
			orbY = size - 2;
		outer2: for (let y = size - 2; y > 0; y--) {
			for (let x = size - 2; x > 0; x--) {
				if (grid[y][x] === 0) {
					orbX = x;
					orbY = y;
					break outer2;
				}
			}
		}

		const orbGeo = new THREE.SphereGeometry(0.4, 24, 24);
		const orbMat = new THREE.MeshStandardMaterial({
			color: 0x2288ff,
			emissive: 0x2288ff,
			emissiveIntensity: 2,
		});
		const orb = new THREE.Mesh(orbGeo, orbMat);
		orb.position.set(orbX * cellSize, 1, orbY * cellSize);
		scene.add(orb);

		const orbLight = new THREE.PointLight(0x4499ff, 3, 10);
		orb.add(orbLight);

		const keys = {};
		function onKeyDown(e) {
			keys[e.key.toLowerCase()] = true;
		}
		function onKeyUp(e) {
			keys[e.key.toLowerCase()] = false;
		}
		window.addEventListener('keydown', onKeyDown);
		window.addEventListener('keyup', onKeyUp);

		let locked = false;
		function onClick() {
			mazeCanvas.requestPointerLock();
		}
		mazeCanvas.addEventListener('click', onClick);

		function onLockChange() {
			locked = document.pointerLockElement === mazeCanvas;
			mazeHint.style.display = locked ? 'none' : 'block';
		}
		document.addEventListener('pointerlockchange', onLockChange);

		function onMouseMove(e) {
			if (!locked) return;
			yaw -= e.movementX * 0.0022;
			pitch -= e.movementY * 0.0022;
			pitch = Math.max(-1.3, Math.min(1.3, pitch));
		}
		document.addEventListener('mousemove', onMouseMove);

		function onResize() {
			camera.aspect = window.innerWidth / window.innerHeight;
			camera.updateProjectionMatrix();
			renderer.setSize(window.innerWidth, window.innerHeight);
		}
		window.addEventListener('resize', onResize);

		function collides(px, pz) {
			const gx = Math.round(px / cellSize);
			const gy = Math.round(pz / cellSize);
			if (gx < 0 || gy < 0 || gx >= size || gy >= size) return true;
			return occupied[gy] && occupied[gy][gx];
		}

		function bfsPath(fromX, fromY, toX, toY) {
			const visited = Array.from({ length: size }, () => new Array(size).fill(false));
			const prev = Array.from({ length: size }, () => new Array(size).fill(null));
			const queue = [[fromX, fromY]];
			visited[fromY][fromX] = true;

			while (queue.length) {
				const [cx, cy] = queue.shift();
				if (cx === toX && cy === toY) break;

				const neighbors = [
					[cx + 1, cy],
					[cx - 1, cy],
					[cx, cy + 1],
					[cx, cy - 1],
				];

				for (const [nx, ny] of neighbors) {
					if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue;
					if (occupied[ny][nx] || visited[ny][nx]) continue;
					visited[ny][nx] = true;
					prev[ny][nx] = [cx, cy];
					queue.push([nx, ny]);
				}
			}

			const path = [];
			let cur = [toX, toY];
			while (cur && !(cur[0] === fromX && cur[1] === fromY)) {
				path.unshift(cur);
				cur = prev[cur[1]][cur[0]];
			}
			return path;
		}

		const arrowGeo = new THREE.ConeGeometry(0.18, 0.4, 6);
		const arrowMat = new THREE.MeshBasicMaterial({
			color: 0x4499ff,
			transparent: true,
			opacity: 0.18,
		});
		const arrowGroup = new THREE.Group();
		scene.add(arrowGroup);
		const arrowMeshes = [];

		function rebuildArrowTrail() {
			arrowMeshes.forEach((m) => arrowGroup.remove(m));
			arrowMeshes.length = 0;

			const px = Math.round(camera.position.x / cellSize);
			const py = Math.round(camera.position.z / cellSize);
			const path = bfsPath(px, py, orbX, orbY);

			for (let i = 0; i < path.length; i += 2) {
				const [gx, gy] = path[i];
				const next = path[i + 1] || path[i];
				const dx = next[0] - gx;
				const dy = next[1] - gy;
				const angle = Math.atan2(dx, dy);

				const arrow = new THREE.Mesh(arrowGeo, arrowMat);
				arrow.position.set(gx * cellSize, 0.6, gy * cellSize);
				arrow.rotation.x = Math.PI / 2;
				arrow.rotation.z = -angle;
				arrowGroup.add(arrow);
				arrowMeshes.push(arrow);
			}
		}

		let arrowRefreshTimer = 0;

		const monster = new THREE.Group();

		const bodyGeo = new THREE.CylinderGeometry(0.32, 0.4, 1.3, 8);
		const bodyMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
		const body = new THREE.Mesh(bodyGeo, bodyMat);
		body.position.y = 0.95;
		monster.add(body);

		const headGeo = new THREE.SphereGeometry(0.28, 12, 12);
		const head = new THREE.Mesh(headGeo, bodyMat);
		head.position.y = 1.75;
		monster.add(head);

		const monsterLight = new THREE.PointLight(0xff0000, 4, 6);
		monsterLight.position.y = 1.75;
		monster.add(monsterLight);

		const monsterGlowGeo = new THREE.SphereGeometry(0.05, 8, 8);
		const monsterGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
		const monsterGlow = new THREE.Mesh(monsterGlowGeo, monsterGlowMat);
		monsterGlow.position.y = 1.75;
		monster.add(monsterGlow);

		let monsterCellX = size - 3;
		let monsterCellY = 3;
		outerM: for (let y = 2; y < size - 2; y++) {
			for (let x = 2; x < size - 2; x++) {
				if (grid[y][x] === 0) {
					monsterCellX = x;
					monsterCellY = y;
					break outerM;
				}
			}
		}
		monster.position.set(monsterCellX * cellSize, 0, monsterCellY * cellSize);
		scene.add(monster);

		let monsterTargetX = monsterCellX;
		let monsterTargetY = monsterCellY;
		let monsterSpeed = 1.6;
		let monsterRetargetTimer = 0;

		function pickMonsterTarget() {
			const px = Math.round(camera.position.x / cellSize);
			const py = Math.round(camera.position.z / cellSize);
			const dist = Math.abs(px - monsterCellX) + Math.abs(py - monsterCellY);

			if (dist < 14 && Beacon.float() < 0.65) {
				monsterTargetX = px;
				monsterTargetY = py;
				return;
			}

			let tx,
				ty,
				attempts = 0;
			do {
				tx = 1 + Math.floor(Math.random() * (size - 2));
				ty = 1 + Math.floor(Math.random() * (size - 2));
				attempts++;
			} while (occupied[ty][tx] && attempts < 40);
			monsterTargetX = tx;
			monsterTargetY = ty;
		}

		function teleportPlayer() {
			let tx,
				ty,
				attempts = 0;
			do {
				tx = 1 + Math.floor(Math.random() * (size - 2));
				ty = 1 + Math.floor(Math.random() * (size - 2));
				attempts++;
			} while (occupied[ty][tx] && attempts < 60);
			camera.position.set(tx * cellSize, 1.6, ty * cellSize);
		}

		let ended = false;
		let rafId = null;
		const clock = new THREE.Clock();

		function animate() {
			if (ended) return;
			rafId = requestAnimationFrame(animate);
			const dt = clock.getDelta();

			camera.rotation.order = 'YXZ';
			camera.rotation.y = yaw;
			camera.rotation.x = pitch;

			const speed = 5 * dt;
			const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
			const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

			let move = new THREE.Vector3();
			if (keys['w'] || keys['arrowup']) move.add(forward);
			if (keys['s'] || keys['arrowdown']) move.sub(forward);
			if (keys['a'] || keys['arrowleft']) move.sub(right);
			if (keys['d'] || keys['arrowright']) move.add(right);

			if (move.lengthSq() > 0) {
				move.normalize().multiplyScalar(speed);
				const nx = camera.position.x + move.x;
				const nz = camera.position.z + move.z;

				if (!collides(nx, camera.position.z)) camera.position.x = nx;
				if (!collides(camera.position.x, nz)) camera.position.z = nz;
			}

			orb.rotation.y += dt * 0.8;
			orbMat.emissiveIntensity = 2 + Math.sin(performance.now() * 0.004) * 0.6;

			const dist = camera.position.distanceTo(orb.position);
			if (dist < 1.4) {
				endMaze();
				return;
			}

			monsterRetargetTimer += dt;
			if (monsterRetargetTimer > 1.5) {
				monsterRetargetTimer = 0;
				pickMonsterTarget();
			}

			const mdx = monsterTargetX * cellSize - monster.position.x;
			const mdz = monsterTargetY * cellSize - monster.position.z;
			const mDist = Math.sqrt(mdx * mdx + mdz * mdz);
			if (mDist > 0.1) {
				monster.position.x += (mdx / mDist) * monsterSpeed * dt;
				monster.position.z += (mdz / mDist) * monsterSpeed * dt;
				monster.rotation.y = Math.atan2(mdx, mdz);
			}
			monsterCellX = Math.round(monster.position.x / cellSize);
			monsterCellY = Math.round(monster.position.z / cellSize);

			body.scale.y = 1 + Math.sin(performance.now() * 0.006) * 0.03;

			const playerDist = camera.position.distanceTo(
				new THREE.Vector3(monster.position.x, 1.6, monster.position.z)
			);
			if (playerDist < 1.1) {
				teleportPlayer();
			}

			arrowRefreshTimer += dt;
			if (arrowRefreshTimer > 1) {
				arrowRefreshTimer = 0;
				rebuildArrowTrail();
			}

			renderer.render(scene, camera);
		}

		function endMaze() {
			if (ended) return;
			ended = true;
			if (rafId) cancelAnimationFrame(rafId);

			window.removeEventListener('keydown', onKeyDown);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('resize', onResize);
			document.removeEventListener('pointerlockchange', onLockChange);
			document.removeEventListener('mousemove', onMouseMove);
			mazeCanvas.removeEventListener('click', onClick);
			if (document.pointerLockElement === mazeCanvas) document.exitPointerLock();

			wallGeo.dispose();
			wallMat.dispose();
			orbGeo.dispose();
			orbMat.dispose();
			floorGeo.dispose();
			floorMat.dispose();
			brickTex.dispose();
			renderer.dispose();
			bodyGeo.dispose();
			bodyMat.dispose();
			headGeo.dispose();
			monsterGlowGeo.dispose();
			monsterGlowMat.dispose();
			arrowGeo.dispose();
			arrowMat.dispose();

			sequenceRunning = false;

			mazeOverlay.classList.remove('show');
			setTimeout(() => {
				enterWorldTwo();
			}, 1000);
		}

		rebuildArrowTrail();
		animate();
	}

	function enterWorldTwo() {
		localStorage.setItem('world', '2');
		localStorage.removeItem(STORAGE_KEY_INVENTORY_PLACEHOLDER);
		location.reload();
	}

	const STORAGE_KEY_INVENTORY_PLACEHOLDER = 'rarityInventory';

	window.triggerSummerAfterlife = runSummerSequence;
})();
