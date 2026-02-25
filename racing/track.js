var TRACK = (function () {
    'use strict';

    // Circuit control points [x, y(up), z] - closed loop, large smooth circuit
    var controlPoints = [
        new THREE.Vector3(0, 0, -90),        // Start/finish straight
        new THREE.Vector3(55, 0, -85),       // Gentle right
        new THREE.Vector3(95, 0, -55),       // Turn 1 entry
        new THREE.Vector3(110, 0, -5),       // Turn 1 exit (wide sweeper)
        new THREE.Vector3(90, 0, 45),        // Back straight entry
        new THREE.Vector3(45, 0, 80),        // Turn 2 (fast left)
        new THREE.Vector3(-10, 0, 75),       // Short straight
        new THREE.Vector3(-50, 0, 55),       // Chicane entry
        new THREE.Vector3(-75, 0, 25),       // Chicane exit
        new THREE.Vector3(-105, 0, -10),     // Hairpin entry
        new THREE.Vector3(-95, 0, -50),      // Hairpin apex
        new THREE.Vector3(-60, 0, -75),      // Back straight
        new THREE.Vector3(-20, 0, -92)       // Approaching finish
    ];

    var trackWidth = DATA.config.trackWidth;
    var splineResolution = 300;

    // Create the closed catmull-rom spline
    var curve = new THREE.CatmullRomCurve3(controlPoints, true, 'catmullrom', 0.3);

    // Get pre-computed spline points
    var splinePoints = curve.getPoints(splineResolution);

    // Get tangent, normal at parameter t (0..1)
    function getTangent(t) {
        return curve.getTangent(t).normalize();
    }

    function getNormal(t) {
        var tan = getTangent(t);
        return new THREE.Vector3(-tan.z, 0, tan.x);
    }

    function getPointAtT(t) {
        return curve.getPoint(t);
    }

    // Find nearest t for a world position (brute-force with cached points)
    function getNearestT(x, z) {
        var best = 0;
        var bestDist = Infinity;
        for (var i = 0; i <= splineResolution; i++) {
            var p = splinePoints[i];
            var dx = p.x - x;
            var dz = p.z - z;
            var d = dx * dx + dz * dz;
            if (d < bestDist) {
                bestDist = d;
                best = i;
            }
        }
        return best / splineResolution;
    }

    // Check if position is on track
    function isOnTrack(x, z) {
        var t = getNearestT(x, z);
        var center = curve.getPoint(t);
        var dx = center.x - x;
        var dz = center.z - z;
        return Math.sqrt(dx * dx + dz * dz) <= trackWidth;
    }

    // Create track meshes and add to scene
    function createTrackMesh(scene) {
        // Ground plane
        var groundGeo = new THREE.PlaneGeometry(600, 600);
        var groundMat = new THREE.MeshStandardMaterial({
            color: 0x4a7a2e,
            roughness: 0.9,
            metalness: 0
        });
        var ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.1;
        ground.receiveShadow = true;
        scene.add(ground);

        // Track surface - triangle strip from edges
        var leftEdge = [];
        var rightEdge = [];
        for (var i = 0; i <= splineResolution; i++) {
            var t = i / splineResolution;
            var pt = curve.getPoint(t);
            var n = getNormal(t);
            leftEdge.push(
                pt.x + n.x * trackWidth,
                0.01,
                pt.z + n.z * trackWidth
            );
            rightEdge.push(
                pt.x - n.x * trackWidth,
                0.01,
                pt.z - n.z * trackWidth
            );
        }

        var trackVerts = [];
        var trackUvs = [];
        for (var j = 0; j < splineResolution; j++) {
            var li = j * 3;
            var ni = (j + 1) * 3;
            // Triangle 1
            trackVerts.push(
                leftEdge[li], leftEdge[li + 1], leftEdge[li + 2],
                rightEdge[li], rightEdge[li + 1], rightEdge[li + 2],
                leftEdge[ni], leftEdge[ni + 1], leftEdge[ni + 2]
            );
            // Triangle 2
            trackVerts.push(
                rightEdge[li], rightEdge[li + 1], rightEdge[li + 2],
                rightEdge[ni], rightEdge[ni + 1], rightEdge[ni + 2],
                leftEdge[ni], leftEdge[ni + 1], leftEdge[ni + 2]
            );
            var u0 = j / splineResolution;
            var u1 = (j + 1) / splineResolution;
            trackUvs.push(0, u0, 1, u0, 0, u1, 1, u0, 1, u1, 0, u1);
        }

        var trackGeo = new THREE.BufferGeometry();
        trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(trackVerts, 3));
        trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(trackUvs, 2));
        trackGeo.computeVertexNormals();

        var trackMat = new THREE.MeshStandardMaterial({
            color: 0x333338,
            roughness: 0.85,
            metalness: 0.05,
            side: THREE.DoubleSide
        });
        var trackMesh = new THREE.Mesh(trackGeo, trackMat);
        trackMesh.receiveShadow = true;
        scene.add(trackMesh);

        // Curbs (red/white on outer edges)
        addCurbs(scene, leftEdge, splineResolution, 1.5, true);
        addCurbs(scene, rightEdge, splineResolution, 1.5, false);

        // Center dashed line
        addCenterLine(scene);

        // Start/finish line
        addStartFinish(scene);

        // Barrier walls along track edges
        addBarrierWalls(scene, leftEdge, splineResolution, true);
        addBarrierWalls(scene, rightEdge, splineResolution, false);

        // Decorations
        addTrees(scene);
        addGrandstand(scene);
        addParkingArea(scene);
    }

    function addBarrierWalls(scene, edgeVerts, resolution, isLeft) {
        var wallH = 1.2;
        var wallDist = trackWidth + 1.5;
        var sign = isLeft ? 1 : -1;
        var verts = [];

        // Pre-compute wall positions, detect and fix self-intersections
        var wallPts = [];
        for (var i = 0; i <= resolution; i++) {
            var t = i / resolution;
            var p = curve.getPoint(t);
            var n = getNormal(t);
            wallPts.push({
                x: p.x + n.x * wallDist * sign,
                z: p.z + n.z * wallDist * sign
            });
        }

        // Build wall segments, skip degenerate ones
        for (var j = 0; j < resolution; j++) {
            var a = wallPts[j];
            var b = wallPts[j + 1];
            // Skip if points too close (collapsed inner corner)
            var segDx = b.x - a.x;
            var segDz = b.z - a.z;
            if (segDx * segDx + segDz * segDz < 0.01) continue;

            verts.push(a.x, 0, a.z, a.x, wallH, a.z, b.x, 0, b.z);
            verts.push(a.x, wallH, a.z, b.x, wallH, b.z, b.x, 0, b.z);
        }

        if (verts.length === 0) return;
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        var mat = new THREE.MeshStandardMaterial({
            color: 0x888899,
            roughness: 0.6,
            metalness: 0.2,
            side: THREE.DoubleSide
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }

    function addCurbs(scene, edgeVerts, resolution, curbW, isLeft) {
        var verts = [];
        var colors = [];
        for (var i = 0; i < resolution; i++) {
            var li = i * 3;
            var ni = (i + 1) * 3;
            var t = i / resolution;
            var n = getNormal(t);
            var sign = isLeft ? 1 : -1;

            var ox = n.x * curbW * sign;
            var oz = n.z * curbW * sign;

            var ax = edgeVerts[li], az = edgeVerts[li + 2];
            var bx = edgeVerts[ni], bz = edgeVerts[ni + 2];

            // Inner edge
            verts.push(ax, 0.02, az);
            verts.push(bx, 0.02, bz);
            // Outer edge
            verts.push(ax + ox, 0.02, az + oz);

            verts.push(bx, 0.02, bz);
            verts.push(bx + ox, 0.02, bz + oz);
            verts.push(ax + ox, 0.02, az + oz);

            var isRed = (Math.floor(i / 4) % 2 === 0);
            var r = isRed ? 0.85 : 0.95;
            var g = isRed ? 0.15 : 0.95;
            var b = isRed ? 0.15 : 0.95;
            for (var k = 0; k < 6; k++) {
                colors.push(r, g, b);
            }
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeVertexNormals();

        var mat = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.8,
            metalness: 0,
            side: THREE.DoubleSide
        });
        var mesh = new THREE.Mesh(geo, mat);
        mesh.receiveShadow = true;
        scene.add(mesh);
    }

    function addCenterLine(scene) {
        var dashLen = 2;
        var gapLen = 3;
        var lineW = 0.2;
        var totalLen = curve.getLength();
        var pos = 0;
        var verts = [];

        while (pos < totalLen) {
            var t0 = pos / totalLen;
            var t1 = Math.min((pos + dashLen) / totalLen, 1);
            var p0 = curve.getPoint(t0);
            var p1 = curve.getPoint(t1);
            var n0 = getNormal(t0);
            var n1 = getNormal(t1);

            verts.push(
                p0.x + n0.x * lineW, 0.025, p0.z + n0.z * lineW,
                p0.x - n0.x * lineW, 0.025, p0.z - n0.z * lineW,
                p1.x + n1.x * lineW, 0.025, p1.z + n1.z * lineW,
                p0.x - n0.x * lineW, 0.025, p0.z - n0.z * lineW,
                p1.x - n1.x * lineW, 0.025, p1.z - n1.z * lineW,
                p1.x + n1.x * lineW, 0.025, p1.z + n1.z * lineW
            );
            pos += dashLen + gapLen;
        }

        if (verts.length === 0) return;
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.computeVertexNormals();
        var mat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.6, side: THREE.DoubleSide });
        scene.add(new THREE.Mesh(geo, mat));
    }

    function addStartFinish(scene) {
        var p = curve.getPoint(0);
        var n = getNormal(0);
        var w = trackWidth;
        var checkerSize = 1.5;
        var rows = 2;
        var cols = Math.floor((w * 2) / checkerSize);

        for (var r = 0; r < rows; r++) {
            for (var c = 0; c < cols; c++) {
                var isWhite = (r + c) % 2 === 0;
                var geo = new THREE.PlaneGeometry(checkerSize, checkerSize);
                var mat = new THREE.MeshStandardMaterial({
                    color: isWhite ? 0xffffff : 0x111111,
                    roughness: 0.5
                });
                var tile = new THREE.Mesh(geo, mat);
                tile.rotation.x = -Math.PI / 2;

                var tan = getTangent(0);
                var offsetAlong = (r - (rows - 1) / 2) * checkerSize;
                var offsetAcross = (c - (cols - 1) / 2) * checkerSize;

                tile.position.set(
                    p.x + tan.x * offsetAlong + n.x * offsetAcross,
                    0.03,
                    p.z + tan.z * offsetAlong + n.z * offsetAcross
                );

                var angle = Math.atan2(tan.x, tan.z);
                tile.rotation.y = angle;
                tile.rotation.order = 'YXZ';
                tile.receiveShadow = true;
                scene.add(tile);
            }
        }
    }

    function addTrees(scene) {
        var treeMat = new THREE.MeshStandardMaterial({ color: 0x2d6b1e, roughness: 0.8 });
        var trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.9 });
        var coneGeo = new THREE.ConeGeometry(2, 5, 6);
        var cylGeo = new THREE.CylinderGeometry(0.4, 0.5, 2, 6);

        for (var i = 0; i < 40; i++) {
            var angle = Math.random() * Math.PI * 2;
            var dist = 150 + Math.random() * 80;
            var x = Math.cos(angle) * dist;
            var z = Math.sin(angle) * dist;

            // Make sure tree is not on track
            if (isOnTrack(x, z)) continue;

            var trunk = new THREE.Mesh(cylGeo, trunkMat);
            trunk.position.set(x, 1, z);
            trunk.castShadow = true;
            scene.add(trunk);

            var crown = new THREE.Mesh(coneGeo, treeMat);
            crown.position.set(x, 4.5, z);
            crown.castShadow = true;
            scene.add(crown);
        }
    }

    function addGrandstand(scene) {
        var mat = new THREE.MeshStandardMaterial({ color: 0x667788, roughness: 0.7 });

        // Place grandstand near the start/finish straight
        var p = curve.getPoint(0);
        var n = getNormal(0);

        var stand = new THREE.Mesh(
            new THREE.BoxGeometry(20, 4, 5),
            mat
        );
        stand.position.set(
            p.x + n.x * (trackWidth + 20),
            2,
            p.z + n.z * (trackWidth + 20)
        );
        stand.castShadow = true;
        stand.receiveShadow = true;
        scene.add(stand);

        // Roof
        var roof = new THREE.Mesh(
            new THREE.BoxGeometry(22, 0.3, 6),
            new THREE.MeshStandardMaterial({ color: 0x445566, roughness: 0.5 })
        );
        roof.position.set(stand.position.x, 4.5, stand.position.z);
        scene.add(roof);
    }

    // Checkpoints - evenly spaced along the track
    var numCheckpoints = 20;
    var checkpoints = [];

    function generateCheckpoints() {
        checkpoints = [];
        for (var i = 0; i < numCheckpoints; i++) {
            var t = i / numCheckpoints;
            var p = curve.getPoint(t);
            var n = getNormal(t);
            var tan = getTangent(t);
            checkpoints.push({
                t: t,
                x: p.x,
                z: p.z,
                nx: n.x,
                nz: n.z,
                tanX: tan.x,
                tanZ: tan.z,
                leftX: p.x + n.x * trackWidth * 1.1,
                leftZ: p.z + n.z * trackWidth * 1.1,
                rightX: p.x - n.x * trackWidth * 1.1,
                rightZ: p.z - n.z * trackWidth * 1.1
            });
        }
        return checkpoints;
    }

    // Check if a car crossed a checkpoint between two positions.
    // Uses signed distance along the track tangent — much more robust
    // than segment intersection (never misses due to angle/drift).
    function crossedCheckpoint(cp, prevX, prevZ, curX, curZ) {
        // Signed distance along track tangent from checkpoint center
        var prevDot = (prevX - cp.x) * cp.tanX + (prevZ - cp.z) * cp.tanZ;
        var curDot = (curX - cp.x) * cp.tanX + (curZ - cp.z) * cp.tanZ;

        // Car must move from before (negative) to after (positive)
        if (prevDot >= 0 || curDot < 0) return false;

        // Interpolate crossing point and check distance from checkpoint center
        var frac = -prevDot / (curDot - prevDot);
        var crossX = prevX + (curX - prevX) * frac;
        var crossZ = prevZ + (curZ - prevZ) * frac;
        var dx = crossX - cp.x;
        var dz = crossZ - cp.z;
        var maxDist = trackWidth * 1.5;
        return (dx * dx + dz * dz) < maxDist * maxDist;
    }

    // Get starting grid positions
    function getStartPositions(count) {
        var positions = [];
        var startT = 0;
        var tangent = getTangent(startT);
        var normal = getNormal(startT);
        var p = curve.getPoint(startT);
        var angle = Math.atan2(tangent.x, tangent.z);

        for (var i = 0; i < count; i++) {
            var row = Math.floor(i / 2);
            var col = (i % 2 === 0) ? -1 : 1;
            positions.push({
                x: p.x - tangent.x * (row * 8 + 4) + normal.x * col * 6,
                z: p.z - tangent.z * (row * 8 + 4) + normal.z * col * 6,
                angle: angle
            });
        }
        return positions;
    }

    generateCheckpoints();

    // Parking area: off-track zone near start/finish, on the opposite side from grandstand
    function getParkingPositions(count) {
        var p = curve.getPoint(0.02); // slightly past start/finish
        var n = getNormal(0.02);
        var tan = getTangent(0.02);
        var positions = [];
        // Park on the opposite side from the grandstand (negative normal direction)
        for (var i = 0; i < count; i++) {
            var row = Math.floor(i / 2);
            var col = (i % 2 === 0) ? 0 : 1;
            positions.push({
                x: p.x - n.x * (trackWidth + 10 + col * 4) + tan.x * (row * 5),
                z: p.z - n.z * (trackWidth + 10 + col * 4) + tan.z * (row * 5)
            });
        }
        return positions;
    }

    function addParkingArea(scene) {
        var p = curve.getPoint(0.02);
        var n = getNormal(0.02);
        var tan = getTangent(0.02);
        // Parking lot surface
        var geo = new THREE.PlaneGeometry(16, 20);
        var mat = new THREE.MeshStandardMaterial({
            color: 0x444450,
            roughness: 0.9,
            metalness: 0,
            side: THREE.DoubleSide
        });
        var lot = new THREE.Mesh(geo, mat);
        lot.rotation.x = -Math.PI / 2;
        var lotX = p.x - n.x * (trackWidth + 14);
        var lotZ = p.z - n.z * (trackWidth + 14);
        lot.position.set(lotX, 0.005, lotZ);
        var angle = Math.atan2(tan.x, tan.z);
        lot.rotation.y = angle;
        lot.rotation.order = 'YXZ';
        lot.receiveShadow = true;
        scene.add(lot);
    }

    return {
        curve: curve,
        trackWidth: trackWidth,
        splinePoints: splinePoints,
        splineResolution: splineResolution,
        checkpoints: checkpoints,
        getPointAtT: getPointAtT,
        getTangent: getTangent,
        getNormal: getNormal,
        getNearestT: getNearestT,
        isOnTrack: isOnTrack,
        createTrackMesh: createTrackMesh,
        crossedCheckpoint: crossedCheckpoint,
        getStartPositions: getStartPositions,
        getParkingPositions: getParkingPositions,
        addParkingArea: addParkingArea
    };
})();
