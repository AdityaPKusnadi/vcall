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
    
    const permissionsOverlay = document.getElementById('permissions-overlay');
    const cameraPermission = document.getElementById('camera-permission');
    const micPermission = document.getElementById('mic-permission');
    const permissionStatus = document.getElementById('permission-status');
    const retryPermissions = document.getElementById('retry-permissions');

    async function checkPermissions() {
        try {
            const result = await navigator.permissions.query({ name: 'camera' });
            if (result.state === 'denied') {
                throw new Error('Camera permission denied');
            }
        } catch (error) {
            console.warn('Permissions API not supported or permission denied');
        }
    }

    async function initializeMedia() {
        updatePermissionUI('pending');
        
        try {
            await checkPermissions();
            
            localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
            });
            
            updatePermissionUI('granted');
            localVideo.srcObject = localStream;
            permissionsOverlay.classList.add('hidden');
            
        } catch (error) {
            console.error('Error accessing media devices:', error);
            updatePermissionUI('denied');
            retryPermissions.classList.remove('hidden');
        }
    }

    function updatePermissionUI(status) {
        const statusIcons = {
            pending: '<i class="fas fa-spinner fa-spin text-yellow-500"></i>',
            granted: '<i class="fas fa-check text-green-500"></i>',
            denied: '<i class="fas fa-times text-red-500"></i>'
        };

        const statusMessages = {
            pending: 'Please allow access to your camera and microphone...',
            granted: 'Permissions granted! Initializing video call...',
            denied: 'Please allow camera and microphone access in your browser settings and retry.'
        };

        const icon = statusIcons[status] || statusIcons.pending;
        cameraPermission.querySelector('span:last-child').innerHTML = icon;
        micPermission.querySelector('span:last-child').innerHTML = icon;
        permissionStatus.textContent = statusMessages[status];
    }

    retryPermissions.addEventListener('click', () => {
        retryPermissions.classList.add('hidden');
        initializeMedia();
    });

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
        videoContainer.className = 'w-full max-w-sm relative rounded-xl overflow-hidden shadow-lg bg-black';
        videoContainer.id = `remote-container-${peerId}`;
        
        const video = document.createElement('video');
        video.id = `remote-video-${peerId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        video.className = 'w-full h-[240px] object-cover';
        
        const label = document.createElement('div');
        label.className = 'absolute bottom-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg';
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
        
        // Show permissions overlay again
        permissionsOverlay.classList.remove('hidden');
        
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