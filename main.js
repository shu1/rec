// Shuichi Aizawa 2018
"use strict";

navigator.mediaDevices.getUserMedia({audio:true})
.then(function(stream) {
	var audioContext, gainNode, recorder, reader, time, useAudio=1, recIndex=0, tracks=[];

	if (window.MediaRecorder) {
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = function(e) {
			if (useAudio) {
				tracks[recIndex].audio.src = URL.createObjectURL(e.data);
				tracks[recIndex].when += audioContext.currentTime - time;
				tracks[recIndex].audio.currentTime = tracks[recIndex].when;
				log(recIndex + " data lag ", tracks[recIndex].when);
				tracks[recIndex].audio.play();
				tracks[recIndex].button.style.background = "";
				recIndex = 0;
			}
			else {
				reader.readAsArrayBuffer(e.data);
			}
		}

		if (!useAudio) {
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
			tracks[recIndex].buffer = buffer;
			log(recIndex + " data lag ", audioContext.currentTime - time);
			playBuffer(recIndex, time - audioContext.currentTime);
			tracks[recIndex].button.style.background = "";
			recIndex = 0;
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
				play();
				tracks[0].button.innerHTML = "stop";
			});

			if (useAudio) {
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
			time = audioContext.currentTime;
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
				tracks[i].audio.currentTime = audioContext.currentTime - time + tracks[i].when;
				log(i + " play lag ", audioContext.currentTime - time);
				tracks[i].audio.play();
			}
		}

		tracks[0].source.onended = function() {
			if (tracks[0].when) {
				tracks[0].button.style.background = "";
				tracks[0].button.innerHTML = "play";
			}
			else {
				time = audioContext.currentTime;
				if (recIndex) {
					if (recorder.state == "inactive") {
						gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
						recorder.start();
						tracks[recIndex].when = audioContext.currentTime - time;
						log(recIndex + " recb lag ", tracks[recIndex].when);
						tracks[recIndex].button.style.background = "red";
					}
					else if (recorder.state == "recording") {
						recorder.stop();
						gainNode.gain.setValueAtTime(1, audioContext.currentTime);
						if (window.MediaRecorder) tracks[recIndex].when += audioContext.currentTime - time;
						log(recIndex + " rece lag ", tracks[recIndex].when);
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
		log(i + " play lag ", audioContext.currentTime - time);
		tracks[i].source.start(audioContext.currentTime + tracks[recIndex].when + t);
	}

	for (var i=1;i<=4;++i) {
		initTrack(i);
	}

	function initTrack(index) {
		tracks[index] = {};
		tracks[index].when = 0;
		tracks[index].button = document.getElementById("button"+index);
		tracks[index].button.onclick = function() {
			if (recorder.state == "inactive") {
				if (recIndex) tracks[recIndex].button.style.background = "";
				if (recIndex == index) {
					recIndex = 0;
				}
				else {
					recIndex = index;
					tracks[recIndex].button.style.background = "blue";
				}
			}
		}
		if (useAudio) tracks[index].audio = document.getElementById("track"+index);
	}

	var logged;
	function log(e, t) {
		if (t) {
			if (logged) {
				logDiv.innerHTML += "<br>" + e + t.toFixed(3);
			}
			else {
				logDiv.innerHTML = e + t.toFixed(3);
				logged = 1;
			}
		}
	}
})
.catch(function(e) {
	console.log(e);
});
