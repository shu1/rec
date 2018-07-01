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
				log(recIndex + " data lag ");
				tracks[recIndex].audio.currentTime = audioContext.currentTime - time;
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
			log(recIndex + " data lag ");
			playBuffer(recIndex, time - audioContext.currentTime);
			tracks[recIndex].button.style.background = "";
			recIndex = 0;
		});
	}

	tracks[0] = {};
	tracks[0].when = 0;
	tracks[0].button = document.getElementById("button0");
	tracks[0].button.onclick = function() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			gainNode = audioContext.createGain();
			gainNode.connect(audioContext.destination);

			audioContext.decodeAudioData(request.response, function(buffer) {
				tracks[0].buffer = buffer;
				play();
			});

			if (useAudio) {
				for (var i=1;i<=4;++i) {
					var source = audioContext.createMediaElementSource(tracks[i].audio);
					source.connect(gainNode);
				}
			}
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
		playBuffer(0);
		tracks[0].source.onended = function() {
			time = audioContext.currentTime;
			if (recIndex) {
				if (recorder.state == "inactive") {
					gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
					recorder.start();
					log(recIndex + " reco lag ");
					tracks[recIndex].when = audioContext.currentTime - time;
					tracks[recIndex].button.style.background = "red";
				}
				else if (recorder.state == "recording") {
					recorder.stop();
					log(recIndex + " stop lag ");
					gainNode.gain.setValueAtTime(1, audioContext.currentTime);
				}
			}

			for (var i=1;i<=4;++i) {
				if (tracks[i].buffer) {
					playBuffer(i);
				}
				else if (tracks[i].audio && tracks[i].audio.src) {
					log(i + " play lag ");
					tracks[i].audio.currentTime = audioContext.currentTime - time;
					tracks[i].audio.play();
				}
			}

			play();
		}
	}

	function playBuffer(i, t=0) {
		tracks[i].source = audioContext.createBufferSource();
		tracks[i].source.buffer = tracks[i].buffer;
		tracks[i].source.connect(gainNode);
		log(i + " play lag ");
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
	function log(e) {
		var t = (audioContext.currentTime - time).toFixed(3);
		if (time && t != 0) {
			if (logged) {
				logDiv.innerHTML += "<br>" + e + t;
			}
			else {
				logDiv.innerHTML = e + t;
				logged = 1;
			}
		}
	}
})
.catch(function(e) {
	console.log(e);
});
