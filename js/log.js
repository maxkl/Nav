(function (win, doc) {
	'use strict';
	
	var logContainer = doc.getElementById('log');
	
	function _log(args, color) {
		var e = doc.createElement('div');
		if(color) e.style.color = color;
		e.textContent = slice.call(args).join(' ');
		logContainer.appendChild(e);
	}
	
	var slice = Array.prototype.slice;
	
	function log() {
		_log(arguments);
	}
	
	function loge() {
		_log(arguments, '#f00');
	}
	
	win.addEventListener('error', function (evt) {
		loge(evt.filename + ':' + evt.lineno + ':' + evt.colno, evt.message);
	});
	
	win.log = log;
	win.loge = loge;
})(window, document);

