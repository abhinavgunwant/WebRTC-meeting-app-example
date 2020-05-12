
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

const contentElement = document.querySelector('div#content');
const beforeContentLoadElement = document.querySelector('div#before-content-load');
const displayNameInputElement = document.querySelector('input#inp-display-name');
const joinButtonElement = document.querySelector('button#inp-join');
const inputErrorMessageElement = document.querySelector('div#inp-error-message');

let socketIO = null;

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

const onCreateAnswerSuccess = async (localDesc) => {
    try {
        await pc2.setLocalDescription(localDesc);
        console.log('Set local success!');
    } catch (e) {
        console.log('Error while setting local description. ', e);
    }

    try {
        await pc1.setRemoteDescription(localDesc);
        console.log('Set remote success!');
    } catch (e) {
        console.log('Error on setting remote for pc1. ', e);
    }
};

const onCreateOfferSuccess = async (localDesc) => {
    try {
        console.log('setting local description on pc1');
        await pc1.setLocalDescription(localDesc);
    } catch (e) {
        console.log('Error while setting local description. ', e);
    }

    try {
        console.log('setting remote description on pc2');
        await pc2.setRemoteDescription(localDesc);
    } catch (e) {
        console.log('Error while setting remote description on pc2. ', e);
    }

    try {
        console.log('creating answer');
        const answer = await pc2.createAnswer();
        await onCreateAnswerSuccess(answer);
    } catch (e) {
        console.log('Error while creating answer. ', e);
    }
};

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

    try {
        console.log('creating offer');
        const offer = await pc1.createOffer({
            offerToReceiveAudio: 1,
            offerToReceiveVideo: 1,
        });

        await onCreateOfferSuccess(offer);
    } catch (e) {
        onCreateSessionDescriptionError(e);
    }
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

const hideBeforeContentLoadScreen = () => {
    beforeContentLoadElement.style.display = 'none';
    contentElement.style.display = 'flex';
};

const main = () => {
    if (sessionStorage.getItem('displayName')) {
        hideBeforeContentLoadScreen();
        start();
        initSocket();
    }
}

['change', 'keydown'].forEach(e => {
    displayNameInputElement.addEventListener(e, (event) => {
        inputErrorMessageElement.style.display = 'none';
    });
});