const videoChatForm = document.getElementById('video-chat-form');
const videoChatRooms = document.getElementById('video-chat-rooms');
const joinBtn = document.getElementById('join');
const roomInput = document.getElementById('roomName');
const userVideo = document.getElementById('user-video');
const peerVideo = document.getElementById('peer-video');

const socket = io();
let creator = false;
const roomName = roomInput.value;
let peerConnection;
const openMediaDevices = async (constraints) => {
    videoChatForm.style.display = 'none';
    return await navigator.mediaDevices.getUserMedia(constraints);
};
let userStream;
async function createStream() {
    userStream = await openMediaDevices({
        video: { width: 1024, height: 700 },
        audio: true,
    });
    userVideo.srcObject = userStream;
    userVideo.onloadedmetadata = (e) => {
        userVideo.play();
    };
    socket.emit('ready', roomName);
}

joinBtn.addEventListener('click', async () => {
    if (!roomInput.value) {
        return alert('Please Enter a room name!');
    }

    socket.emit('join', roomName);
});

socket.on('created', async () => {
    creator = true;
    try {
        await createStream();
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
});

socket.on('joined', async () => {
    creator = false;
    try {
        await createStream();
    } catch (error) {
        console.error('Error accessing media devices.', error);
    }
});

socket.on('room-full', () => {
    alert('Room is full!');
});

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

socket.on('ready', async () => {
    if (creator) {
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate, roomName);
            }
        };

        peerConnection.ontrack = (event) => {
            peerVideo.srcObject = event.streams[0];
            peerVideo.onloadedmetadata = (e) => {
                peerVideo.play();
            };
        };

        peerConnection.addTrack(userStream.getTracks()[0], userStream);
        peerConnection.addTrack(userStream.getTracks()[1], userStream);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer, roomName);
    }
});

socket.on('candidate', async (candidate) => {
    let iceCandidate = new RTCIceCandidate(candidate);
    await peerConnection.addIceCandidate(iceCandidate);
});

socket.on('offer', async (offer) => {
    if (!creator) {
        peerConnection = new RTCPeerConnection(configuration);
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('candidate', event.candidate, roomName);
            }
        };

        peerConnection.ontrack = (event) => {
            peerVideo.srcObject = event.streams[0];
            peerVideo.onloadedmetadata = (e) => {
                peerVideo.play();
            };
        };
        await peerConnection.setRemoteDescription(offer);
        peerConnection.addTrack(userStream.getTracks()[0], userStream);
        peerConnection.addTrack(userStream.getTracks()[1], userStream);

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer, roomName);
    }
});

socket.on('answer', async (answer) => {
    await peerConnection.setRemoteDescription(answer);
});
