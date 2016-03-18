'use strict';

if (typeof module !== 'undefined') module.exports = simpleheat;

function simpleheat(canvas) {
    if (!(this instanceof simpleheat)) return new simpleheat(canvas);

    this._canvas = canvas = typeof canvas === 'string' ? document.getElementById(canvas) : canvas;

    this._ctx = canvas.getContext('2d');
    this._width = canvas.width;
    this._height = canvas.height;

    this._data = [];
}

simpleheat.prototype = {

    data: function (data) {
        this._data = data;
        return this;
    },

    add: function (point) {
        this._data.push(point);
        return this;
    },

    clear: function () {
        this._data = [];
        return this;
    },

    resize: function () {
        this._width = this._canvas.width;
        this._height = this._canvas.height;
    },

    draw: function (colorFunction, p, step) {
        var ctx = this._ctx;

        ctx.clearRect(0, 0, this._width, this._height);

        for (var i = 0; i < this._data.length - 1; i++) {
            var row = this._data[i];
            var nextRow = this._data[i + 1];
            for (var j = 0; j < row.length - 1; j++) {
                if (row[j] && row[j + 1] && nextRow[j] && nextRow[j + 1]) {
                    // TODO correct 1/2 cell shift
                    var topLeftValue = row[j].values[step];

                    var p00 = p(row[j]);
                    var p01 = p(row[j + 1]);
                    var p10 = p(nextRow[j]);
                    var p11 = p(nextRow[j + 1]);
                    ctx.fillStyle = this._withAlpha(colorFunction(topLeftValue), 0.8);
                    ctx.beginPath();
                    ctx.moveTo(p00.x, p00.y);
                    ctx.lineTo(p01.x, p01.y);
                    ctx.lineTo(p11.x, p11.y);
                    ctx.lineTo(p10.x, p10.y);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }
/*
        for (var i = 0, len = this._data.length, p; i < len; i++) {
            p = this._data[i];
            var color = (colorFunction !== undefined) ? colorFunction(p[2]) : 'green';
            this._drawCircle(p[0], p[1], 5, color);
        }

        var colored = ctx.getImageData(0, 0, this._width, this._height);
        var pixels = colored.data;
        for (var i = 0, len = pixels.length, j; i < len; i += 4) {
            if (pixels[i + 3]) {
                pixels[i + 3] = 255;
            }
        }
        ctx.putImageData(colored, 0, 0);
        */

        return this;
    },

    _withAlpha: function(color, alpha) {
        var r = parseInt('0x' + color.substring(1, 3));
        var g = parseInt('0x' + color.substring(3, 5));
        var b = parseInt('0x' + color.substring(5, 7));
        return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
    },

    _drawCircle: function (x, y, r, color) {
        var ctx = this._ctx;

        var cr = parseInt('0x' + color.substring(1, 3));
        var cg = parseInt('0x' + color.substring(3, 5));
        var cb = parseInt('0x' + color.substring(5, 7));
        ctx.beginPath();
        ctx.arc(x, y, 2 * r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = 'rgba(' + cr + ', ' + cg + ', ' + cb + ', 0.2)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, 2 * Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    }
};
