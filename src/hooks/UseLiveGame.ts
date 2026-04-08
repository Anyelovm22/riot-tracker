import { useEffect, useState } from "react";
import type { LiveSnapshot } from "../types/riot";
import { fetchLiveSnapshot } from "../services/liveApi";
export function useLiveGame(enabled: boolean) {
    const [liveData, setLiveData] = useState<LiveSnapshot | null>(null);
    useEffect(() => {
        if (!enabled) return;
        let mounted = true;

        const tick = async () => {
            const data = await fetchLiveSnapshot();
            if (mounted) setLiveData(data);
        };
        tick();
        const id = setInterval(tick, 3000);
        return () => {
            mounted = false;
            clearInterval(id);
        };
    }, [enabled]);
    return { liveData };
}