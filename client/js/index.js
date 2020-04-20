
/**
 * Init html elements
 */
const toggleMuteButton = document.querySelector('.video-container__controls__toggle-mute');
const toggleVideoButton = document.querySelector('.video-container__controls__toggle-video');
const toggleScreenShareButton = document.querySelector('.video-container__controls__toggle-screen-share');
const streamVideoElement = document.querySelector('video#stream-video');
const selfVideoElement = document.querySelector('video#self-video');
const sidebarElement = document.querySelector('div#sidebar');
const remoteVideosElement = document.querySelector('div.remote-videos');

let socketIO = io();

/**
 * Contains the list of sockets
 */
let socketList = [];

/**
 * Device Types
 */
const DeviceTypes = {
    CAMERA: 'CAMERA',   // webcam
    SCREEN: 'SCREEN',
};

/**
 * States (for devices)
 */
const States = {
    ON: 'ON',
    OFF: 'OFF',
};

const MediaConstraints = {
    SCREEN: {
        video: true
    },
    CAMERA: {
        video: true,
        audio: true,
    },
};

/**
 * Set default states
 */
let audioState = States.ON;
let videoState = States.ON;
let screenShareState = States.OFF;

/**
 * The stream from user's camera
 * 
 * @type MediaStream
 */
let deviceCameraStream = null;

/**
 * The stream from user's screen
 * @type MediaStream
 */
let deviceScreenStream = null;

let incomingScreenShareStream = null;

let incomingCameraStreams = [];

let pc1 = null;
let pc2 = null;

/**
 * Updates the online participants to the right of the screen(in the sidebar).
 * 
 * @param {string} socketIds String variable containing socket-id string
 */
const updateParticipantList = (socketIds) => {
    const participantsEl = document.querySelector('.participants');

    socketIds.forEach(socketId => {
        const participant = document.querySelector(`.participants__participant#${socketId}`);

        if (!participant) {
            const participantContainerEl = createParticipantItemContainer(socketId);
            participantsEl.appendChild(participantContainerEl);
        }
    });
};

/**
 * Creates an HTML element for a participant.
 * 
 * @param {string} socketId String variable containing socket-id string
 */
const createParticipantItemContainer = (socketId) => {
    const containerEl = document.createElement('div');
    containerEl.setAttribute('class', 'participants__participant');
    containerEl.setAttribute('id', socketId);

    const usernameEl = document.createElement('div');
    usernameEl.setAttribute('class', 'participants__participant__name');
    usernameEl.innerHTML = `Socket: ${socketId}`;

    containerEl.appendChild(usernameEl);

    return containerEl;
};

/**
 * Gets the media device stream
 * @param {device} device
 * 
 * @return MediaStream
 */
const openMediaDevice = async (device) => {
    switch (device) {
        case DeviceTypes.SCREEN:
            return await navigator.mediaDevices.getDisplayMedia(MediaConstraints.SCREEN);

        default:
        case DeviceTypes.CAMERA:
            return await navigator.mediaDevices.getUserMedia(MediaConstraints.CAMERA);
    }
}

const updateVideoElements = () => {
    if (screenShareState == States.ON) {
        if (streamVideoElement.srcObj !== incomingScreenShareStream) {
            streamVideoElement.srcObj = incomingScreenShareStream;
        }
    } else {
        streamVideoElement.srcObject = incomingCameraStreams[0];

        let remoteVideosElems = document.querySelectorAll('.remote-videos__video');

        if (remoteVideosElems.length != incomingCameraStreams-1) {
            remoteVideosElems.forEach(el => el.remove());
        }

        for (let i=1; i<incomingCameraStreams.length; ++i) {
            let newVideoElem = document.createElement('video');
            newVideoElem.className = 'remote-videos__video';
            newVideoElem.srcObj = incomingCameraStreams[i];
            remoteVideosElement.appendChild(newVideoElem);
        }
    }
}

/**
 * RTCPeerConnection callbacks
 */

