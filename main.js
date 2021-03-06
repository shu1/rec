// Shuichi Aizawa 2018
"use strict";

var canvas, audioContext, recorder, visualizer, tracks=[];
var styles = ["white", "fuchsia", "yellow", "aqua", "lime", "orange"];
var colors = [
	[  1,  0,  0],
	[  1,  0,  1],
	[  1,  1,  0],
	[  0,  1,  1],
	[  0,  1,  0],
	[  1,0.5,  0]
]
var vars = {
	background:"linear-gradient(blue,#f04)",
	audioBgm:false,
	fpsCount:0,
	fpsTime:0,
	fpsText:"",
	fftSize:512,
	buffers:[],
	files:[],
	lag:0.1,
	gain:1,
	bgm:3,
	vis:1
}

window.onload = function() {
	vars.audioRec = window.MediaRecorder?true:false;

	var param = location.search.slice(1).split("&");
	if (param && param[0]) {
		var params = {}
		for (var i = 0; i < param.length; ++i) {
			var pair = param[i].split("=");
			params[pair[0]] = pair[1];
		}
		if (params["lag"]) {
			vars.lag = parseFloat(params["lag"]);
			log("lag=", vars.lag);
		}
		if (params["gain"]) {
			vars.gain = parseFloat(params["gain"]);
			log("gain=", vars.gain);
		}
	}

	function initTrack(i) {
		tracks[i] = {};
		tracks[i].offset = 0;
		tracks[i].cell = document.getElementById("cell"+i);
		tracks[i].button = document.getElementById("button"+i);
		tracks[i].button.onclick = function() {
			if (i) {
				rec(i);
			}
			else if (audioContext) {
				stop();
			}
			else if (vars.request && vars.request.response) {
				initAudio(vars.request.response);
			}
			else if (tracks[0].audio && tracks[0].audio.src) {
				initAudio();
			}
		}

		if (!i && vars.audioBgm || i && vars.audioRec) tracks[i].audio = document.getElementById("audio"+i);
	}

	for (var i=0;i<=4;++i) {
		initTrack(i);
	}
	tracks[5] = {};
	tracks[0].button.disabled = true;

	loadAudio(vars.bgm);

	if (bgm) {
		bgm.selectedIndex = vars.bgm;
		bgm.onchange = function(event) {
			vars.bgm = event.target.value;
			loadAudio(vars.bgm);
		}
	}

	if (file) {
		file.onchange = function(event) {
			var files = event.target.files || event.dataTransfer.files;
			if (files.length==1) {
				loadFile(0, files[0]);
			} else {
				for (var i=0; i<4 && i < files.length; ++i) {
					loadFile(i+1, files[i]);
				}
			}
			event.preventDefault();
		}
	}

	canvas = document.getElementById("canvas");
	vars.dy = (canvas.height - 64)/4;

	var context2d = canvas.getContext("2d");
	context2d.fillRect(0, 0, canvas.width, 64);
	context2d.lineWidth = 2;
	context2d.strokeStyle = "white";
	context2d.font = "12px sans-serif";

	visualizer = new Visualizer(context2d, gl);
	visualizer.setIndex(vars.vis);
	setBackground();

	var element = document.getElementById("visualizer");
	if (element) {
		element.selectedIndex = vars.vis;
		element.onchange = function(event) {
			vars.vis = event.target.value;
			visualizer.setIndex(vars.vis);
			setBackground(vars.vis);
		}
	}

	canvas.onmousedown = function(e) {
		if (audioContext) {
			if (e.touches) {
				vars.x = e.touches[0].pageX;
				vars.y = e.touches[0].pageY;
			} else {
				vars.x = e.pageX;
				vars.y = e.pageY;
			}
			vars.x -= canvas.offsetLeft;
			vars.y -= canvas.offsetTop;

			var i = Math.ceil((vars.y-64) / vars.dy);
			if (i && tracks[0].button.innerHTML == "stop") {
				rec(i);
			} else {
				stop();
			}
		}
		else if (vars.request && vars.request.response) {
			initAudio(vars.request.response);
		}
		else if (tracks[0].audio && tracks[0].audio.src) {
			initAudio();
		}
	}
}

