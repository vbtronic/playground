var Car = (function () {
    'use strict';

    var cfg = DATA.config;

    function CarObj(options) {
        this.x = options.x || 0;
        this.z = options.z || 0;
        this.angle = options.angle || 0;
        this.speed = 0;
        this.vx = 0;
        this.vz = 0;

        this.isPlayer = options.isPlayer || false;
        this.color = options.color || '#e53935';
        this.name = options.name || 'Car';
        this.index = options.index || 0;

        // Lap tracking
        this.lap = 0;
        this.nextCheckpoint = 1; // start at 1 since cars start at checkpoint 0
        this.lapTimes = [];
        this.lapStartTime = 0;
        this.finished = false;
        this.finishTime = 0;
        this.raceProgress = 0;
        this.parked = false;
        this.parkingIndex = undefined;

        // Previous position for checkpoint detection
        this.prevX = this.x;
        this.prevZ = this.z;

        // Input state
        this.input = {
            accelerate: false,
            brake: false,
            steerLeft: false,
            steerRight: false
        };

        this.onTrack = true;
        this.mesh = this._createMesh();
        this._updateMesh();
    }

    CarObj.prototype._createMesh = function () {
        var group = new THREE.Group();
        var color = new THREE.Color(this.color);

        // Body
        var bodyGeo = new THREE.BoxGeometry(2.2, 0.55, 4.2);
        var bodyMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.3
        });
        var body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.45;
        body.castShadow = true;
        group.add(body);

        // Cabin
        var cabinGeo = new THREE.BoxGeometry(1.8, 0.4, 1.8);
        var cabinMat = new THREE.MeshStandardMaterial({
            color: 0x222222,
            roughness: 0.2,
            metalness: 0.5
        });
        var cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.y = 0.92;
        cabin.position.z = -0.3;
        cabin.castShadow = true;
        group.add(cabin);

        // Wheels
        var wheelGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.25, 8);
        var wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
        var wheelPositions = [
            [-1.1, 0.32, 1.3],
            [1.1, 0.32, 1.3],
            [-1.1, 0.32, -1.3],
            [1.1, 0.32, -1.3]
        ];

        for (var i = 0; i < wheelPositions.length; i++) {
            var wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.rotation.z = Math.PI / 2;
            wheel.position.set(wheelPositions[i][0], wheelPositions[i][1], wheelPositions[i][2]);
            wheel.castShadow = true;
            group.add(wheel);
        }

        // Headlights
        var lightGeo = new THREE.SphereGeometry(0.15, 6, 6);
        var headMat = new THREE.MeshStandardMaterial({
            color: 0xffffee,
            emissive: 0xffffaa,
            emissiveIntensity: 0.5,
            roughness: 0.2
        });
        var hl1 = new THREE.Mesh(lightGeo, headMat);
        hl1.position.set(-0.7, 0.45, 2.1);
        group.add(hl1);
        var hl2 = new THREE.Mesh(lightGeo, headMat);
        hl2.position.set(0.7, 0.45, 2.1);
        group.add(hl2);

        // Taillights
        var tailMat = new THREE.MeshStandardMaterial({
            color: 0xff2222,
            emissive: 0xff0000,
            emissiveIntensity: 0.4,
            roughness: 0.3
        });
        var tl1 = new THREE.Mesh(lightGeo, tailMat);
        tl1.position.set(-0.7, 0.45, -2.1);
        group.add(tl1);
        var tl2 = new THREE.Mesh(lightGeo, tailMat);
        tl2.position.set(0.7, 0.45, -2.1);
        group.add(tl2);

        return group;
    };

    CarObj.prototype._updateMesh = function () {
        this.mesh.position.set(this.x, 0, this.z);
        this.mesh.rotation.y = this.angle;
    };

    CarObj.prototype.update = function (dt) {
        var inp = this.input;
        var accel = 0;
        // Normalize to 60fps baseline so physics is frame-rate independent
        var s = dt * 60;

        if (inp.accelerate) accel = cfg.acceleration;
        if (inp.brake) accel = -cfg.brakeForce;

        // Apply acceleration
        this.speed += accel * s;

        // Friction
        this.speed *= Math.pow(1 - cfg.friction, s);

        // Track boundary check is done after position update below
        this.onTrack = true;

        // Clamp speed
        if (this.speed > cfg.maxSpeed) this.speed = cfg.maxSpeed;
        if (this.speed < -cfg.reverseMax) this.speed = -cfg.reverseMax;

        // Steering (only when moving)
        if (Math.abs(this.speed) > 0.01) {
            var steer = 0;
            if (inp.steerLeft) steer = 1;
            if (inp.steerRight) steer = -1;

            var speedFactor = Math.min(Math.abs(this.speed) / cfg.maxSpeed, 1);
            var turnAmount = steer * cfg.turnSpeed * (0.4 + 0.6 * speedFactor);
            if (this.speed < 0) turnAmount = -turnAmount;
            this.angle += turnAmount * s;
        }

        // Forward direction velocity
        var forwardVx = Math.sin(this.angle) * this.speed;
        var forwardVz = Math.cos(this.angle) * this.speed;

        // Drift: blend between current velocity and forward direction
        var blend = 1 - Math.pow(1 - cfg.driftFactor, s);
        this.vx = this.vx * (1 - blend) + forwardVx * blend;
        this.vz = this.vz * (1 - blend) + forwardVz * blend;

        // Store previous position (for checkpoint detection)
        this.prevX = this.x;
        this.prevZ = this.z;

        // Update position
        this.x += this.vx * s;
        this.z += this.vz * s;

        // Update mesh (barrier is applied separately AFTER checkpoints)
        this._updateMesh();
    };

    CarObj.prototype.applyBarrier = function () {
        if (this.finished) return;

        var nearT = TRACK.getNearestT(this.x, this.z);
        var center = TRACK.getPointAtT(nearT);
        var edgeDx = this.x - center.x;
        var edgeDz = this.z - center.z;
        var edgeDist = Math.sqrt(edgeDx * edgeDx + edgeDz * edgeDz);
        this.onTrack = edgeDist <= TRACK.trackWidth;

        var barrierDist = TRACK.trackWidth + 1.5;
        if (edgeDist > barrierDist && edgeDist > 0.1) {
            var pushDist = TRACK.trackWidth + 1.3;
            this.x = center.x + (edgeDx / edgeDist) * pushDist;
            this.z = center.z + (edgeDz / edgeDist) * pushDist;

            var wallNx = edgeDx / edgeDist;
            var wallNz = edgeDz / edgeDist;
            var dot = this.vx * wallNx + this.vz * wallNz;
            if (dot > 0) {
                this.vx -= 1.3 * dot * wallNx;
                this.vz -= 1.3 * dot * wallNz;
                var impactSpeed = Math.abs(dot);
                var energyLoss = Math.min(0.4, 0.1 + impactSpeed * 0.3);
                this.speed *= (1 - energyLoss);
            } else {
                this.speed *= 0.95;
            }
            this._updateMesh();
        }
    };

    CarObj.prototype.getDisplaySpeed = function () {
        var v = Math.sqrt(this.vx * this.vx + this.vz * this.vz);
        return Math.round(v * 120); // scale to km/h-ish
    };

    CarObj.prototype.reset = function (x, z, angle) {
        this.x = x;
        this.z = z;
        this.angle = angle;
        this.speed = 0;
        this.vx = 0;
        this.vz = 0;
        this.lap = 0;
        this.nextCheckpoint = 1;
        this.lapTimes = [];
        this.lapStartTime = 0;
        this.finished = false;
        this.finishTime = 0;
        this.raceProgress = 0;
        this.parked = false;
        this.parkingIndex = undefined;
        this.prevX = x;
        this.prevZ = z;
        this.input = { accelerate: false, brake: false, steerLeft: false, steerRight: false };
        this._updateMesh();
    };

    return CarObj;
})();
