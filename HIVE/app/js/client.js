/*jslint devel:true*/
/*global HiveConnect, Blob, URL, sceneCommands*/

(function (window) {
	'use strict';
	function init() {
		var conn = new HiveConnect(),
			clearbtn = document.getElementById('clearbtn'),
			loadbtn = document.getElementById('loadbtn'),
			getbtn = document.getElementById('getbtn'),
			objrenderbtn = document.getElementById('objrenderbtn'),
			resetcamerabtn = document.getElementById('resetcamerabtn'),
			imgdiv = document.getElementById('imgdiv'),
			leftpress = false,
			rightpress = false,
			oldmouse_x,
			oldmouse_y,
			camera_pos = [0, 0, 300];

		function renderScript(src) {
			conn.rendererMethod('runscript', {script: src}, function (res) {
				console.log('runscript result:', res, {script: src});
			});
		}
 		
		//----------
		conn.method('renderedImage', function (param, data) {
			var img = document.getElementById('img');
			if (param.type === 'jpg') {
				img.src = URL.createObjectURL(new Blob([data], {type: "image/jpeg"}));
			}
		});
		
		//------------------
		imgdiv.addEventListener('mousedown', function (e) {
			e.preventDefault();
			if (e.button === 0) {
				leftpress = true;
			} else if (e.button === 2) {
				rightpress = true;
			}
			oldmouse_x = e.clientX;
			oldmouse_y = e.clientY;
		});
		imgdiv.addEventListener('mousemove', function (e) {
			e.preventDefault();
			e.stopPropagation();
			var dx, dy;
			dx = e.clientX - oldmouse_x;
			dy = e.clientY - oldmouse_y;
			if (leftpress) {
				camera_pos[0] -= dx;
				camera_pos[1] += dy;
				renderScript(sceneCommands.cameraPos('camera', camera_pos));
				renderScript(sceneCommands.render());
			}
			if (rightpress) {
				camera_pos[2] += (dx + dy);
				renderScript(sceneCommands.cameraPos('camera', camera_pos));
				renderScript(sceneCommands.render());
			}
			oldmouse_x = e.clientX;
			oldmouse_y = e.clientY;
		});
		imgdiv.addEventListener('mouseup', function (e) {
			e.preventDefault();
			if (e.button === 0) {
				leftpress = false;
			} else if (e.button === 2) {
				rightpress = false;
			}

		});

		loadbtn.addEventListener('click', function (e) {
			renderScript(sceneCommands.loadObj('model', 'bunny.obj', 'normal.frag'));
		});
		clearbtn.addEventListener('click', function (e) {
			renderScript(sceneCommands.clearObjects());
			renderScript(sceneCommands.createCamera('camera'));
		});
		getbtn.addEventListener('click', function (e) {
			renderScript(sceneCommands.getObjectList());
		});
		objrenderbtn.addEventListener('click', function (e) {
			renderScript(sceneCommands.render());
		});
		resetcamerabtn.addEventListener('click', function (e) {
			camera_pos[0] = 0;
			camera_pos[1] = 0;
			camera_pos[2] = 300;
			renderScript(sceneCommands.cameraPos('camera', camera_pos));
		});

	}
	window.addEventListener('load', init);
	window.addEventListener('contextmenu', function (e) {
		e.preventDefault();
	});
}(window));