function setBackground(i) {
	if (i >= 3) {
		gl.style.background = "blue";
	} else {
		gl.style.background = vars.background;
	}
}

function draw(time) {
	var context2d = canvas.getContext("2d");
	context2d.clearRect(0, 0, canvas.width, canvas.height);

	var visualized, visIndex = visualizer.index();
	for (var j=4;j>=0;--j) {
		var i = Math.abs(j - (visIndex==5?4:0));	// reverse order for Aurora visualizer
		if (visIndex > 0 && (tracks[i].buffer || tracks[i].audio && tracks[i].audio.src) && (i || !visualized || visIndex < 4)) {
			visualizer.draw(tracks[i].analyser, (visIndex > 2) ? colors[i] : styles[i], i / 5);
			visualized = true;
		}
	}

	var data = vars.data;
	var offset = (data.length - canvas.width)/2;
	vars.analyser.getByteTimeDomainData(data);

	context2d.fillStyle = "black";
	context2d.beginPath();
	context2d.moveTo(canvas.width, 0);
	for (var i = canvas.width; i >= 0; --i) {
		context2d.lineTo(i, data[i + offset]/2);
	}
	context2d.lineTo(0,0);
	context2d.fill();

	var x = ((vars.time - audioContext.currentTime) / (tracks[0].buffer?tracks[0].buffer.duration:tracks[0].audio.duration) + 1) * canvas.width;
	var r = 64;
	var rx = r+8;
	var ry = r-12;

	context2d.beginPath();
	for (var i=1;i<=4;++i) {
		var y = vars.dy * (i - 0.5) + 64;
		var data = tracks[i].data;

		if (vars.recording && i == vars.rec) {
			tracks[5].analyser.getByteTimeDomainData(data);
			context2d.moveTo(x + r, y);
			var dx = (x + r) / data.length;
			for (var j = data.length-1; j >= 0; --j) {
				context2d.lineTo(dx * j, y + (data[j]-128)/5);
			}
		}
		else if (tracks[i].buffer || tracks[i].audio && tracks[i].audio.src) {
			tracks[i].analyser.getByteTimeDomainData(data);
			context2d.moveTo(x + r, y);
			var dx = r * 2 / data.length;
			for (var j = data.length-1; j >= 0; --j) {
				context2d.lineTo(x - r + dx * j, y + (data[j]-128)/5);
			}
		}
	}
	context2d.stroke();

	for (var i=1;i<=4;++i) {
		var y = vars.dy * (i - 0.5) + 64;
		var gradient = context2d.createRadialGradient(x - rx/3, y, 0, x, y, rx);
		gradient.addColorStop(0, "rgba(255,255,255,0)");
		gradient.addColorStop(1, i == vars.rec ? styles[5] : styles[i]);
		context2d.fillStyle = gradient;
		context2d.beginPath();
		context2d.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
		context2d.fill();
	}

	vars.fpsCount++;
	if (time - vars.fpsTime > 984) {
		vars.fpsText = vars.fpsCount + "fps";
		vars.fpsTime = time;
		vars.fpsCount = 0;
	}
	context2d.fillStyle = "white";
	context2d.fillText(vars.fpsText + (vars.stop ? " stop" : ""), 1, 12);

	requestAnimationFrame(draw);
}

function loadFile(i, file) {
	if (new Audio().canPlayType(file.type)) {
		if (tracks[i].audio) {
			log(i + " " + file.name);
			tracks[i].audio.src = URL.createObjectURL(file);
		} else {
			if (audioContext) {
				log(i + " " + file.name);
				var reader = new FileReader();
				reader.onload = function(event) {
					audioContext.decodeAudioData(event.target.result, function(buffer) {
						vars.buffers[i] = buffer;
					});
				}
				reader.readAsArrayBuffer(file);
			} else {
				vars.files[i] = file;
			}
		}
	} else {
		log("UNSUPPORTED FILE TYPE " + file.type);
	}
}

