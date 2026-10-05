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

        buildEdgeSamples();

        // Asphalt surface between the two (loop-free) edges
        var left = offsetLine(trackWidth);
        var right = offsetLine(-trackWidth);
        addStrip(scene, left, right, 0.01, null, new THREE.MeshStandardMaterial({
            color: 0x333338,
            roughness: 0.85,
            metalness: 0.05,
            side: THREE.DoubleSide
        }), true);

        // Solid white edge lines just inside the asphalt
        var lineMat = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 0.6, side: THREE.DoubleSide });
        addStrip(scene, offsetLine(trackWidth - 0.35), offsetLine(trackWidth - 0.95), 0.02, null, lineMat, false);
        addStrip(scene, offsetLine(-trackWidth + 0.35), offsetLine(-trackWidth + 0.95), 0.02, null, lineMat, false);

        // Red/white curbs only through the corners
        addCurbs(scene, 1);
        addCurbs(scene, -1);

        // Center dashed line
        addCenterLine(scene);

        // Start/finish line
        addStartFinish(scene);

        // Barrier walls along track edges
        addBarrierWall(scene, 1);
        addBarrierWall(scene, -1);

        // Decorations
        addTrees(scene);
        addGrandstand(scene);
        addParkingArea(scene);
    }

    // ===== Edge geometry helpers =====
    // Dense, evenly usable samples of the centre line for visuals (physics keeps splineResolution)
    var edgeRes = 1200;
    var edgeCenters = null, edgeNormals = null, edgeArc = null, cornerMask = null;

    var curbWidth = 1.8;
    var wallInner = trackWidth + 2.5;
    var wallThickness = 0.8;
    var wallHeight = 1.1;

    function buildEdgeSamples() {
        if (edgeCenters) return;
        edgeCenters = [];
        edgeNormals = [];
        edgeArc = [0];
        for (var i = 0; i <= edgeRes; i++) {
            var t = i / edgeRes;
            edgeCenters.push(curve.getPoint(t));
            edgeNormals.push(getNormal(t));
            if (i > 0) {
                var dx = edgeCenters[i].x - edgeCenters[i - 1].x;
                var dz = edgeCenters[i].z - edgeCenters[i - 1].z;
                edgeArc.push(edgeArc[i - 1] + Math.sqrt(dx * dx + dz * dz));
            }
        }

        // Corner detection: heading change over ~10 units of track
        var raw = [];
        for (var j = 0; j <= edgeRes; j++) {
            var a = edgeNormals[(j - 6 + edgeRes) % edgeRes];
            var b = edgeNormals[(j + 6) % edgeRes];
            var turn = Math.acos(Math.max(-1, Math.min(1, a.x * b.x + a.z * b.z)));
            var len = 12 * (edgeArc[edgeRes] / edgeRes);
            raw.push(turn / len > 1 / 70); // radius tighter than ~70 units
        }
        // Grow corner zones a little so curbs start before and end after the bend
        cornerMask = [];
        var grow = Math.round(14 / (edgeArc[edgeRes] / edgeRes));
        for (var k = 0; k <= edgeRes; k++) {
            var on = false;
            for (var g = -grow; g <= grow && !on; g++) {
                on = raw[(k + g + edgeRes) % edgeRes];
            }
            cornerMask.push(on);
        }
    }

    // Offset the centre line by a signed distance (positive = left) and remove the
    // self-intersecting loops that appear on the inside of tight corners.
    function offsetLine(dist) {
        var pts = [];
        for (var i = 0; i <= edgeRes; i++) {
            pts.push({
                x: edgeCenters[i].x + edgeNormals[i].x * dist,
                z: edgeCenters[i].z + edgeNormals[i].z * dist
            });
        }
        var fixed = [];
        for (var a = 0; a < edgeRes; a++) {
            for (var k = 2; k < 160 && a + k < edgeRes; k++) {
                var hit = segmentHit(pts[a], pts[a + 1], pts[a + k], pts[a + k + 1]);
                if (hit) {
                    for (var m = a + 1; m <= a + k; m++) {
                        pts[m] = { x: hit.x, z: hit.z };
                        fixed.push(m);
                    }
                    a = a + k - 1;
                    break;
                }
            }
        }
        // Also treat any sharp bend in the offset line (a near-cusp) as a kink
        for (var q = 1; q < edgeRes; q++) {
            var ux = pts[q].x - pts[q - 1].x, uz = pts[q].z - pts[q - 1].z;
            var vx = pts[q + 1].x - pts[q].x, vz = pts[q + 1].z - pts[q].z;
            var lu = Math.hypot(ux, uz), lv = Math.hypot(vx, vz);
            if (lu < 1e-6 || lv < 1e-6) continue;
            if ((ux * vx + uz * vz) / (lu * lv) < Math.cos(0.08)) fixed.push(q);
        }
        // Soften kinks: where a loop was cut out, or where the line bends sharply
        if (fixed.length) {
            var touched = {};
            fixed.forEach(function (idx) {
                for (var d = -24; d <= 24; d++) touched[Math.min(edgeRes - 1, Math.max(1, idx + d))] = true;
            });
            for (var pass = 0; pass < 30; pass++) {
                var copy = pts.map(function (p) { return { x: p.x, z: p.z }; });
                for (var key in touched) {
                    var n = +key;
                    pts[n] = {
                        x: (copy[n - 1].x + copy[n].x * 2 + copy[n + 1].x) / 4,
                        z: (copy[n - 1].z + copy[n].z * 2 + copy[n + 1].z) / 4
                    };
                }
            }
        }
        pts[edgeRes] = pts[0];
        return pts;
    }

    function segmentHit(p1, p2, p3, p4) {
        var d1x = p2.x - p1.x, d1z = p2.z - p1.z;
        var d2x = p4.x - p3.x, d2z = p4.z - p3.z;
        var denom = d1x * d2z - d1z * d2x;
        if (Math.abs(denom) < 1e-9) return null;
        var t = ((p3.x - p1.x) * d2z - (p3.z - p1.z) * d2x) / denom;
        var u = ((p3.x - p1.x) * d1z - (p3.z - p1.z) * d1x) / denom;
        if (t <= 0 || t >= 1 || u <= 0 || u >= 1) return null;
        return { x: p1.x + d1x * t, z: p1.z + d1z * t };
    }

    // Flat ribbon between two offset lines. colorFn(i) returns [r,g,b], or null to skip a segment.
    function addStrip(scene, inner, outer, y, colorFn, material, receiveShadow) {
        var verts = [], colors = [];
        for (var i = 0; i < edgeRes; i++) {
            var c = colorFn ? colorFn(i) : [1, 1, 1];
            if (colorFn && !c) continue;
            var a = inner[i], b = inner[i + 1], c2 = outer[i], d = outer[i + 1];
            verts.push(a.x, y, a.z, c2.x, y, c2.z, b.x, y, b.z);
            verts.push(c2.x, y, c2.z, d.x, y, d.z, b.x, y, b.z);
            if (c) for (var k = 0; k < 6; k++) colors.push(c[0], c[1], c[2]);
        }
        if (!verts.length) return;
        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        if (colorFn) {
            geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            material.vertexColors = true;
        }
        geo.computeVertexNormals();
        var mesh = new THREE.Mesh(geo, material);
        mesh.receiveShadow = receiveShadow !== false;
        scene.add(mesh);
    }

    function addCurbs(scene, side) {
        var inner = offsetLine(side * trackWidth);
        var outer = offsetLine(side * (trackWidth + curbWidth));
        var stripe = 2.6;
        addStrip(scene, inner, outer, 0.03, function (i) {
            if (!cornerMask[i]) return null;
            var mid = (edgeArc[i] + edgeArc[i + 1]) / 2;
            return Math.floor(mid / stripe) % 2 === 0 ? [0.84, 0.12, 0.12] : [0.96, 0.96, 0.96];
        }, new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, side: THREE.DoubleSide }));
    }

    // Low barrier with an inner face, top cap and outer face, in alternating blue/white panels
    function addBarrierWall(scene, side) {
        var a = offsetLine(side * wallInner);
        var b = offsetLine(side * (wallInner + wallThickness));
        var verts = [], colors = [];
        var panel = 5;

        function quad(p, q, r, s, col) {
            verts.push(p[0], p[1], p[2], q[0], q[1], q[2], r[0], r[1], r[2]);
            verts.push(q[0], q[1], q[2], s[0], s[1], s[2], r[0], r[1], r[2]);
            for (var k = 0; k < 6; k++) colors.push(col[0], col[1], col[2]);
        }

        for (var i = 0; i < edgeRes; i++) {
            var a0 = a[i], a1 = a[i + 1], b0 = b[i], b1 = b[i + 1];
            if (Math.abs(a1.x - a0.x) + Math.abs(a1.z - a0.z) < 1e-4) continue;
            var mid = (edgeArc[i] + edgeArc[i + 1]) / 2;
            var white = Math.floor(mid / panel) % 2 === 0;
            var face = white ? [0.93, 0.94, 0.96] : [0.16, 0.36, 0.78];
            var top = white ? [0.98, 0.98, 1] : [0.22, 0.44, 0.86];
            var h = wallHeight;
            quad([a0.x, 0, a0.z], [a1.x, 0, a1.z], [a0.x, h, a0.z], [a1.x, h, a1.z], face);
            quad([a0.x, h, a0.z], [a1.x, h, a1.z], [b0.x, h, b0.z], [b1.x, h, b1.z], top);
            quad([b0.x, 0, b0.z], [b1.x, 0, b1.z], [b0.x, h, b0.z], [b1.x, h, b1.z], face);
        }

        var geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.computeVertexNormals();
        var mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.55,
            metalness: 0.1,
            side: THREE.DoubleSide
        }));
        mesh.castShadow = true;
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
                leftX: p.x + n.x * trackWidth * 1.5,
                leftZ: p.z + n.z * trackWidth * 1.5,
                rightX: p.x - n.x * trackWidth * 1.5,
                rightZ: p.z - n.z * trackWidth * 1.5
            });
        }
        return checkpoints;
    }

    // Check if a car crossed a checkpoint gate between two positions
    function crossedCheckpoint(cp, prevX, prevZ, curX, curZ) {
        return segmentsIntersect(
            prevX, prevZ, curX, curZ,
            cp.leftX, cp.leftZ, cp.rightX, cp.rightZ
        );
    }

    function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
        var denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
        if (Math.abs(denom) < 1e-10) return false;
        var t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom;
        var u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom;
        return t >= 0 && t <= 1 && u >= 0 && u <= 1;
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
