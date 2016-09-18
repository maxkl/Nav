(function (win, doc) {
	'use strict';
	
	// TODO: events (resize, )
	
	var TWO_PI = Math.PI * 2;
	var DEG2RAD = Math.PI / 180;
	var RAD2DEG = 180 / Math.PI;
	
	var defaultOptions = {
		setup: null,
		draw: null,
		
		canvas: null,
		container: null,
		
		type: '2d',
		loop: true,
		highRes: true,
		fillContainer: false
	};
	
	function Cl(options) {
		var opts = Object.assign({}, defaultOptions, options);
		
		this._userSetup = opts.setup;
		this._userDraw = opts.draw;
		
		this._canvas = opts.canvas;
		this._container = opts.container;
		
		this._ctxType = opts.type;
		this._ctx = null;
		
		this._loop = opts.loop;
		this._highRes = opts.highRes;
		this._fillContainer = opts.fillContainer;
		
		this._initialized = false;
		this._animFrame = null;
		this._lastTimestamp = 0;
		this._invalidated = false;
		
		this._pixelRatio = 1;
		
		this.width = 0;
		this.height = 0;
		
		var self = this;
		
		this._boundDraw = function (t) {
			self._draw(t);
		};
	}
	
	Cl.prototype._setup = function () {
		if(this._userSetup) {
			this._userSetup(this._canvas, this._ctx);
		}
	};
	
	Cl.prototype._draw = function (timestamp) {
		if(this._loop) {
			this._animFrame = win.requestAnimationFrame(this._boundDraw);
		} else {
			this._animFrame = null;
		}
		
		var deltaTime = this._lastTimestamp ? (timestamp - this._lastTimestamp) * 0.001 : 0;
		this._lastTimestamp = timestamp;
		
		var ctx = this._ctx;
		
		var highRes = this._highRes;
		if(highRes) {
			ctx.save();
			ctx.scale(this._pixelRatio, this._pixelRatio);
		}
		
		if(this._userDraw) {
			this._userDraw(this._canvas, ctx, deltaTime);
		}
		
		if(highRes) {
			ctx.restore();
		}
	};
	
	Cl.prototype.init = function () {
		if(this._initialized) return;
		
		var self = this;
		
		if(this._canvas) {
			this._container = this._canvas.parentNode;
		} else {
			var canvas = doc.createElement('canvas');
			this._canvas = canvas;
			
			if(!this._container) {
				this._container = doc.body;
			}
			
			this._container.appendChild(canvas);
		}
		
		var canvas = this._canvas;
		
		if(!canvas.getContext) {
			throw new Error('Canvas not supported');
		}
		
		this._ctx = canvas.getContext(this._ctxType);
		if(!this._ctx) {
			throw new Error('Canvas context type \'' + this._ctxType + '\' not supported');
		}
		
		if(this._fillContainer) {
			canvas.style.display = 'block';
			canvas.style.width = '100%';
			canvas.style.height = '100%';
			
			this.resize();
			
			var boundResize = function () {
				self.resize();
			};
			
			var resizeTimeout;
			win.addEventListener('resize', function () {
				clearTimeout(resizeTimeout);
				resizeTimeout = setTimeout(boundResize, 50);
			});
		} else {
			this.resize(canvas.width, canvas.height);
		}
		
		this._initialized = true;
		
		this._setup();
		
		this.invalidate();
	};
	
	Cl.prototype.resize = function (w, h) {
		var pixelRatio = win.devicePixelRatio || 1;
		this._pixelRatio = pixelRatio;
		
		var canvas = this._canvas;
		
		if(this._fillContainer) {
			w = Math.round(this._container.offsetWidth);
			h = Math.round(this._container.offsetHeight);
		} else {
			canvas.style.width = w + 'px';
			canvas.style.height = h + 'px';
		}
		
		if(this._highRes) {
			canvas.width = w * pixelRatio;
			canvas.height = h * pixelRatio;
		} else {
			canvas.width = w;
			canvas.height = h;
		}
		
		this.width = w;
		this.height = h;
		
		this.invalidate();
	};
	
	Cl.prototype.invalidate = function () {
		if(!this._animFrame) {
			this._animFrame = win.requestAnimationFrame(this._boundDraw);
		}
	};
	
	function cl(opts) {
		var inst = new Cl(opts);
		
		setTimeout(function () {
			inst.init();
		}, 0);
		
		return inst;
	}
	
	cl.TWO_PI = TWO_PI;
	cl.DEG2RAD = DEG2RAD;
	cl.RAD2DEG = RAD2DEG;
	
	win.cl = cl;
	
})(window, document);