function initAudio(data) {
	audioContext = new (window.AudioContext || window.webkitAudioContext)();

	vars.analyser = audioContext.createAnalyser();
	vars.analyser.connect(audioContext.destination);
	vars.data = new Uint8Array(vars.analyser.frequencyBinCount);

	vars.gainNode = audioContext.createGain();
	vars.gainNode.connect(vars.analyser);
	vars.gainNode.gain.setValueAtTime(vars.gain, audioContext.currentTime);

	for (var i=0;i<=4;++i) {
		tracks[i].analyser = audioContext.createAnalyser();
		tracks[i].analyser.fftSize = vars.fftSize;
		tracks[i].analyser.connect(vars.gainNode);
		tracks[i].data = new Uint8Array(tracks[i].analyser.frequencyBinCount);

		if ((i || !data) && tracks[i].audio) {
			var source = audioContext.createMediaElementSource(tracks[i].audio);
			source.connect(tracks[i].analyser);
		}

		if (vars.files[i]) {
			loadFile(i, vars.files[i]);
			vars.files[i] = null;
		}
	}

	tracks[5].analyser = audioContext.createAnalyser();
	tracks[5].analyser.fftSize = vars.fftSize;
	var source = audioContext.createMediaStreamSource(vars.stream);
	source.connect(tracks[5].analyser);

	if (!window.MediaRecorder) recorder = new Recorder(source);

	if (data) {
		audioContext.decodeAudioData(data, function(buffer) {
			tracks[0].buffer = buffer;
			initPlay();
		});
	} else {
		setBackground(vars.vis);
		initPlay();
	}

	function initPlay() {
		vars.time = audioContext.currentTime;
		play();
		tracks[0].button.innerHTML = "stop";
		setBackground(vars.vis);
		requestAnimationFrame(draw);
	}
}

function loadAudio(i) {
	var type = new Audio().canPlayType('audio/ogg')?1:0;
	if (vars.audioBgm) {
		tracks[0].audio.src = assets[i][type];
		load();
	} else {
		vars.request = new XMLHttpRequest();
		vars.request.open("get", assets[i][type], true);
		vars.request.responseType = "arraybuffer";
		vars.request.onload = load;
		vars.request.send();
	}

	function load() {
		if (!audioContext) {
			tracks[0].button.innerHTML = "play";
			tracks[0].button.disabled = false;
		}
		else if (vars.request && vars.request.response) {
			audioContext.decodeAudioData(vars.request.response, function(buffer) {
				vars.buffers[0] = buffer;
			});
		}
	}
}

function rec(i) {
	if (!vars.recording) {
		if (vars.rec) tracks[vars.rec].button.style.background = "";
		if (vars.rec != i) {
			vars.rec = i;
			tracks[i].button.style.background = "blue";
		} else {
			vars.rec = 0;
		}
	}
}

function stop() {
	if (vars.stop) {
		vars.stop = false;
		tracks[0].button.style.background = "";
	}
	else if (tracks[0].button.innerHTML == "stop") {
		tracks[0].button.style.background = "blue";
		vars.stop = true;
	}
	else if (tracks[0].buffer || tracks[0].audio && tracks[0].audio.src) {
		vars.time = audioContext.currentTime;
		play();
		tracks[0].button.innerHTML = "stop";
	}
}

function play() {
	vars.stop = false;
	for (var i=0;i<=4;++i) {
		if (tracks[i].buffer) {
			playBuffer(i);
		}
		else if (tracks[i].audio && tracks[i].audio.src) {
			var dt = audioContext.currentTime - vars.time;
			tracks[i].audio.currentTime = dt + (i?vars.lag:0);
			tracks[i].audio.play();
			if (dt != vars.dt) log(i + " play lag ", dt);
		}
	}
	vars.dt = 0;

	if (tracks[0].source) {
		tracks[0].source.onended = ended;
	} else {
		tracks[0].audio.onended = ended;
	}
}

