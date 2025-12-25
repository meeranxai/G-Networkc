/**
 * G-Chat WebRTC Call Manager (Phase 14)
 * Handles Signaling, PeerConnection, and Media Streams
 */
import CONFIG from './config.js';

export default class WebrtcManager {
    constructor(chatManager) {
        this.chatManager = chatManager;
        this.localStream = null;
        this.remoteStream = null;
        this.peerConnection = null;
        this.callType = 'video';
        this.targetUserId = null;
        this.isCaller = false;

        // ICE Servers
        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.initUI();
    }

    // Called explicitly when socket is ready
    initSocketListeners(socket) {
        this.socket = socket;

        if (!this.socket) {
            console.error("Socket not provided to WebrtcManager");
            return;
        }

        // Incoming Call
        this.socket.on("call_user", (data) => {
            console.log("Incoming call from:", data.name);
            this.handleIncomingCall(data);
        });

        // Call Accepted
        this.socket.on("call_accepted", (signal) => {
            console.log("Call accepted!");
            this.handleCallAccepted(signal);
        });

        // ICE Candidate
        this.socket.on("ice_candidate", (data) => {
            if (this.peerConnection) {
                this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
                    .catch(e => console.error("Error adding ICE candidate", e));
            }
        });

        // Call Ended
        this.socket.on("call_ended", () => {
            this.endCall(false);
        });
    }

    initUI() {
        // Buttons
        this.btnVoiceCall = document.getElementById('btn-call-voice');
        this.btnVideoCall = document.getElementById('btn-call-video');

        // Incoming Modal
        this.incomingOverlay = document.getElementById('incoming-call-overlay');
        this.incomingAvatar = document.getElementById('incoming-caller-avatar');
        this.incomingName = document.getElementById('incoming-caller-name');
        this.btnAccept = document.getElementById('btn-accept-call');
        this.btnReject = document.getElementById('btn-reject-call');

        // Active Call Overlay
        this.videoOverlay = document.getElementById('video-call-overlay');
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.btnEnd = document.getElementById('btn-end-call');
        this.btnToggleMic = document.getElementById('btn-toggle-mic');
        this.btnToggleCam = document.getElementById('btn-toggle-camera');

        this.activeCallName = document.getElementById('active-call-name');
        this.callTimerEl = document.getElementById('call-timer');

        // Event Listeners
        if (this.btnVoiceCall) this.btnVoiceCall.addEventListener('click', () => this.startCall('voice'));
        if (this.btnVideoCall) this.btnVideoCall.addEventListener('click', () => this.startCall('video'));

        if (this.btnAccept) this.btnAccept.addEventListener('click', () => this.acceptCall());
        if (this.btnReject) this.btnReject.addEventListener('click', () => this.rejectCall());
        if (this.btnEnd) this.btnEnd.addEventListener('click', () => this.endCall());

        if (this.btnToggleMic) this.btnToggleMic.addEventListener('click', () => this.toggleMic());
        if (this.btnToggleCam) this.btnToggleCam.addEventListener('click', () => this.toggleCam());

        // Audio
        this.audioRingtone = document.getElementById('audio-ringtone');
        this.audioEnd = document.getElementById('audio-call-end');
    }

    async playRingtone() {
        try {
            if (this.audioRingtone) {
                this.audioRingtone.currentTime = 0;
                await this.audioRingtone.play();
            }
        } catch (e) {
            console.warn("Autoplay blocked or audio missing", e);
        }
    }

    stopRingtone() {
        if (this.audioRingtone) {
            this.audioRingtone.pause();
            this.audioRingtone.currentTime = 0;
        }
    }

    playEndSound() {
        if (this.audioEnd) {
            this.audioEnd.play().catch(e => console.warn(e));
        }
    }

