document.addEventListener('DOMContentLoaded', () => {
    let peer;
    let localStream;
    let roomName;
    const connections = {};
    
    const localVideo = document.getElementById('local-video');
    const remoteVideos = document.getElementById('remote-videos');
    const roomInput = document.getElementById('room-input');
    const joinBtn = document.getElementById('join-btn');
    const leaveBtn = document.getElementById('leave-btn');
    const roomDisplay = document.getElementById('room-display');
    
    // Initialize media
    async function initializeMedia() {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            localVideo.srcObject = localStream;
        } catch (error) {
            console.error('Error accessing media devices:', error);
            alert('Could not access camera or microphone. Please check permissions.');
        }
    }
    
    // Initialize PeerJS
    function initializePeer() {
        // Using the free PeerJS server with random user ID
        peer = new Peer(null, {
            // You can also use your own server with a service like Glitch
            // host: 'your-signaling-server.com',
            // port: 443,
            // path: '/peerjs',
            // secure: true,
            debug: 3
        });
        
        peer.on('open', (id) => {
            console.log('My peer ID is:', id);
        });
        
        peer.on('error', (error) => {
            console.error('PeerJS error:', error);
            alert(`Connection error: ${error.type}`);
        });
        
        return peer;
    }
    
    // Join a room
    function joinRoom() {
        if (!peer || !localStream) {
            alert('Video initialization not complete. Please try again.');
            return;
        }
        
        roomName = roomInput.value.trim();
        if (!roomName) {
            alert('Please enter a room name');
            return;
        }
        
        // Display room information
        roomDisplay.textContent = `Room: ${roomName} (Your ID: ${peer.id})`;
        
        // Connect to the room (simplified approach)
        // In a real app, you would connect to a proper signaling server
        connectToNewUser(roomName);
        
        // Set up to receive calls
        peer.on('call', (call) => {
            call.answer(localStream);
            setupCallEvents(call);
        });
        
        // Update button states
        joinBtn.disabled = true;
        leaveBtn.disabled = false;
    }
    
    // Connect to another user
    function connectToNewUser(userId) {
        console.log(`Attempting to connect to user: ${userId}`);
        const call = peer.call(userId, localStream);
        setupCallEvents(call);
    }
    
    // Set up call events
    function setupCallEvents(call) {
        const peerId = call.peer;
        connections[peerId] = call;
        
        call.on('stream', (remoteStream) => {
            if (!document.getElementById(`remote-video-${peerId}`)) {
                addRemoteVideo(peerId, remoteStream);
            }
        });
        
        call.on('close', () => {
            removeRemoteVideo(peerId);
        });
        
        call.on('error', (error) => {
            console.error('Call error:', error);
            removeRemoteVideo(peerId);
        });
    }
    
    // Add a remote video to the DOM
    function addRemoteVideo(peerId, stream) {
        const videoContainer = document.createElement('div');
        videoContainer.className = 'video-item';
        videoContainer.id = `remote-container-${peerId}`;
        
        const video = document.createElement('video');
        video.id = `remote-video-${peerId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        
        const label = document.createElement('div');
        label.className = 'video-label';
        label.textContent = `Peer: ${peerId.substring(0, 5)}...`;
        
        videoContainer.appendChild(video);
        videoContainer.appendChild(label);
        remoteVideos.appendChild(videoContainer);
    }
    
    // Remove a remote video from the DOM
    function removeRemoteVideo(peerId) {
        const videoContainer = document.getElementById(`remote-container-${peerId}`);
        if (videoContainer) {
            videoContainer.remove();
        }
        if (connections[peerId]) {
            connections[peerId].close();
            delete connections[peerId];
        }
    }
    
    // Leave the room
    function leaveRoom() {
        if (peer) {
            // Close all connections
            Object.values(connections).forEach(conn => conn.close());
            
            // Close the peer connection
            peer.destroy();
        }
        
        // Clear videos
        remoteVideos.innerHTML = '';
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localVideo.srcObject = null;
        }
        
        // Reset UI
        roomDisplay.textContent = '';
        joinBtn.disabled = false;
        leaveBtn.disabled = true;
        
        // Reinitialize everything for next call
        initializeMedia().then(() => {
            initializePeer();
        });
    }
    
    // Set up event listeners
    joinBtn.addEventListener('click', joinRoom);
    leaveBtn.addEventListener('click', leaveRoom);
    
    // Initialize on load
    initializeMedia().then(() => {
        initializePeer();
    });
});