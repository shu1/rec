// Shuichi Aizawa 2018
"use strict";

navigator.mediaDevices.getUserMedia({audio:true})
.then(function(stream) {
	var audioContext, gainNode, recorder, reader, tracks=[];
	var vars = {
		lag:0,
		audio:1
	}

	var ua = navigator.userAgent;
	if (ua.indexOf("Mobile") >= 0) {
		vars.lag = 0.1;
	}

	var params = {}
	var param = location.search.slice(1).split("&");
	if (param && param[0]) {
		for (var i = 0; i < param.length; ++i) {
			var pair = param[i].split("=");
			params[pair[0]] = pair[1];
		}

		if (params["lag"]) {
			vars.lag = parseFloat(params["lag"]);
			log("lag=", vars.lag);
		}
	}

	if (window.MediaRecorder) {
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = function(e) {
			if (vars.audio) {
				tracks[vars.rec].audio.src = URL.createObjectURL(e.data);
				vars.dt = audioContext.currentTime - vars.time;
				tracks[vars.rec].audio.currentTime = vars.dt + vars.lag;
				tracks[vars.rec].audio.play();
				log(vars.rec + " data lag ", vars.dt);
				tracks[vars.rec].button.style.background = "";
				vars.rec = 0;
			}
			else {
				reader.readAsArrayBuffer(e.data);
			}
		}

		if (!vars.audio) {
			reader = new FileReader();
			reader.onload = function() {
				decode(reader.result);
			}
		}
	}
	else {
		recorder = new Recorder({encoderPath:"waveWorker.min.js"});
		recorder.ondataavailable = function(typedArray) {
			decode(typedArray.buffer);
		}
	}

	function decode(data) {
		audioContext.decodeAudioData(data, function(buffer) {
			tracks[vars.rec].buffer = buffer;
			vars.dt = audioContext.currentTime - vars.time;
			playBuffer(vars.rec, vars.dt);
			log(vars.rec + " data lag ", vars.dt);
			tracks[vars.rec].button.style.background = "";
			vars.rec = 0;
		});
	}

	tracks[0] = {};
	tracks[0].button = document.getElementById("button0");
	tracks[0].button.onclick = function() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			gainNode = audioContext.createGain();
			gainNode.connect(audioContext.destination);

			audioContext.decodeAudioData(request.response, function(buffer) {
				tracks[0].buffer = buffer;
				vars.time = audioContext.currentTime;
				play();
				tracks[0].button.innerHTML = "stop";
			});

			if (vars.audio) {
				for (var i=1;i<=4;++i) {
					var source = audioContext.createMediaElementSource(tracks[i].audio);
					source.connect(gainNode);
				}
			}
		}
		else if (tracks[0].button.innerHTML == "stop") {
			tracks[0].button.style.background = "blue";
			tracks[0].when = 1;
		}
		else if (tracks[0].buffer) {
			vars.time = audioContext.currentTime;
			play();
			tracks[0].button.innerHTML = "stop";
		}
	}

	var request = new XMLHttpRequest();
	request.open("get", "shubeat3." + (new Audio().canPlayType('audio/ogg')?"ogg":"m4a"), true);
	request.responseType = "arraybuffer";
	request.onload = function() {
		tracks[0].button.innerHTML = "play";
		tracks[0].button.disabled = false;
	}
	request.send();

	function play() {
		tracks[0].when = 0;
		playBuffer(0);
		for (var i=1;i<=4;++i) {
			if (tracks[i].buffer) {
				playBuffer(i);
			}
			else if (tracks[i].audio && tracks[i].audio.src) {
				var dt = audioContext.currentTime - vars.time;
				tracks[i].audio.currentTime = dt + vars.lag;
				tracks[i].audio.play();
				if (dt != vars.dt) log(i + " play lag ", dt);
			}
		}
		vars.dt = 0;

		tracks[0].source.onended = function() {
			if (tracks[0].when) {
				tracks[0].button.style.background = "";
				tracks[0].button.innerHTML = "play";
			}
			else {
				vars.time = audioContext.currentTime;
				if (vars.rec) {
					if (recorder.state == "inactive") {
						gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
						recorder.start();
						tracks[vars.rec].when = vars.dt = audioContext.currentTime - vars.time;
						log(vars.rec + " recb lag ", vars.dt);
						tracks[vars.rec].button.style.background = "red";
					}
					else if (recorder.state == "recording") {
						recorder.stop();
						gainNode.gain.setValueAtTime(1, audioContext.currentTime);
						vars.dt = audioContext.currentTime - vars.time;
						log(vars.rec + " rece lag ", vars.dt);
					}
				}
				play();
			}
		}
	}

	function playBuffer(i, t=0) {
		tracks[i].source = audioContext.createBufferSource();
		tracks[i].source.buffer = tracks[i].buffer;
		tracks[i].source.connect(gainNode);
		tracks[i].source.start(audioContext.currentTime + tracks[i].when - t);
		var dt = audioContext.currentTime - vars.time;
		if (dt != vars.dt) log(i + " play lag ", dt - t);
	}

	for (var i=1;i<=4;++i) {
		initTrack(i);
	}

	function initTrack(i) {
		tracks[i] = {};
		tracks[i].when = 0;
		tracks[i].button = document.getElementById("button"+i);
		tracks[i].button.onclick = function() {
			if (recorder.state == "inactive") {
				if (vars.rec) tracks[vars.rec].button.style.background = "";
				if (vars.rec != i) {
					vars.rec = i;
					tracks[i].button.style.background = "blue";
				}
				else {
					vars.rec = 0;
				}
			}
		}
		if (vars.audio) tracks[i].audio = document.getElementById("track"+i);
	}

	var logged;
	function log(e, t) {
		if (t != 0) {
			if (logged) {
				logDiv.innerHTML += "<br>" + e;
				if(t) logDiv.innerHTML += t.toFixed(3);
			}
			else {
				logDiv.innerHTML = e;
				if(t) logDiv.innerHTML += t.toFixed(3);
				logged = 1;
			}
		}
	}
})
.catch(function(e) {
	console.log(e);
});
