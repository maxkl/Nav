(function (win, doc) {
	'use strict';
	
	var join = Array.prototype.join;
	
	var el = doc.createElement('div');
	el.style.position = 'fixed';
	el.style.zIndex = 1000;
	el.style.top = 0;
	el.style.left = 0;
	el.style.right = 0;
	el.style.maxHeight = '50%';
	el.style.overflow = 'auto';
	el.style.whiteSpace = 'nowrap';
	
	doc.body.appendChild(el);
	
	function _l(s, c) {
		var e = doc.createElement('div');
		if(c) e.style.color = c;
		e.textContent = join.call(s, ' ');
		el.appendChild(e);
	}
	
	function l() {
		_l(arguments);
	}
	
	function lw() {
		_l(arguments, '#ff0');
	}
	
	function le() {
		_l(arguments, '#f00');
	}
	
	win.addEventListener('error', function (evt) {
		le(evt.filename, evt.lineno + ':' + evt.colno, evt.message);
	});
	
	win.log = l;
	win.logw = lw;
	win.loge = le;
	
})(window, document);

