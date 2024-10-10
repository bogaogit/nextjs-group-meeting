import React, {useEffect, useRef, useState} from 'react';
import Peer from 'simple-peer';
import VideoCard from './VideoCard';
import io from "socket.io-client";
let socket;
export const VideoConference = () => {
    console.log("* VideoConference")

    const currentUser = Math.random() + ""
    const [peers, setPeers] = useState([]);
    const [userVideoAudio, setUserVideoAudio] = useState({
        localUser: {video: true, audio: true},
    });

    const peersRef = useRef([]);
    const userVideoRef = useRef();
    const userStream = useRef();
    const roomId = 0;

    useEffect(() => {
        console.log("* init effect")
        socket = io('https://video-group-meeting-master.onrender.com', { autoConnect: true, forceNew: true });

        // Connect Camera & Mic
        navigator.mediaDevices
            .getUserMedia({video: true, audio: true})
            .then((stream) => {
                console.log("mediaDevices")
                userVideoRef.current.srcObject = stream;
                userStream.current = stream;

                console.log("BE-join-room: " + currentUser)

                socket.emit('BE-join-room', {roomId, userName: currentUser});
                socket.on('FE-user-join', (users) => {
                    console.log("FE-user-join: " + users)
                    // all users
                    const peers = [];
                    users.forEach(({userId, info}) => {
                        let {userName, video, audio} = info;

                        if (userName !== currentUser) {
                            const peer = createPeer(userId, socket.id, stream);

                            peer.userName = userName;
                            peer.peerID = userId;

                            peersRef.current.push({
                                peerID: userId,
                                peer,
                                userName,
                            });
                            peers.push(peer);

                            setUserVideoAudio((preList) => {
                                return {
                                    ...preList,
                                    [peer.userName]: {video, audio},
                                };
                            });
                        }
                    });

                    setPeers(peers);
                });

                socket.on('FE-receive-call', ({signal, from, info}) => {
                    console.log("FE-receive-call: " + from)
                    let {userName, video, audio} = info;
                    const peerIdx = findPeer(from);

                    if (!peerIdx) {
                        const peer = addPeer(signal, from, stream);

                        peer.userName = userName;

                        peersRef.current.push({
                            peerID: from,
                            peer,
                            userName: userName,
                        });
                        setPeers((users) => {
                            return [...users, peer];
                        });
                        setUserVideoAudio((preList) => {
                            return {
                                ...preList,
                                [peer.userName]: {video, audio},
                            };
                        });
                    }
                });

                socket.on('FE-call-accepted', ({signal, answerId}) => {
                    console.log("FE-call-accepted: " + answerId)
                    const peerIdx = findPeer(answerId);
                    peerIdx.peer.signal(signal);
                });


            });

        return () => {
            console.log("disconnect")
            socket.disconnect();
        };
        // eslint-disable-next-line
    }, []);

    function createPeer(userId, caller, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('BE-call-user', {
                userToCall: userId,
                from: caller,
                signal,
            });
        });
        peer.on('disconnect', () => {
            peer.destroy();
        });

        return peer;
    }

    function addPeer(incomingSignal, callerId, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', (signal) => {
            socket.emit('BE-accept-call', {signal, to: callerId});
        });

        peer.on('disconnect', () => {
            peer.destroy();
        });

        peer.signal(incomingSignal);

        return peer;
    }

    function findPeer(id) {
        return peersRef.current.find((p) => p.peerID === id);
    }

    function createUserVideo(peer, index, arr) {
        return (
            <VideoCard key={index} peer={peer} number={arr.length}/>
        );
    }

    return (
        <>
            <video
                ref={userVideoRef}
                muted
                autoPlay
                playInline
            ></video>

            {/* Joined User Vidoe */}
            {peers &&
                peers.map((peer, index, arr) => createUserVideo(peer, index, arr))}
        </>
    );
};


