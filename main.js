// Shuichi Aizawa 2018
"use strict";

navigator.mediaDevices.getUserMedia({audio:true})
.then(function(stream) {
	var audioContext, gainNode, rec=0, tracks=[];

	tracks[0] = {};
	tracks[0].audio = document.getElementById("track0");
	tracks[0].audio.onended = function() {
		if (rec) {
			if (mediaRecorder.state == "inactive") {
				gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
				mediaRecorder.start();
				tracks[rec].button.style.background = "red";
			}
			else if (mediaRecorder.state == "recording") {
				mediaRecorder.stop();
				gainNode.gain.setValueAtTime(1, audioContext.currentTime);
			}
		}

		for (var i=4;i>=0;--i) {
			if (tracks[i].audio.src) tracks[i].audio.play();
		}
	}

	tracks[0].button = document.getElementById("button0");
	tracks[0].button.onclick = function() {
		if (!audioContext) {
			audioContext = new (window.AudioContext || window.webkitAudioContext)();
			gainNode = audioContext.createGain();
			for (var i=4;i>=0;--i) {
				var source = audioContext.createMediaElementSource(tracks[i].audio);
				source.connect(gainNode);
				gainNode.connect(audioContext.destination);
				if (i) tracks[i].audio.play();  // don't play track 0 it will get played by code below
			}
		}

		if (tracks[0].audio.paused) {
			for (var i=4;i>=0;--i) {
				if (tracks[i].audio.src) tracks[i].audio.play();
			}
			tracks[0].button.innerHTML = "pause";
		}
		else {
			for (var i=4;i>=0;--i) {
				if (tracks[i].audio.src) tracks[i].audio.pause();
			}
			tracks[0].button.innerHTML = "play";
		}
	}

	var mediaRecorder = new MediaRecorder(stream);
	mediaRecorder.ondataavailable = function(e) {
		tracks[rec].audio.src = URL.createObjectURL(e.data);
		tracks[rec].button.style.background = "";
		rec = 0;
	}

	for (var i=4;i>0;--i) {
		initTrack(i);
	}

	function initTrack(index) {
		tracks[index] = {};
		tracks[index].audio = document.getElementById("track"+index);
		tracks[index].button = document.getElementById("button"+index);
		tracks[index].button.onclick = function() {
			if (mediaRecorder.state == "inactive") {
				if (rec) tracks[rec].button.style.background = "";
				if (rec == index) {
					rec = 0;
				}
				else {
					rec = index;
					tracks[rec].button.style.background = "blue";
				}
			}
		}
	}
})
.catch(function(e) {
	console.log(e);
});
