"use client";

import {VideoConference} from "@/components/group-video-conference/VideoConference";
import SocketProvider from "@/components/group-video-conference/SocketProvider";

export default function Home() {
    return (
        <SocketProvider>
            <VideoConference></VideoConference>

        </SocketProvider>
    );
}
