import socket from 'socket.io-client';

let socketInstance = null;

// Ensure socket is initialized
const ensureSocketInitialized = () => {
    if (!socketInstance) {
        throw new Error("Socket is not initialized. Call initializeSocket first.");
    }
};

// Initialize the socket connection
export const initializeSocket = (projectId, token = localStorage.getItem('token')) => {
    if (!token) {
        throw new Error("Authentication token not found.");
    }

    if (!projectId) {
        throw new Error("Project ID is required to initialize the socket.");
    }

    socketInstance = socket(import.meta.env.VITE_API_URL || "http://localhost:3000", {
        auth: { token },
        query: { projectId },
    });

    // Handle connection errors
    socketInstance.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
    });

    // Handle disconnection
    socketInstance.on('disconnect', () => {
        console.warn('Socket disconnected.');
    });

    return socketInstance;
};

// Listen for messages
export const receiveMessage = (eventName, cb) => {
    ensureSocketInitialized();
    socketInstance.off(eventName); // Prevent duplicate listeners
    socketInstance.on(eventName, cb);
};

// Send a message
export const sendMessage = (eventName, data) => {
    ensureSocketInitialized();
    socketInstance.emit(eventName, data);
};

// Remove a message listener
export const removeMessage = (eventName, cb) => {
    ensureSocketInitialized();
    socketInstance.off(eventName, cb);
};
