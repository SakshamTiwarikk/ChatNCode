import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;



const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});


io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(" ")[1];
        const projectId = socket.handshake.query.projectId;

        console.log("Received token:", token); // Debug token
        console.log("Received projectId:", projectId); // Debug projectId

        if (!projectId) {
            console.error("Missing projectId in query");
            return next(new Error("Missing projectId"));
        }

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            console.error("Invalid projectId format");
            return next(new Error("Invalid projectId"));
        }

        const project = await projectModel.findById(projectId);
        if (!project) {
            console.error("Project not found in database");
            return next(new Error("Project not found"));
        }

        socket.project = project;

        if (!token) {
            console.error("Missing token");
            return next(new Error("Authentication error: Missing token"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            console.error("Invalid token");
            return next(new Error("Authentication error: Invalid token"));
        }

        socket.user = decoded;
        next();
    } catch (error) {
        console.error("Middleware error:", error.message);
        next(new Error("Internal server error"));
    }
});



io.on('connection', socket => {
    socket.roomId = socket.project._id.toString()


    console.log('a user connected');



    socket.join(socket.roomId);

    socket.on('project-message', async data => {

        const message = data.message;

        const aiIsPresentInMessage = message.includes('@ai');
        socket.broadcast.to(socket.roomId).emit('project-message', data)

        if (aiIsPresentInMessage) {


            const prompt = message.replace('@ai', '');

            const result = await generateResult(prompt);


            io.to(socket.roomId).emit('project-message', {
                message: result,
                sender: {
                    _id: 'ai',
                    email: 'AI'
                }
            })


            return
        }


    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId)
    });
});




server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})