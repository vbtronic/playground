var AI = (function () {
    'use strict';

    var cfg = DATA.config;

    function AIDriver(car, difficulty) {
        this.car = car;
        this.difficulty = difficulty || 'medium';
        this.lookAhead = 0.04;
        this.wanderOffset = 0;
        this.wanderTimer = 0;
        this.stuckTimer = 0;
        this.targetSpeed = this._getTargetSpeed();
    }

    AIDriver.prototype._getTargetSpeed = function () {
        switch (this.difficulty) {
            case 'easy': return cfg.maxSpeed * cfg.aiSpeedEasy;
            case 'hard': return cfg.maxSpeed * cfg.aiSpeedHard;
            default: return cfg.maxSpeed * cfg.aiSpeedMedium;
        }
    };

    AIDriver.prototype.update = function (dt) {
        var car = this.car;
        if (car.finished) {
            car.input = { accelerate: false, brake: false, steerLeft: false, steerRight: false };
            return;
        }

        // Find current position on track
        var currentT = TRACK.getNearestT(car.x, car.z);

        // Wander offset variation
        this.wanderTimer += dt;
        if (this.wanderTimer > 2 + Math.random() * 2) {
            this.wanderTimer = 0;
            this.wanderOffset = (Math.random() - 0.5) * cfg.aiWander * TRACK.trackWidth;
        }

        // Look ahead target
        var targetT = (currentT + this.lookAhead) % 1;
        var target = TRACK.getPointAtT(targetT);
        var normal = TRACK.getNormal(targetT);

        // Apply wander offset
        var targetX = target.x + normal.x * this.wanderOffset;
        var targetZ = target.z + normal.z * this.wanderOffset;

        // Angle to target
        var dx = targetX - car.x;
        var dz = targetZ - car.z;
        var targetAngle = Math.atan2(dx, dz);

        // Angle difference
        var angleDiff = targetAngle - car.angle;
        // Normalize to -PI..PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Steer
        var steerThreshold = 0.05;
        car.input.steerLeft = angleDiff > steerThreshold;
        car.input.steerRight = angleDiff < -steerThreshold;

        // Speed control - brake for sharp curves
        var aheadT = (currentT + this.lookAhead * 3) % 1;
        var tan1 = TRACK.getTangent(currentT);
        var tan2 = TRACK.getTangent(aheadT);
        var curvature = 1 - (tan1.x * tan2.x + tan1.z * tan2.z); // 0 = straight, ~2 = U-turn

        var desiredSpeed = this.targetSpeed;
        if (curvature > 0.05) {
            desiredSpeed *= Math.max(0.4, 1 - curvature * 3);
        }

        car.input.accelerate = car.speed < desiredSpeed;
        car.input.brake = car.speed > desiredSpeed * 1.2;

        // Stuck detection
        if (Math.abs(car.speed) < 0.02) {
            this.stuckTimer += dt;
            if (this.stuckTimer > 2) {
                // Teleport back to track
                var nearest = TRACK.getPointAtT(currentT);
                var tan = TRACK.getTangent(currentT);
                car.x = nearest.x;
                car.z = nearest.z;
                car.angle = Math.atan2(tan.x, tan.z);
                car.speed = 0.3;
                car.vx = 0;
                car.vz = 0;
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
        }
    };

    return { AIDriver: AIDriver };
})();