function ended() {
	for (var i=0;i<=4;++i) {
		if (vars.buffers[i]) {
			tracks[i].buffer = vars.buffers[i];
			vars.buffers[i] = null;
		}
	}

	if (vars.stop) {
		vars.stop = false;
		tracks[0].button.style.background = "";
		tracks[0].button.innerHTML = "play";
	} else {
		vars.time = audioContext.currentTime;
		if (vars.rec) {
			if (vars.recording) {
				recorder.stop();
				vars.recording = false;
				vars.gainNode.gain.setValueAtTime(vars.gain, audioContext.currentTime);
				vars.dt = audioContext.currentTime - vars.time;
				log(vars.rec + " rece lag ", vars.dt);
				tracks[vars.rec].offset += vars.dt;

				if (!window.MediaRecorder) {
					var i = vars.rec;
					recorder.getBuffer(function(buffers) {
						var buffer = audioContext.createBuffer(2, buffers[0].length, audioContext.sampleRate);
						buffer.getChannelData(0).set(buffers[0]);
						buffer.getChannelData(1).set(buffers[1]);
						decode(buffer);
					});
					recorder.exportWAV(function(blob) {
						tracks[i].cell.innerHTML = "<a href='" + URL.createObjectURL(blob) + "' download='track" + i + ".wav'>download<a/>";
					});
					recorder.clear();
				}
			} else {
				vars.gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
				recorder.start();
				vars.recording = true;
				tracks[vars.rec].offset = vars.dt = audioContext.currentTime - vars.time;
				log(vars.rec + " recb lag ", vars.dt);
				tracks[vars.rec].button.style.background = "red";
			}
		}
		play();
	}
}

function playBuffer(i, t=0) {
	tracks[i].source = audioContext.createBufferSource();
	tracks[i].source.buffer = tracks[i].buffer;
	tracks[i].source.connect(tracks[i].analyser);
	tracks[i].source.start(0, t + (i?vars.lag:0));
	var dt = audioContext.currentTime - vars.time;
	if (dt != vars.dt) log(i + " play lag ", dt - t);
}

function decode(buffer) {
	tracks[vars.rec].buffer = buffer;
	vars.dt = audioContext.currentTime - vars.time;
	playBuffer(vars.rec, vars.dt + tracks[vars.rec].offset);
	log(vars.rec + " data lag ", vars.dt);
	tracks[vars.rec].button.style.background = "";
	vars.rec = 0;
}

navigator.mediaDevices.getUserMedia({audio:true})
.then(function(stream) {
	vars.stream = stream;

	if (window.MediaRecorder) {
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = function(e) {
			if (vars.audioRec) {
				tracks[vars.rec].audio.src = URL.createObjectURL(e.data);
				vars.dt = audioContext.currentTime - vars.time;
				tracks[vars.rec].audio.currentTime = vars.lag + vars.dt + tracks[vars.rec].offset;
				tracks[vars.rec].audio.play();
				log(vars.rec + " data lag ", vars.dt);
				tracks[vars.rec].button.style.background = "";
				tracks[vars.rec].cell.innerHTML = "<a href='" + tracks[vars.rec].audio.src + "' download>download<a/>";
				vars.rec = 0;
			} else {
				reader.readAsArrayBuffer(e.data);
			}
		}

		var reader;
		if (!vars.audioRec) {
			reader = new FileReader();
			reader.onload = function() {
				audioContext.decodeAudioData(reader.result, decode);
			}
		}
	}
})
.catch(function(e) {
	log("Microphone " + e);
});

function log(e, t) {
	if (t != 0) {
		if (vars.log) {
			logDiv.innerHTML += "<br>" + e;
		} else {
			logDiv.innerHTML = e;
			vars.log = true;
		}
		if (t) logDiv.innerHTML += t.toFixed(3);
	}
}
