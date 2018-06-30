// Shuichi Aizawa 2018
"use strict";

navigator.getUserMedia({audio:true},
function(stream) {
	var audioContext, gainNode, recorder, reader, recIndex=0, tracks=[];

	if (window.MediaRecorder) {
		recorder = new MediaRecorder(stream);
		recorder.ondataavailable = function(e) {
			reader.readAsArrayBuffer(e.data);
		}

		reader = new FileReader();
		reader.onload = function() {
			decode(reader.result);
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
			playBuffer(recIndex);
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

			var request = new XMLHttpRequest();
			request.open("get", "shubeat3." + (new Audio().canPlayType('audio/ogg')?"ogg":"wav"), true);
			request.responseType = "arraybuffer";
			request.onload = function() {
				audioContext.decodeAudioData(request.response, function(buffer) {
					tracks[0].buffer = buffer;
					play();
				});
			}
			request.send();
		}
	}

	function play() {
		playBuffer(0);
		tracks[0].source.onended = function() {
			if (recIndex) {
				if (recorder.state == "inactive") {
					gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
					recorder.start();
					tracks[recIndex].button.style.background = "red";
				}
				else if (recorder.state == "recording") {
					recorder.stop();
					gainNode.gain.setValueAtTime(1, audioContext.currentTime);
				}
			}

			for (var i=4;i>0;--i) {
				if (tracks[i].buffer) playBuffer(i);
			}
			play();
		}
	}

	function playBuffer(i) {
		tracks[i].source = audioContext.createBufferSource();
		tracks[i].source.buffer = tracks[i].buffer;
		tracks[i].source.connect(gainNode);
		tracks[i].source.start(0);
	}

	for (var i=1;i<=4;++i) {
		initTrack(i);
	}

	function initTrack(index) {
		tracks[index] = {};
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
	}
},
function(e) {
	console.log(e);
});
