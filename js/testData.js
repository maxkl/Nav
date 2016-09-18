(function (global) {
	'use strict';
	
	// [x, y]
	var intersections = [	
		[0, 0],
		[0, 10],
		//[3, 2],
		//[4, 6],
		//[-2, 5],
		//[3, 5]
	];
	
	// [start, end, dir, speed, length, path]
	var segments = [
		[0, 1, 0, 50, null, [0, 0, 3, 5, 0, 10]],
		//[5, 1, 0, 50],
		
		[0, 1, 0, 50, null, [0, 0, -2, 5, 0, 10]],
		//[4, 1, 0, 50],
		
		[0, 1, 0, 130, null, [0, 0, 3, 2, 4, 6, 0, 10]],
		//[2, 3, 0, 130],
		//[3, 1, 0, 130]
	];
	
	function sqr(v) {
		return v * v;
	}
	
	function calcLen(path) {
		var len = 0;
		for(var i = 2; i < path.length; i += 2) {
			len += Math.sqrt(sqr(path[i] - path[i - 2]) + sqr(path[i + 1] - path[i - 1]));
		}
		return len;
	}
	
	for(var i = 0; i < segments.length; i++) {
		var seg = segments[i];
		
		for(var n = 5 - seg.length; n >= 0; n--) {
			seg.push(null);
		}
		
		// Path
		if(seg[5] === null) {
			var start = intersections[seg[0]];
			var end = intersections[seg[1]];
			seg[5] = [
				0, 0,
				end[0] - start[0], end[1] - start[1]
			];
		}
		
		// Length
		if(seg[4] === null) {
			seg[4] = calcLen(seg[5]);
		}
	}
	
	var data = {
		intersections: intersections,
		segments: segments
	};
	
	if(typeof module === 'object' && Object.prototype.hasOwnProperty.call(module, 'exports')) {
		module.exports = exports = data;
	} else {
		global.testData = data;
	}
})(this);
