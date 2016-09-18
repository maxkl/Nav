(function (win, doc) {
	'use strict';
	
	var VERSION = [0, 2, 0];
	var VERSION_SUFFIX = '-alpha';
	
	// TODO: zoom
	
	var DEG2RAD = Math.PI / 180;
	
	var MARKER_START = '#0af';
	var MARKER_INTERMEDIATE = '#fff';
	var MARKER_END = '#d80';
	
	var canvas = doc.getElementById('c');
	var ctx = canvas.getContext('2d');
	
	var w, h;
	var scale = 1;//50;
	var offset = [0, 0];
	var pixelRatio;
	var dirty = false;
	
	var intersections = [];
	var segments = [];
	
	var lines = [];
	//var points = [];
	
	var navPoints;
	var navPath;
	var navStats;
	
	var zoomLevel = 17;
	
	function webMercatorX(lon) {
		return (128 / Math.PI) * Math.pow(2, zoomLevel) * (lon + Math.PI);
	}
	
	function webMercatorY(lat) {
		return (128 / Math.PI) * Math.pow(2, zoomLevel) * (Math.PI - Math.log(Math.tan(Math.PI / 4 + lat / 2)));
	}	
	
	function getX(lat, lon) {
		return webMercatorX(lon * DEG2RAD);
	}
	
	function getY(lat, lon) {
		return webMercatorY(lat * DEG2RAD);
	}
	
	function Intersection(index, lat, lon) {
		this.index = index;
		this.lat = lat;
		this.lon = lon;
		
		this.x = getX(lat, lon);
		this.y = getY(lat, lon);
		
		this.segments = [];
	}
	
	function createIntersection(data, index) {
		return new Intersection(index, data[0], data[1]);
	}
	
	// TODO: use lat, lon
	function findIntersection(x, y) {
		var nearest = null;
		var nearestDist = Infinity;
		
		for(var i = 0; i < intersections.length; i++) {
			var inter = intersections[i];
			var dist = sqr(inter.x - x) + sqr(inter.y - y);
			if(dist < nearestDist) {
				nearest = inter;
				nearestDist = dist;
			}
		}
		
		return nearest;
	}
	
	function Segment(index, start, end, dir, speed, len, path) {
		this.index = index;
		this.start = start;
		this.end = end;
		this.dir = dir;
		this.speed = speed;
		this.length = len;
		
		for(var i = 0; i < path.length; i += 2) {
			var lat = path[i], lon = path[i + 1];
			path[i] = getX(lat, lon);
			path[i + 1] = getY(lat, lon);
		}
		this.path = path;
		
		/*this.x = this.start.x;
		this.y = this.start.y;*/
	}
	
	function createSegment(data, index) {
		var start = intersections[data[0]];
		var end = intersections[data[1]];
		var len = data[4];
		var seg = new Segment(index, start, end, data[2], data[3], len, data[5]);
		start.segments.push(seg);
		end.segments.push(seg);
		return seg;
	}
	
	function load(data) {
		intersections = data.intersections.map(createIntersection);
		segments = data.segments.map(createSegment);
		
		var minX = 0, minY = 0;
		for(var i = 0; i < intersections.length; i++) {
			var inter = intersections[i];
			if(i == 0 || inter.x < minX) {
				minX = inter.x;
			}
			if(i == 0 || inter.y < minY) {
				minY = inter.y;
			}
		}
		
		for(var i = 0; i < intersections.length; i++) {
			var inter = intersections[i];
			inter.x -= minX;
			inter.y -= minY;
		}
		
		for(var i = 0; i < segments.length; i++) {
			var path = segments[i].path;
			
			for(var j = 0; j < path.length; j += 2) {
				path[j] -= minX;
				path[j + 1] -= minY;
			}
		}
		
		lines = [];
		
		for(var i = 0; i < segments.length; i++) {
			var seg = segments[i];
			//var start = seg.start;
			lines.push({
				color: 'rgb(' + clamp(Math.round(255 * seg.speed / 140), 0, 255) + ',64,64)',
				path: seg.path,//.map(function (v, i) { return v + (i % 2 ? start.y : start.x); }),
				seg: seg
			});
		}
		
		offset[0] = 0;
		offset[1] = 0;
	}
	
	function compareNodes(a, b) {
		if(a.fCost < b.fCost) return -1;
		if(a.fCost > b.fCost) return 1;
		if(a.hCost < b.hCost) return -1;
		if(a.hCost > b.hCost) return 1;
		if(a.gCost < b.gCost) return -1;
		if(a.gCost > b.gCost) return 1;
		return 0;
	}
	
	function bestNode(nodes) {
		var best = null;
		var bestIndex = -1;
		
		var len = nodes.length;
		for(var i = 0; i < len; i++) {
			var node = nodes[i];
			if(!best || compareNodes(node, best) < 0) {
				best = node;
				bestIndex = i;
			}
		}
		
		return bestIndex;
	}
	
	function PathNode(inter, gCost, hCost, parent, seg) {
		this.inter = inter;
		
		this.gCost = gCost || 0;
		this.hCost = hCost || 0;
		this.fCost = this.gCost + this.hCost;
		this.parent = parent || null;
		this.segment = seg || null;
	}
	
	function findNode(nodes, inter, seg) {
		var len = nodes.length;
		for(var i = 0; i < len; i++) {
			var node = nodes[i];
			if(node.inter === inter && node.segment === seg) {
				return node;
			}
		}
		return null;
	}
	
	function makePath(node) {
		var path = [];
		
		while(node) {
			if(node.parent) {
				path.unshift(node.segment);
			}
			node = node.parent;
		}
		
		return path;
	}
	
	function calcGCost(seg) {
		return seg.length / seg.speed;
	}
	
	// TODO: use lat, lon
	function calcHCost(a, b) {
		// should calc the min g cost required
		// produces inaccurate results when there are streets with speed > 140
		return Math.sqrt(sqr(b.x - a.x) + sqr(b.y - a.y)) / 140;
	}
	
	// A*
	function findPath(start, target) {
		var open = [new PathNode(start)];
		var closed = [];
		
		var currentIndex, current, currentInter;
		while(true) {
			if(open.length == 0) {
				return null;
			}
			
			currentIndex = bestNode(open);
			current = open[currentIndex];
			currentInter = current.inter;
			open.splice(currentIndex, 1);
			closed.push(current);
			
			// TODO: extend here for other target types (e.g. cities)
			if(currentInter == target) {
				break;
			}
			
			var segs = currentInter.segments;
			for(var i = 0; i < segs.length; i++) {
				var seg = segs[i];
				var inter = seg.start == currentInter ? seg.end : seg.start;
				
				//log('seg', seg.index, 'inter', inter.index);
				
				if(findNode(closed, inter, seg)) {
					//log('already closed');
					continue;
				}
				
				var gCost = current.gCost + calcGCost(seg);
				
				var node = findNode(open, inter, seg);
				if(node) {
					//log('node + seg exists');
					if(gCost < node.gCost) {
						node.gCost = gCost;
						node.fCost = node.gCost + node.hCost;
						node.parent = current;
						node.segment = seg;
					}
				} else {
					node = new PathNode(inter, gCost, calcHCost(inter, target), current, seg);
					open.push(node);
				}
			}
		}
		
		//log(current.fCost);
		
		return makePath(current);
	}
	
	function calcStats(path) {
		var len = 0;
		var dur = 0;
		var avgSpeed = 0;
		for(var i = 0; i < path.length; i++) {
			var seg = path[i];
			len += seg.length;
			dur += seg.length / seg.speed;
			avgSpeed += seg.speed;
		}
		avgSpeed /= path.length;
		return {
			length: len,
			duration: dur,
			avgSpeed: avgSpeed
		};
	}
	
	// TODO: use lat, lon
	function doNav(points) {
		if(points.length < 2) throw new Error('min. 2 points');
		
		navPoints = points.map(function (p) {
			return {
				point: p,
				inter: findIntersection(p[0], p[1])
			};
		});
		
		var fullPath = [];
		
		for(var i = 1; i < navPoints.length; i++) {
			var inter1 = navPoints[i - 1].inter;
			var inter2 = navPoints[i].inter;
			var path = findPath(inter1, inter2);
			if(path) {
				fullPath = fullPath.concat(path);
			}
		}
		
		navPath = fullPath;
		
		navStats = calcStats(navPath);
	}
	
	function resize() {
		pixelRatio = win.devicePixelRatio || 1;
		
		w = win.innerWidth;
		h = win.innerHeight;
		canvas.width = w * pixelRatio;
		canvas.height = h * pixelRatio;
	}
	
	function drawMarker(x, y, h, c) {
		ctx.fillStyle = c;
		ctx.strokeStyle = '#000';
		ctx.lineWidth = 1 / scale;
		ctx.lineJoin = 'round';
		
		h /= scale;
		var r = h / 3;
		
		ctx.beginPath();
		ctx.moveTo(x, y);
		ctx.lineTo(x - r, y - h);
		ctx.arc(x, y - h, r, Math.PI, 0);
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
	
	function draw() {
		ctx.save();
		ctx.scale(pixelRatio, pixelRatio);
		
		ctx.clearRect(0, 0, w, h);
		
		ctx.save();
		ctx.translate(offset[0], offset[1]);
		ctx.scale(scale, scale);
		
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.lineWidth = 5 / scale;
		
		for(var i = 0; i < lines.length; i++) {
			var line = lines[i];
			ctx.strokeStyle = line.color;
			var path = line.path;
			
			var tx = path[0], ty = path[1];
			
			ctx.beginPath();
			ctx.moveTo(path[0], path[1]);
			for(var j = 2; j < path.length; j += 2) {
				tx += path[j];
				ty += path[j + 1];
				ctx.lineTo(path[j], path[j + 1]);
			}
			ctx.stroke();
			
			var seg = line.seg;
			
			ctx.save();
			ctx.setTransform(1,0,0,1,0,0);
			ctx.scale(pixelRatio, pixelRatio);
			ctx.font = '10px monospace';
			ctx.fillStyle = '#000';
			ctx.fillText('s#' + seg.index, offset[0] + (tx / path.length) * 2 * scale, offset[1] + (ty / path.length) * 2 * scale);
			ctx.restore();
		}
		
		ctx.strokeStyle = '#444';
		ctx.lineWidth = 2 / scale;
		for(var i = 0; i < intersections.length; i++) {
			var inter = intersections[i];
			ctx.beginPath();
			ctx.arc(inter.x, inter.y, 5 / scale, 0, Math.PI * 2);
			ctx.stroke();
			
			ctx.save();
			ctx.setTransform(1,0,0,1,0,0);
			ctx.scale(pixelRatio, pixelRatio);
			ctx.font = '10px monospace';
			ctx.fillStyle = '#000';
			ctx.fillText('i#' + inter.index, offset[0] + 5 + inter.x * scale, offset[1] - 5 + inter.y * scale);
			ctx.restore();
		}
		
		if(navPoints) {
			for(var i = 0; i < navPoints.length; i++) {
				var p = navPoints[i];
				
				ctx.lineCap = 'butt';
				ctx.setLineDash([4 / scale]);
				ctx.strokeStyle = '#999';
				ctx.lineWidth = 2 / scale;
			
				ctx.beginPath();
			
				ctx.moveTo(p.point[0], p.point[1]);
				ctx.lineTo(p.inter.x, p.inter.y);
			
				ctx.stroke();
				
				ctx.setLineDash([]);
				
				var color = i == 0 ? MARKER_START : i == navPoints.length - 1 ? MARKER_END : MARKER_INTERMEDIATE;
				drawMarker(p.point[0], p.point[1], 30, color);
			}
		}
		
		if(navPath) {
			ctx.strokeStyle = '#fff';
			ctx.lineWidth = 1 / scale;
			ctx.lineCap = 'round';
			
			ctx.beginPath();
			for(var i = 0; i < navPath.length; i++) {
				var seg = navPath[i];
				var path = seg.path;
				
				ctx.moveTo(seg.x + path[0], seg.y + path[1]);
				for(var j = 2; j < path.length; j += 2) {
					ctx.lineTo(seg.x + path[j], seg.y + path[j + 1]);
				}
			}
			ctx.stroke();
		}
		
		ctx.restore();
		
		ctx.restore();
		
		dirty = false;
	}
	
	function invalidate() {
		if(dirty) return;
		
		dirty = true;
		requestAnimationFrame(draw);
	}
	
	log('Nav v' + VERSION.join('.') + VERSION_SUFFIX + ', © maxkl <max@maxkl.de>, license: GPL v3');
	
	resize();
	
	//load(testData);
	
	invalidate();

	win.addEventListener('resize', function () {
		resize();
		draw();
	});
	
	var startTouch = [0, 0];
	var startOrigin = [0, 0];
	var touching = false;
	
	canvas.addEventListener('touchstart', function (evt) {
		evt.preventDefault();
		
		var touch = evt.changedTouches[0];
		startTouch[0] = touch.clientX;
		startTouch[1] = touch.clientY;
		startOrigin[0] = offset[0];
		startOrigin[1] = offset[1];
		
		touching = true;
	});
	
	win.addEventListener('touchmove', function (evt) {
		if(!touching) return;
		
		evt.preventDefault();
		
		var touch = evt.changedTouches[0];
		var diffX = touch.clientX - startTouch[0];
		var diffY = touch.clientY - startTouch[1];
		offset[0] = startOrigin[0] + diffX;
		offset[1] = startOrigin[1] + diffY;
		
		invalidate();
	});
	
	win.addEventListener('touchend', function (evt) {
		if(!touching) return;
		
		evt.preventDefault();
		
		touching = false;
	});
	
	/*doNav([[0, -1], [0, 11]]);
	//doNav([[0, -1], [5, 6], [0, 11]]);
	log('Length:', navStats.length, 'km');
	log('Duration:', formatTime(navStats.duration), '(' + navStats.duration * 60 + ')');
	log('Avg. speed:', navStats.avgSpeed, 'km/h'),
	invalidate();*/
	
	win.loadMapData = function (data) {
		load(data);
		invalidate();
	};
	
})(window, document);

