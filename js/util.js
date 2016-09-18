(function (win, doc) {
	'use strict';
	
	function sqr(v) {
		return v * v;
	}
	
	function clamp(v, a, b) {
		return v < a ? a : v > b ? b : v;
	}
	
	function formatTime(hours) {
		var mins = Math.round(hours * 60);
		hours = Math.floor(mins / 60);
		mins -= hours * 60;
		
		var parts = [];
		
		if(hours) {
			parts.push(hours + ' hours');
		}
		
		if(mins) {
			parts.push(mins + ' minutes');
		}
		
		return parts.join(', ');
	}
	
	window.sqr = sqr;
	window.clamp = clamp;
	window.formatTime = formatTime;
})(window, document);