    async startCall(type) {
        // Get Active Chat Recipient from ChatManager
        const targetUid = this.chatManager.currentRecipientId;

        if (!targetUid) {
            alert("Open a chat to call someone.");
            return;
        }

        this.callType = type;
        this.targetUserId = targetUid;
        this.isCaller = true;

        // Show Video UI
        this.showVideoUI(true);
        this.activeCallName.textContent = "Calling...";

        // Play outbound ringtone/feedback
        // Ideally distinct from inbound, but for now reuse or simple indication
        // Real apps play a "dialing" sound. I'll just rely on UI for outbound "Calling..." 
        // effectively silent unless we have a specific dialing sound.

        // Get Local Stream
        const stream = await this.getLocalStream(type === 'video');
        if (!stream) {
            this.activeCallName.textContent = "Call Failed";
            setTimeout(() => this.endCall(false), 2000);
            return;
        }

        // Create Peer Connection
        this.createPeerConnection();

        // Add Tracks
        stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));

        // Create Offer
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        // Send Offer
        const selfName = this.chatManager.userData ? this.chatManager.userData.displayName : "User";

        this.socket.emit("call_user", {
            userToCall: this.targetUserId,
            signalData: offer,
            from: this.chatManager.currentUser,
            name: selfName
        });
    }

    handleIncomingCall(data) {
        if (this.peerConnection) {
            // Already in a call, auto-reject or busy signal (Phase 14 refinement)
            this.socket.emit("end_call", { to: data.from });
            return;
        }

        this.incomingSignal = data.signalData || data.signal; // Handle potential naming diff
        this.targetUserId = data.from;
        this.incomingName.textContent = data.name;
        this.isCaller = false;

        // Play Ringtone
        this.playRingtone();

        // Show Modal
        if (this.incomingOverlay) this.incomingOverlay.classList.add('active');
    }

    async acceptCall() {
        this.stopRingtone();
        if (this.incomingOverlay) this.incomingOverlay.classList.remove('active');
        this.showVideoUI(true);
        if (this.activeCallName) this.activeCallName.textContent = this.incomingName.textContent;

        // Get Stream
        const stream = await this.getLocalStream(true);
        if (!stream) return;

        this.createPeerConnection();
        stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));

        // Signal
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.incomingSignal));
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.socket.emit("answer_call", {
            signal: answer,
            to: this.targetUserId
        });
    }

    rejectCall() {
        this.stopRingtone();
        if (this.incomingOverlay) this.incomingOverlay.classList.remove('active');
        this.socket.emit("end_call", { to: this.targetUserId });
        this.resetCall();
    }

    handleCallAccepted(signal) {
        this.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        if (this.activeCallName) this.activeCallName.textContent = "Connected";
        this.startTimer();
    }

    endCall(emit = true) {
        this.stopRingtone();
        this.playEndSound();
        if (emit && this.targetUserId) {
            this.socket.emit("end_call", { to: this.targetUserId });
        }
        this.resetCall();
    }

    async getLocalStream(video = true) {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: video,
                audio: true
            });
            if (this.localVideo) this.localVideo.srcObject = this.localStream;
            return this.localStream;
        } catch (err) {
            console.error("Error accessing media devices:", err);
            alert("Could not access camera/microphone.");
            this.endCall(true);
            return null;
        }
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection(this.iceServers);

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.socket.emit("ice_candidate", {
                    target: this.targetUserId,
                    candidate: event.candidate
                });
            }
        };

        this.peerConnection.ontrack = (event) => {
            if (this.remoteVideo) this.remoteVideo.srcObject = event.streams[0];
            this.remoteStream = event.streams[0];
        };
    }

    resetCall() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        if (this.peerConnection) {
            this.peerConnection.close();
        }

        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.targetUserId = null;
        this.incomingSignal = null;

        if (this.videoOverlay) this.videoOverlay.classList.remove('active');
        if (this.incomingOverlay) this.incomingOverlay.classList.remove('active');
        this.stopTimer();
        if (this.activeCallName) this.activeCallName.textContent = "";
        if (this.remoteVideo) this.remoteVideo.srcObject = null;
        if (this.localVideo) this.localVideo.srcObject = null;
    }

    showVideoUI(active) {
        if (active) this.videoOverlay.classList.add('active');
        else this.videoOverlay.classList.remove('active');
    }

    toggleMic() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            audioTrack.enabled = !audioTrack.enabled;
            this.btnToggleMic.classList.toggle('active', audioTrack.enabled);
            this.btnToggleMic.innerHTML = audioTrack.enabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
        }
    }

    toggleCam() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            videoTrack.enabled = !videoTrack.enabled;
            this.btnToggleCam.classList.toggle('active', videoTrack.enabled);
            this.btnToggleCam.innerHTML = videoTrack.enabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        }
    }

    startTimer() {
        this.startTime = Date.now();
        this.timerInterval = setInterval(() => {
            const delta = Date.now() - this.startTime;
            const seconds = Math.floor((delta / 1000) % 60);
            const minutes = Math.floor((delta / (1000 * 60)) % 60);
            if (this.callTimerEl) this.callTimerEl.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }, 1000);
    }

    stopTimer() {
        clearInterval(this.timerInterval);
        if (this.callTimerEl) this.callTimerEl.textContent = "00:00";
    }
}
