var serverUrl = 'http://overpass-api.de/api/interpreter';

var outElem = document.getElementById('out');

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
	this.tags = tags;
	
	this.ways = [];
	this.intersection = null;
}

function OsmWay(id, nodesIds, tags) {
	this.id = id;
	this.nodesIds = nodesIds;
	this.tags = tags;
	
	this.nodes = [];
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
		var speed = 0;
		var length = 0;
		var path = null;
		
		var startLat, startLon;
		
		var node;
		for(var j = 0; j < wayNodes.length; j++) {
			node = wayNodes[j];
			
			if(j == 0) {
				startLat = node.lat;
				startLon = node.lon;
				
				segLen = 1;
				
				path = [0, 0];
				var index;
				if(node.intersection === null) {
					index = inters.push([ node.lat, node.lon ]) - 1;
					node.intersection = index;
				} else {
					index = node.intersection;
				}
				start = index;
				//end = 0;
				dir = 0;
				speed = 50;
				length = 0;
			} else {
				if(node.ways.length > 1) {
					var index;
					if(node.intersection === null) {
						index = inters.push([ node.lat, node.lon ]) - 1;
						node.intersection = index;
					} else {
						index = node.intersection;
					}
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
					
					startLat = node.lat;
					startLon = node.lon;
					path = [0, 0];
					start = end;
					//end = 0;
					dir = 0;
					speed = 50;
					length = 0;
				} else if(node.ways.length == 1) {
					path.push(node.lat - startLat);
					path.push(node.lon - startLon);
					segLen++;
				} else {
					loge('node has 0 refs');
				}
			}
		}
		
		// TODO: make seg out of potential leftovers
		if(segLen > 1) {
			var index;
			if(node.intersection === null) {
				index = inters.push([ node.lat, node.lon ]) - 1;
				node.intersection = index;
			} else {
				index = node.intersection;
			}
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

var query = 'way(48.7116166,9.0009532,48.7128374,9.0060248)' + filters + ';(._;>;);out;';

outElem.textContent = query;

apiRequest(query, function (err, data) {
	var text = query + '\n\n';
	
	if(err) {
		text += 'Error: ' + err.message;
	} else {
		var jsonText = JSON.stringify(data, null, 4);
		var t = performance.now();
		var compiled = compileData(data);
		t = performance.now() - t;
		text += 'Compilation took ' + t + '\n';
		text += compiled.intersections.length + ' intersections, ' + compiled.segments.length + ' segments\n\n';
		text += jsonText;
	}
	
	outElem.textContent = text;
});
