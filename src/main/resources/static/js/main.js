'use strict';

var usernamePage      = document.querySelector('#username-page');
var chatPage          = document.querySelector('#chat-page');
var usernameForm      = document.querySelector('#usernameForm');
var messageForm       = document.querySelector('#messageForm');
var messageInput      = document.querySelector('#message');
var messageArea       = document.querySelector('#messageArea');
var connectingElement = document.querySelector('.connecting');

var stompClient = null;
var username    = null;

// ── WebRTC variables ──
var localStream    = null;
var peerConnection = null;
var inCall         = false;

var rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

var colors = [
    '#2196F3', '#32c787', '#00BCD4', '#ff5652',
    '#ffc107', '#ff85af', '#FF9800', '#39bbb0'
];

// Types WebRTC — ces messages ne s'affichent JAMAIS dans le chat
var WEBRTC_TYPES = ['CALL_OFFER', 'CALL_ANSWER', 'ICE_CANDIDATE', 'CALL_END'];

// ── CHAT FUNCTIONS ──

function connect(event) {
    username = document.querySelector('#name').value.trim();
    if (username) {
        usernamePage.classList.add('hidden');
        chatPage.classList.remove('hidden');
        var socket = new SockJS('/ws');
        stompClient = Stomp.over(socket);
        stompClient.debug = null; // disable STOMP logs
        stompClient.connect({}, onConnected, onError);
    }
    event.preventDefault();
}

function onConnected() {
    stompClient.subscribe('/topic/public', onMessageReceived);
    stompClient.send("/app/chat.addUser", {},
        JSON.stringify({ sender: username, type: 'JOIN' })
    );
    connectingElement.classList.add('hidden');
}

function onError(error) {
    connectingElement.textContent = 'Could not connect to WebSocket server. Please refresh this page to try again!';
    connectingElement.style.color = 'red';
}

function sendMessage(event) {
    var messageContent = messageInput.value.trim();
    if (messageContent && stompClient) {
        stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
            sender:  username,
            content: messageInput.value,
            type:    'CHAT'
        }));
        messageInput.value = '';
    }
    event.preventDefault();
}

function onMessageReceived(payload) {
    var message = JSON.parse(payload.body);

    // ── INTERCEPT WebRTC messages — never show in chat ──
    if (WEBRTC_TYPES.indexOf(message.type) !== -1) {
        if (message.sender === username) return; // ignore our own signals

        if (message.type === 'CALL_OFFER')     { handleCallOffer(message);   return; }
        if (message.type === 'CALL_ANSWER')    { handleCallAnswer(message);  return; }
        if (message.type === 'ICE_CANDIDATE')  { handleIceCandidate(message);return; }
        if (message.type === 'CALL_END')       { endCall(false);              return; }
        return;
    }

    // ── Normal chat messages ──
    var messageElement = document.createElement('li');

    if (message.type === 'JOIN') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' joined!';
    } else if (message.type === 'LEAVE') {
        messageElement.classList.add('event-message');
        message.content = message.sender + ' left!';
    } else {
        messageElement.classList.add('chat-message');
        var avatarElement = document.createElement('i');
        avatarElement.appendChild(document.createTextNode(message.sender[0]));
        avatarElement.style['background-color'] = getAvatarColor(message.sender);
        messageElement.appendChild(avatarElement);
        var usernameElement = document.createElement('span');
        usernameElement.appendChild(document.createTextNode(message.sender));
        messageElement.appendChild(usernameElement);
    }

    var textElement = document.createElement('p');
    textElement.appendChild(document.createTextNode(message.content));
    messageElement.appendChild(textElement);
    messageArea.appendChild(messageElement);
    messageArea.scrollTop = messageArea.scrollHeight;
}

function getAvatarColor(messageSender) {
    var hash = 0;
    for (var i = 0; i < messageSender.length; i++) {
        hash = 31 * hash + messageSender.charCodeAt(i);
    }
    return colors[Math.abs(hash % colors.length)];
}

// ── WebRTC FUNCTIONS ──

async function startCall() {
    if (inCall) return;
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        document.getElementById('call-panel').classList.remove('hidden');
        document.getElementById('call-btn').classList.add('hidden');

        peerConnection = createPeerConnection();

        var offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        sendSignal('CALL_OFFER', JSON.stringify(offer));
        inCall = true;
        setCallStatus('Calling... waiting for answer');

    } catch (err) {
        alert('Camera/Microphone access denied: ' + err.message);
    }
}

async function handleCallOffer(message) {
    var offer = JSON.parse(message.content);
    var accept = confirm(message.sender + ' is calling you! Accept?');
    if (!accept) return;

    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        document.getElementById('localVideo').srcObject = localStream;
        document.getElementById('call-panel').classList.remove('hidden');
        document.getElementById('call-btn').classList.add('hidden');

        peerConnection = createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));

        var answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        sendSignal('CALL_ANSWER', JSON.stringify(answer));
        inCall = true;
        setCallStatus('Call connected!');

    } catch (err) {
        alert('Error answering call: ' + err.message);
    }
}

async function handleCallAnswer(message) {
    if (!peerConnection) return;
    var answer = JSON.parse(message.content);
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    setCallStatus('Call connected!');
}

async function handleIceCandidate(message) {
    if (!peerConnection) return;
    try {
        var candidate = JSON.parse(message.content);
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch(e) { /* ignore */ }
}

function createPeerConnection() {
    var pc = new RTCPeerConnection(rtcConfig);

    // Add local stream tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // Show remote video when received
    pc.ontrack = (event) => {
        document.getElementById('remoteVideo').srcObject = event.streams[0];
        setCallStatus('Call connected!');
    };

    // Send ICE candidates via WebSocket
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            sendSignal('ICE_CANDIDATE', JSON.stringify(event.candidate));
        }
    };

    pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
            endCall(false);
        }
    };

    return pc;
}

function endCall(sendSignal_ = true) {
    if (peerConnection) { peerConnection.close(); peerConnection = null; }
    if (localStream)    { localStream.getTracks().forEach(t => t.stop()); localStream = null; }

    var lv = document.getElementById('localVideo');
    var rv = document.getElementById('remoteVideo');
    if (lv) lv.srcObject = null;
    if (rv) rv.srcObject = null;

    document.getElementById('call-panel').classList.add('hidden');
    document.getElementById('call-btn').classList.remove('hidden');
    document.getElementById('mute-btn').textContent = 'Mute';
    document.getElementById('cam-btn').textContent  = 'Hide Cam';
    inCall = false;

    if (sendSignal_ && stompClient) {
        sendSignal('CALL_END', 'ended');
    }
}

function toggleMute() {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        document.getElementById('mute-btn').textContent = track.enabled ? 'Mute' : 'Unmute';
    });
}

function toggleCamera() {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
        document.getElementById('cam-btn').textContent = track.enabled ? 'Hide Cam' : 'Show Cam';
    });
}

// Helper — send a WebRTC signal via WebSocket
function sendSignal(type, content) {
    stompClient.send("/app/chat.sendMessage", {}, JSON.stringify({
        sender:  username,
        type:    type,
        content: content
    }));
}

function setCallStatus(text) {
    var el = document.getElementById('call-status');
    if (el) el.textContent = text;
}

// ── EVENT LISTENERS ──
usernameForm.addEventListener('submit', connect, true);
messageForm.addEventListener('submit', sendMessage, true);