import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export const useAudioWebRTC = (
    channel: RealtimeChannel | null,
    userId: string,
    roomId: string,
    isHost: boolean,
    peerId: string | undefined, // The other participant's ID
    isMicOn: boolean
) => {
    const pc = useRef<RTCPeerConnection | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');

    // 1. Setup Local Media (Once)
    useEffect(() => {
        const setupMedia = async () => {
            try {
                console.log("[WebRTC] Requesting Microphone Access...");
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                // Keep mic off by default (controlled by PTT)
                stream.getAudioTracks().forEach(track => {
                    track.enabled = false;
                });

                setLocalStream(stream);
                console.log("[WebRTC] Local Media Ready");
            } catch (err) {
                console.error("[WebRTC] Audio access denied or error:", err);
            }
        };

        setupMedia();

        return () => {
            localStream?.getTracks().forEach(t => t.stop());
        };
    }, []);

    // 2. Initialize PeerConnection and Signaling
    useEffect(() => {
        if (!userId || !roomId || !channel) return;

        console.log(`[WebRTC] Initializing connection for ${userId} with peer ${peerId}`);

        const peerConnection = new RTCPeerConnection({
            iceServers: ICE_SERVERS,
        });
        pc.current = peerConnection;

        // Add local tracks
        if (localStream) {
            console.log("[WebRTC] Adding local tracks");
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        peerConnection.onicecandidate = (event) => {
            if (event.candidate && channel) {
                channel.send({
                    type: 'broadcast',
                    event: 'webrtc:ice-candidate',
                    payload: {
                        candidate: event.candidate,
                        senderId: userId,
                        targetId: peerId
                    }
                });
            }
        };

        peerConnection.ontrack = (event) => {
            console.log("[WebRTC] Successfully Received Remote Track");
            setRemoteStream(event.streams[0]);
        };

        peerConnection.onconnectionstatechange = () => {
            console.log("[WebRTC] Connection State:", peerConnection.connectionState);
            setConnectionState(peerConnection.connectionState);
        };

        // Signaling logic inside the same effect to maintain channel reference
        const handleSignaling = async (payload: any) => {
            const { event, payload: data } = payload;
            if (data.targetId && data.targetId !== userId) return;
            if (data.senderId === userId) return;

            console.log(`[WebRTC] Incoming ${event} from ${data.senderId}`);

            try {
                if (event === 'webrtc:offer' && peerConnection.signalingState !== 'closed') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);

                    channel.send({
                        type: 'broadcast',
                        event: 'webrtc:answer',
                        payload: { answer, senderId: userId, targetId: data.senderId }
                    });
                } else if (event === 'webrtc:answer' && peerConnection.signalingState !== 'closed') {
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
                } else if (event === 'webrtc:ice-candidate' && peerConnection.signalingState !== 'closed') {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
                }
            } catch (err) {
                console.error("[WebRTC] Signaling error:", err);
            }
        };

        // Subscribe to signaling
        const subId = channel.on('broadcast', { event: 'webrtc:*' }, (payload) => {
            handleSignaling(payload);
        });

        // Host initiates offer
        if (isHost && peerId) {
            const startOffer = async () => {
                // Short delay to ensure subscriber is active
                await new Promise(r => setTimeout(r, 1000));
                if (peerConnection.signalingState === 'stable') {
                    console.log("[WebRTC] Host creating offer...");
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    channel.send({
                        type: 'broadcast',
                        event: 'webrtc:offer',
                        payload: { offer, senderId: userId, targetId: peerId }
                    });
                }
            };
            startOffer();
        }

        return () => {
            console.log("[WebRTC] Closing connection and leaving channel");
            peerConnection.close();
            pc.current = null;
            // Note: channel.off is not standard for broadcast in basic Supabase SDK, 
            // but closing the PC and unmounting prevents handling logic.
        };
    }, [channel, userId, roomId, isHost, peerId, localStream]);

    // 4. Update Mic State based on PTT
    useEffect(() => {
        if (localStream) {
            console.log(`[WebRTC] Mic ${isMicOn ? 'ON' : 'OFF'}`);
            localStream.getAudioTracks().forEach(track => {
                track.enabled = isMicOn;
            });
        }
    }, [isMicOn, localStream]);

    return { remoteStream, connectionState };
};
