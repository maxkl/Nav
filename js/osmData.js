(function (window, document) {
	'use strict';

	var serverUrl = 'http://overpass-api.de/api/interpreter';

	var highwaySpeeds = {
		'motorway': 130, 
		'motorway_link': 100,
		'trunk': 100, 
		'trunk_link': 60,
		'primary': 70, 
		'primary_link': 60,
		'secondary': 70,
		'secondary_link': 50,
		'tertiary': 70,
		'tertiary_link': 50,
		'unclassified': 50,
		'unclassified_link': 50,
		'residential': 30,
		'residential_link': 30,
		'service': 30,
		'service_link': 30,
		'living_street': 7,
		//'track': 30
	};
	var highwayTypes = Object.keys(highwaySpeeds);
	
	function httpGet(url, cb) {
		var req = new XMLHttpRequest();

		req.addEventListener('load', function () {
				if(req.status == 200) {
					cb(null, req.responseText);
				} else {
					cb(new Error('Server error: ' + req.status));
				}
			});

		req.addEventListener('error', function () {
				cb(new Error('Network/Client error'));
			});

		req.open('GET', url);
		req.send();
	}

	function getJson(url, cb) {
		httpGet(url, function (err, data) {
				if(!err) {
					data = JSON.parse(data);
				}

				cb(err, data);
			});
	}

	function queryUrl(q) {
		return serverUrl + '?data=' + encodeURIComponent(q);
	}

	function apiRequest(q, cb) {
		getJson(queryUrl('[out:json];' + q), cb);
	}

	function OsmNode(id, lat, lon, tags) {
		this.id = id;
		this.lat = lat;
		this.lon = lon;
		this.tags = tags || {};

		this.ways = [];
		this.intersection = null;
	}

	function OsmWay(id, nodesIds, tags) {
		this.id = id;
		this.nodesIds = nodesIds;
		this.tags = tags || {};

		this.nodes = [];
	}
	
	function guessMaxspeed(h) {
		return highwaySpeeds.hasOwnProperty(h) ? highwaySpeeds[h] : 0;
	}
	
	function sqr(v) {
		return v * v;
	}
	
	var earthRadius = 6371.0088;
	var doubleEarthRadius = earthRadius * 2;
	
	var asin = Math.asin;
	var sqrt = Math.sqrt;
	var cos = Math.cos;
	var sin = Math.sin;
	var sin2 = function (v) { return sqr(sin(v)); };
	function havDist(lat1, lon1, lat2, lon2) {
		return doubleEarthRadius * asin(sqrt(sin2((lat2 - lat1) / 2) + cos(lat1) * cos(lat2) * sin2((lon2 - lon1) / 2)));
	}

	function compileData(data) {
		var elements = data.elements;

		var nodes = [];
		var nodesMap = new Map();
		var ways = [];

		for(var i = 0; i < elements.length; i++) {
			var el = elements[i];

			if(el.type === 'node') {
				var node = new OsmNode(el.id, el.lat, el.lon, el.tags);
				nodes.push(node);
				nodesMap.set(node.id, node);
			} else if(el.type === 'way') {
				var way = new OsmWay(el.id, el.nodes, el.tags);
				ways.push(way);
			}
		}

		for(var i = 0; i < ways.length; i++) {
			var way = ways[i];
			var wayNodesIds = way.nodesIds;
			var wayNodes = way.nodes;

			for(var j = 0; j < wayNodesIds.length; j++) {
				var nodeId = wayNodesIds[j];

				if(nodesMap.has(nodeId)) {
					var node = nodesMap.get(nodeId);

					node.ways.push(way);
					wayNodes.push(node);
				} else {
					loge('referenced node does not exist in data');
				}
			}

			// gc
			way.nodesIds = null;
		}

		// gc
		nodesMap = null;

		var segs = [];
		var inters = [];

		for(var i = 0; i < ways.length; i++) {
			var way = ways[i];
			var wayNodes = way.nodes;

			var segLen = 0;

			var start = 0;
			var end = 0;
			var dir = 0;
			var speed = way.tags.maxspeed || guessMaxspeed(way.tags.highway);
			var length = 0;
			var path = null;

			//var startLat, startLon;
			// TODO: length of segs
			var lastLat, lastLon;

			var node, lat, lon;
			for(var j = 0; j < wayNodes.length; j++) {
				node = wayNodes[j];
				lastLat = lat;
				lastLon = lon;
				lat = node.lat;
				lon = node.lon;

				if(j == 0) {
					//startLat = node.lat;
					//startLon = node.lon;

					segLen = 1;

					path = [lat, lon];
					var index;
					if(node.intersection === null) {
						index = inters.push([lat, lon]) - 1;
						node.intersection = index;
					} else {
						index = node.intersection;
					}
					start = index;
					//end = 0;
					dir = 0;
					//speed = node.tags.maxspeed || 0;
					length = 0;
				} else {
					if(node.ways.length > 1) {
						var index;
						if(node.intersection === null) {
							index = inters.push([lat, lon]) - 1;
							node.intersection = index;
						} else {
							index = node.intersection;
						}
						path.push(lat, lon);
						length += havDist(lastLat, lastLon, lat, lon);
						end = index;
						segs.push([
							start,
							end,
							dir,
							speed,
							length,
							path
						]);

						segLen = 1;

						//startLat = node.lat;
						//startLon = node.lon;
						path = [node.lat, node.lon];
						start = end;
						//end = 0;
						dir = 0;
						//speed = 50;
						length = 0;
					} else if(node.ways.length == 1) {
						path.push(node.lat, node.lon);
						//length += ; // TODO
						length += havDist(lastLat, lastLon, lat, lon);
						segLen++;
					} else {
						loge('node has 0 refs');
					}
				}
			}

			if(segLen > 1) {
				var index;
				if(node.intersection === null) {
					index = inters.push([lat, lon]) - 1;
					node.intersection = index;
				} else {
					index = node.intersection;
				}
				path.push(lat, lon);
				length += havDist(lastLat, lastLon, lat, lon);
				end = index;
				segs.push([
					start,
					end,
					dir,
					speed,
					length,
					path
				]);
			}
		}

		return {
			intersections: inters,
			segments: segs
		};
	}
	
	var highwayTypes = [
		'motorway', 'motorway_link',
		'trunk', 'trunk_link',
		'primary', 'primary_link',
		'secondary', 'secondary_link',
		'tertiary', 'tertiary_link',
		'unclassified', 'unclassified_link',
		'residential', 'residential_link',
		'service', 'service_link',
		'living_street',
		'track'
	];

	var filters = '["highway"~"' + highwayTypes.join('|') + '"]';

	// 48.7116166,9.0009532,48.7128374,9.0060248
	var bbox = [48.7029243, 9.0054068, 48.7204826, 9.0080652];
	
	var query = 'way(' + bbox.join(',') + ')' + filters + ';(._;>;);out;';

	log('starting loading of OSM data');
	
	apiRequest(query, function (err, data) {
			if(err) {
				loge('OSM API request failed: ' + err.message);
				return;
			}
			
			log('OSM data received');

			var compiled = compileData(data);
			
			log('OSM data compiled');

			loadMapData(compiled);
			
			log('OSM data loaded');
		});

})(window, document);