const onIceCandidate = async (pc, pcName, event) => {
    switch (pcName) {
        default:
        case 'pc1':
            pc.addCandidate(event.candidate);
            break;

        case 'pc2':
            pc.addCandidate(event.candidate);
            break;
    }
}

const gotRemoteStream = (e) => {
    if (
        incomingCameraStreams.length == 0
        || incomingCameraStreams.length != e.streams.length
        || incomingCameraStreams[0] !== e.streams[0]
        ){  
        e.streams.forEach(stream => {
            incomingCameraStreams.push(stream);
        });
    }
}

/**
 * Initialize camera stream when user first visits the page
 */
async function start () {
    deviceCameraStream = await openMediaDevice();
    selfVideoElement.srcObject = deviceCameraStream;

    pc1 = new RTCPeerConnection({ sdpSemantics: 'unified-plan' });
    pc2 = new RTCPeerConnection({ sdpSemantics: 'unified-plan' });

    // let videoTracks = deviceCameraStream.getVideoTracks();
    // let audioTracks = deviceCameraStream.getAudioTracks();

    pc1.addEventListener('icecandidate', e => onIceCandidate(pc1, 'pc1', e));
    pc2.addEventListener('icecandidate', e => onIceCandidate(pc2, 'pc2', e));
    pc1.addEventListener('iceconnectionstatechange', e => console.log(`pc1 ICE State: ${pc1.iceConnectionState}`));
    pc2.addEventListener('iceconnectionstatechange', e => console.log(`pc1 ICE State: ${pc2.iceConnectionState}`));
    pc2.addEventListener('track', gotRemoteStream);

    deviceCameraStream.getTracks().forEach(track => pc1.addTrack(track, deviceCameraStream));
}

/**
 * Attach events
 */
toggleMuteButton.onclick = (event) => {
    if (!deviceCameraStream) {
        return;
    }

    switch(audioState) {
        default:
        case States.ON:
            deviceCameraStream.getAudioTracks().forEach(audioTrack => {
                audioTrack.enabled = false;
            });
            toggleMuteButton.innerHTML = 'Unmute';
            audioState = States.OFF;
            break;
        
        case States.OFF:
            deviceCameraStream.getAudioTracks().forEach(audioTrack => {
                audioTrack.enabled = true;
            });
            toggleMuteButton.innerHTML = 'Mute';
            audioState = States.ON;
            break;
    }

    console.log('Mute state is now: ', audioState);
};

toggleVideoButton.onclick = (event) => {
    if (!deviceCameraStream) {
        return;
    }

    switch(videoState) {
        default:
        case States.ON:
            deviceCameraStream.getVideoTracks().forEach(videoTrack => {
                videoTrack.enabled = false;
            });
            toggleVideoButton.innerHTML = 'Start Video';
            videoState = States.OFF;
            break;
        
        case States.OFF:
            deviceCameraStream.getVideoTracks().forEach(videoTrack => {
                videoTrack.enabled = true;
            });
            toggleVideoButton.innerHTML = 'Stop Video';
            videoState = States.ON;
            break;
    }

    console.log('Video state is now: ', videoState);
};

toggleScreenShareButton.onclick = (event) => {
    switch(screenShareState) {
        default:
        case States.ON:
            toggleScreenShareButton.innerHTML = 'Share Screen';
            screenShareState = States.OFF;
            break;
        
        case States.OFF:
            toggleScreenShareButton.innerHTML = 'Stop Screen Share';
            screenShareState = States.ON;
            break;
    }

    console.log('Screen Share state is now: ', screenShareState);
};

start();

socketIO.on('connection', socket => {
    const existingSocket = socketList.find( sock => sock === socket.id );

    if (!existingSocket) {
        socketList.push(socket.id);

        socket.emit('update-participants', {
            users: socketList.filter(sock => sock !== socket.id),
        });

        socket.broadcase.emit('update-participants', {
            users: [socket.id],
        });
    }
});

socketIO.on('update-participants', ({ users }) => {
    updateParticipantList(users);
})

socketIO.on('remove-participant', ({ socketId }) => {
    const elToRemove = document.getElementById(socketId);

    if (elToRemove) {
        elToRemove.remove();
    }
})