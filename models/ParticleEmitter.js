var ParticleEmitter = function(xPos, yPos, particleSize, lifespan, maxParticles) {
	// Default values for parameters
	lifespan = typeof lifespan !== 'undefined' ? lifespan : 0.5;
	maxParticles = typeof maxParticles !== 'undefined' ? maxParticles : 4;

	this._particles = [];
	for(var i = 0 ; i < maxParticles ; ++i)
		this._particles.push(new Particle(xPos, yPos, particleSize));
	this._particleLifespan = lifespan;
	this._nextParticleIdx = 0;
}

ParticleEmitter.prototype.Tick = function(dT) {
	for(var i = this._particles.length - 1 ; i >= 0 ; --i) {
		this._particles[i].Tick(dT);
	}
}

ParticleEmitter.prototype.SetRenderer = function(stage) {
	for(var i = 0 ; i < this._particles.length ; ++i)
		this._particles[i].SetRenderer(stage);
}

ParticleEmitter.prototype.Emit = function(xVel, yVel, color) {
	var p = this.getFreeParticle();

	if(p == null) return;

	p.Shoot(xVel, yVel, this._particleLifespan)
		.SetColor(color);
}

ParticleEmitter.prototype.getFreeParticle = function() {
	var p = this._particles[this._nextParticleIdx];
	this._nextParticleIdx = (this._nextParticleIdx + 1 ) % this._particles.length;
	return p;
}