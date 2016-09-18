(function (win, doc) {
	'use strict';
	
	var c;
	
	var drawQueue = [];
	var drawn = [];
	var lastPt = null;
	
	function cleanPath() {
		var acc = 0;
	}
	
	function setup(canvas, ctx) {
		canvas.addEventListener('touchstart', function (evt) {
			evt.preventDefault();
			
			var touch = evt.changedTouches[0];
			
			var x = touch.clientX;
			var y = touch.clientY;
			
			drawQueue.push([x, y, true]);
			
			c.invalidate();
		});
		
		canvas.addEventListener('touchmove', function (evt) {
			evt.preventDefault();
			
			var touch = evt.changedTouches[0];
			
			var x = touch.clientX;
			var y = touch.clientY;
			
			drawQueue.push([x, y, false]);
			
			c.invalidate();
		});
		
		canvas.addEventListener('touchend', function (evt) {
			evt.preventDefault();
			
			cleanPath();
		});
	}
	
	function draw(canvas, ctx) {
		ctx.strokeStyle = '#f00';
		ctx.lineWidth = 2;
		ctx.lineCap = 'round';
		
		var pt;
		while(pt = drawQueue.shift()) {
			drawn.push(pt);
			
			if(pt[2]) {
				lastPt = null;
				drawn.length = 0;
				ctx.clearRect(0, 0, c.width, c.height);
			} else {
				if(lastPt) {
					ctx.beginPath();
					ctx.moveTo(lastPt[0], lastPt[1]);
					ctx.lineTo(pt[0], pt[1]);
					ctx.stroke();
				}
				
				lastPt = pt;
			}
		}
	}
	
	var opts = {
		setup: setup,
		draw: draw,
		
		loop: false,
		fillContainer: true
	};
	
	// don't run in in-app browser
	if(navigator.language != 'de-DE') {
		c = cl(opts);
	}
	
})(window, document);

