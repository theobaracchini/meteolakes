var Particle = function(xOrigin, yOrigin, particleSize) {
	this.lifespan = 0;
	this._graphic = circle(xOrigin, yOrigin, particleSize, 0x0);
	this._origin = {x:xOrigin, y:yOrigin};
}

Particle.prototype.Tick = function(dT) {
	if(this.lifespan <= 0) {
		this.lifespan = 0;
		return;
	}

	this.lifespan -= dT;

	// Hide the particle if it is asleep
	this._graphic.sprite.visible = this.lifespan > 0;

	if(this.opacityAxis)
		this._graphic.sprite.alpha = this.opacityAxis(this.lifespan);

	this.move(this._xVel*dT, this._yVel*dT);
}

Particle.prototype.Shoot = function(xVel, yVel, lifespan) {
	this.lifespan = lifespan;
	this._xVel = xVel;
	this._yVel = yVel;
	this._graphic.graphic.position.x = this._origin.x;
	this._graphic.graphic.position.y = this._origin.y;

	if(!this.opacityAxis)
		this.opacityAxis = d3.scale.linear().domain([0, lifespan]).range([0, 1]);

	return this;
}

Particle.prototype.SetRenderer = function(stage) {
    stage.addChild(this._graphic.graphic);

    return this;
}

Particle.prototype.EnableInteractivity = function(mousedown, mouseover, mouseup) {
    this._graphic.sprite.interactive = true;
    this._graphic.sprite.mousedown = mousedown;
    this._graphic.sprite.mouseover = mouseover;
    this._graphic.sprite.mouseup = mouseup;
}

Particle.prototype.SetColor = function(color) {
	this._graphic.sprite.tint = color;

	return this;
}

Particle.prototype.move = function(dX, dY) {
	this._graphic.graphic.position.x += dX;
	this._graphic.graphic.position.y += dY;

	return this;
}