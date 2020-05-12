/**
 * Contains all the sockets in the app and supporting functions!
 */


let localSocket = null;
/**
 * Creates an HTML element for a participant.
 * 
 * @param {string} socketId String variable containing socket-id string
 */
const createParticipantItemContainer = (user) => {
    const containerEl = document.createElement('div');
    containerEl.setAttribute('class', 'participants__participant');
    containerEl.setAttribute('id', `${user.userID}`);

    const usernameEl = document.createElement('div');
    usernameEl.setAttribute('class', 'participants__participant__name');
    // usernameEl.innerHTML = `Socket: ${socketId}`;
    usernameEl.innerHTML = user.displayName;

    containerEl.appendChild(usernameEl);

    return containerEl;
};

/**
 * Updates the online participants to the right of the screen(in the sidebar).
 * 
 * @param {string} socketIds String variable containing socket-id string
 */
const updateParticipantList = (users) => {
    console.log(users);
    const participantsEl = document.querySelector('.participants');
    participantsEl.innerHTML = '';

    users.forEach(user => {
        const participant = document.querySelector(`.participants__participant#${user.userID}`);

        if (!participant) {
            const participantContainerEl = createParticipantItemContainer(user);
            participantsEl.appendChild(participantContainerEl);
        }
    });
};

const initSocket = () => {
    socketIO = io('http://localhost:4545', { query: `displayName=${ sessionStorage.getItem('displayName') }` });

    socketIO.connect();

    socketIO.on('connect', () => {
        const displayName = sessionStorage.getItem('displayName');
        const userID = sessionStorage.getItem('userID');
        // const existingSocket = socketList.find( sock => sock.socketID === socket.id );
        console.log(`Socket connected!\nThe display name is: ${ sessionStorage.getItem('displayName') }`);

        // if (!existingSocket) {
        //     socketList.push({
        //         socketID: socket.id,
        //         displayName: displayName,
        //     });

            // socket.emit('update-participants', {
            //     users: socketList.filter(sock => sock.socketID !== socket.id),
            // });

            // socket.broadcast.emit('update-participants', {
            //     users: [socket.id],
            // });
        // }
        
        console.log('Sending displayName');
        let setDisplayNamePayload = {
            displayName: displayName,
        };

        if (userID) {
            setDisplayNamePayload = {...setDisplayNamePayload, userID: userID};
        }
        socketIO.emit('set-displayname', setDisplayNamePayload);
    });

    socketIO.on('update-participants', ({ users }) => {
        console.log('socket: Update Participants: ', users);

        updateParticipantList(users);
    });

    socketIO.on('remove-participant', ({ socketId }) => {
        const elToRemove = document.getElementById(`p-${socketId}`);

        if (elToRemove) {
            elToRemove.remove();
        }
    });

    socketIO.on('set-user-id', ({ userID }) => {
        sessionStorage.setItem('userID', userID);
    });
};

joinButtonElement.onclick = (event) => {
    if (displayNameInputElement.value) {
        sessionStorage.setItem('displayName', displayNameInputElement.value);
        hideBeforeContentLoadScreen();

        start();
        initSocket();
    } else {
        inputErrorMessageElement.style.display = 'block';
    }
};

main();