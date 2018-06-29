// Shuichi Aizawa 2018
"use strict";

navigator.getUserMedia({audio:true},
function(stream) {
	var audioContext, gainNode, recIndex=0, tracks=[];

	var recorder = new MediaRecorder(stream);
	recorder.ondataavailable = function(e) {
		tracks[recIndex].audio.src = URL.createObjectURL(e.data);
		tracks[recIndex].button.style.background = "";
		recIndex = 0;
	}

	tracks[0] = {};
	tracks[0].button = document.getElementById("button0");
	tracks[0].button.onclick = function() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			gainNode = audioContext.createGain();
			gainNode.connect(audioContext.destination);

			for (var i=4;i>=0;--i) {
				var source = audioContext.createMediaElementSource(tracks[i].audio);
				source.connect(gainNode);
				if (i) tracks[i].audio.play();  // don't play track 0 it will get played by code below
			}
		}

		if (tracks[0].audio.paused) {
			for (var i=4;i>=0;--i) {
				if (tracks[i].audio.src) tracks[i].audio.play();
			}
			tracks[0].button.innerHTML = "pause";
		}
		else if (recorder.state == "inactive") {
			for (var i=4;i>=0;--i) {
				if (tracks[i].audio.src) tracks[i].audio.pause();
			}
			tracks[0].button.innerHTML = "play";
		}
	}

	tracks[0].audio = document.getElementById("track0");
	tracks[0].audio.onended = function() {
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

		for (var i=4;i>=0;--i) {
			if (tracks[i].audio.src) tracks[i].audio.play();
		}
	}

	for (var i=1;i<=4;++i) {
		initTrack(i);
	}

	function initTrack(index) {
		tracks[index] = {};
		tracks[index].audio = document.getElementById("track"+index);
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
