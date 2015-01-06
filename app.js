var app = angular.module("app", [])

// Factory for a shared time index variable, so that all 
// graphs can access it
app.factory("Time", function() {

    return { 
        tIndex: 0,
        nT: 24*7/3, // number of time steps in a week  
        increase: function(loop) {
            if(loop) {
                this.tIndex ++
                if(this.tIndex >= this.nT)
                    this.tIndex = 0
            } else
                this.tIndex = Math.min(this.nT-1, this.tIndex+1)
        },
        decrease: function() {
            this.tIndex = Math.max(0, this.tIndex-1)
        }

    }
})

function PrepareCanvas(containerId, aspectRatio) {
	return Prepare("canvas", containerId, aspectRatio)
}

function PrepareSvgCanvas(containerId, aspectRatio) {
	return Prepare("svg", containerId, aspectRatio)
}

function PrepareWebGLContext(containerId, interactive, aspectRatio) {
    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(0xFFFFFF, interactive);

    // create a renderer instance.
    var container = d3.select(containerId)

    var dim = findDimensions(container, 2)
    var width = dim.width
    var height = dim.height
    var renderer = PIXI.autoDetectRenderer(width, height);

    // add the renderer view element to the DOM
    container.style("height", height).node().appendChild(renderer.view);

    return {stage:stage, renderer:renderer, width:width, height:height}
}

function Prepare(type, containerId, aspectRatio) {
	var container = d3.select(containerId)

    var dim = findDimensions(container, aspectRatio)
    container.style("height", dim.height)

	return {svg:container.append(type).attr("width", dim.width).attr("height", dim.height), width:dim.width, height:dim.height}
}

function findDimensions(container, aspectRatio) {
	var width = parseInt(container.style("width"))
	//var height = parseInt(container.style("height"))

    // adapt the height to fit the given width
    return {width:width, height:width/aspectRatio}

 //    if(aspectRatio == undefined)
 //        return {width:width, height:height}

	// if(width < height) {
	// 	// compute the desired height
	// 	var preferredHeight = width/aspectRatio
	// 	if(preferredHeight > height)
	// 		// keep the height, reduce the width
	// 		width = height*aspectRatio
	// 	else
	// 		height = preferredHeight
	// } else {
	// 	// adapt width
	// 	var preferredWidth = height*aspectRatio
	// 	if(preferredWidth > width)
	// 		// keep the width, reduce the height
	// 		height = width/aspectRatio
	// 	else
	// 		width = preferredWidth
	// }	
	return {width:width, height:height}
}

function zip(arrays) {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]})
    });
}

// taken from http://www.html5gamedevs.com/topic/3114-question-about-rectangle-drawing/
function rectangle(x, y, width, height, backgroundColor) { 
    var box = new PIXI.DisplayObjectContainer();
    var background = new PIXI.Sprite(getRectTexture(0xFFFFFF));
    background.tint = backgroundColor;
    background.width = width;
    background.height = height;
    background.position.x = 0;
    background.position.y = 0;
    box.addChild(background);
    box.position.x = x;
    box.position.y = y;
    return {graphic:box, sprite:background}
};

function circle(x, y, radius, backgroundColor) { 
    var box = new PIXI.DisplayObjectContainer();
    var background = new PIXI.Sprite(getCircleTexture(0xFFFFFF));
    background.tint = backgroundColor;
    background.width = radius*2;
    background.height = radius*2;
    background.position.x = 0;
    background.position.y = 0;
    box.addChild(background);
    box.position.x = x - radius/2;
    box.position.y = y - radius/2;
    return {graphic:box, sprite:background}
};

var rectColorTextures = {};
function getRectTexture(color) {
    if(rectColorTextures[color] === undefined) {
        var canvas = document.createElement('canvas')
        canvas.width = 1;
        canvas.height = 1;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + color.toString(16);
        ctx.beginPath();
        ctx.rect(0,0,1,1);
        ctx.fill();
        ctx.closePath();
        rectColorTextures[color] = PIXI.Texture.fromCanvas(canvas);
    }
    return rectColorTextures[color];
};

var circleColorTextures = {};
function getCircleTexture(color) {
    if(circleColorTextures[color] === undefined) {
        var canvas = document.createElement('canvas')
        canvas.width = 1;
        canvas.height = 1;
        ctx = canvas.getContext('2d');
        ctx.fillStyle = '#' + color.toString(16);
        ctx.beginPath();
        ctx.arc(0,0,1,0, 2*Math.PI);
        ctx.fill();
        ctx.closePath();
        circleColorTextures[color] = PIXI.Texture.fromCanvas(canvas);
    }
    return circleColorTextures[color];
};