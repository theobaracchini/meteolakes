var app = angular.module("app", []);

// Factory for a shared time index variable, so that all 
// graphs can access it
app.factory("Time", function() {

    return { 
        tIndex: 0,
        nT: 7*24*60, // number of time steps in a week
        increase: function(loop) {
            if(loop) {
                this.tIndex ++;
                if(this.tIndex >= this.nT)
                    this.tIndex = 0;
            } else
                this.tIndex = Math.min(this.nT-1, this.tIndex+1);
        },
        decrease: function() {
            this.tIndex = Math.max(0, this.tIndex-1);
        },
        recomputeTimesteps: function(interval) {
            this.nT = 7*24*60/interval;
        }
    };
})

function PrepareCanvas(containerId, aspectRatio) {
    return Prepare("canvas", containerId, aspectRatio);
}

function PrepareSvgCanvas(containerId, aspectRatio) {
    return Prepare("svg", containerId, aspectRatio);
}

function PrepareWebGLContext(containerId, interactive, aspectRatio) {
    // create an new instance of a pixi stage
    var stage = new PIXI.Stage(0xFFFFFF, interactive);

    // create a renderer instance.
    var container = d3.select(containerId);

    var dim = findDimensions(container, aspectRatio);
    var width = dim.width;
    var height = dim.height;
    var renderer = PIXI.autoDetectRenderer(width, height);

    // add the renderer view element to the DOM
    container.style("height", height).node().appendChild(renderer.view);

    return {stage:stage, renderer:renderer, width:width, height:height};
}

function Prepare(type, containerId, aspectRatio) {
    var container = d3.select(containerId);

    var dim = findDimensions(container, aspectRatio);
    container.style("height", dim.height);

    return {svg:container.append(type).attr("width", dim.width).attr("height", dim.height), width:dim.width, height:dim.height};
}

function findDimensions(container, aspectRatio) {
    var width = parseInt(container.style("width"));

    // adapt the height to fit the given width
    return {width:width, height:width/aspectRatio};
}

function zip(arrays) {
    return arrays[0].map(function(_,i){
        return arrays.map(function(array){return array[i]});
    });
}

// taken from http://www.html5gamedevs.com/topic/3114-question-about-rectangle-drawing/
var rectColorTextures = {};
function getRectTexture(color) {
    if(rectColorTextures[color] === undefined) {
        var canvas = document.createElement('canvas');
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
        var canvas = document.createElement('canvas');
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
    return {graphic:box, sprite:background};
};

function circle(x, y, radius, backgroundColor) { 
    var box = new PIXI.DisplayObjectContainer();
    var background = new PIXI.Sprite(getCircleTexture(0xFFFFFF)); //new PIXI.Sprite.fromImage("/files/content/sites/aphys/files/MeteoLac/dot.png");
    background.tint = backgroundColor;
    background.width = radius*2;
    background.height = radius*2;
    background.position.x = 0;
    background.position.y = 0;
    box.addChild(background);
    box.position.x = x - radius/2;
    box.position.y = y - radius/2;
    return {graphic:box, sprite:background};
};

/* Constructs a line from the given starting point to the given ending point.
 * Actually constructs a rectangle sprite and rotates it accordingly.
 * To Change the length of the line, change its o.graphic.width attribute.
 */
function line(x1, y1, x2, y2, height, color) {
    //var length = Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1));

    //var graphics = rectangle(x1, y1-height/2, length, height, color);
    var graphics = new PIXI.Graphics();
    graphics.beginFill(0xFF0000);
    graphics.lineStyle(height, color);

    graphics.moveTo(x1, y1);
    graphics.lineTo(x2, y2);

     // the angle in radians of the line
     var angle = Math.atan2(y2-y1, x2-x1);

     // rotate that angle
     //graphics.graphic.rotation = angle;

    return {graphic: graphics};
}

function arrow(x1, y1, dx, dy, width, color) {
    var alpha = 30*Math.PI/180.0;
    var headSize = 5;

    var norm = Math.sqrt(dx*dx + dy*dy);

    var x3 = x1 + dx - (dx*Math.cos(alpha) - dy*Math.sin(alpha))/norm*headSize;
    var y3 = y1 + dy - (dx*Math.sin(alpha) + dy*Math.cos(alpha))/norm*headSize;

    var x4 = x1 + dx - (dx*Math.cos(-alpha) - dy*Math.sin(-alpha))/norm*headSize;
    var y4 = y1 + dy - (dx*Math.sin(-alpha) + dy*Math.cos(-alpha))/norm*headSize;

    var graphicArrow = new PIXI.DisplayObjectContainer();

    graphicArrow.position.x = x1 + dx/2;
    graphicArrow.position.y = y1 + dy/2;

    // arrow head
    var head = new PIXI.Graphics();
    head.beginFill(0xFF0000);
    head.lineStyle(width, color);

    head.moveTo(graphicArrow.position.x - (x1 + dx), graphicArrow.position.y - (y1 + dy));
    head.lineTo(graphicArrow.position.x - x3, graphicArrow.position.y - y3);
    head.lineTo(graphicArrow.position.x - x4, graphicArrow.position.y - y4);
    head.endFill();
    graphicArrow.addChild(head);

    // arrow body
    var body = new PIXI.Graphics();
    body.beginFill(0xFF0000);
    body.lineStyle(width, color);

    body.moveTo(graphicArrow.position.x - x1, graphicArrow.position.y - y1);
    body.lineTo(graphicArrow.position.x - (x1 + dx), graphicArrow.position.y - (y1 + dy));
    body.endFill();
    graphicArrow.addChild(body);

     // the angle in radians of the line
     var angle = Math.atan2(dy, dx);

     // rotate that angle
     //graphicArrow.rotation = angle;

    return {graphic: graphicArrow};
}