const BASE = "https://www.googleapis.com/youtube/v3";

export class YouTubeAPIError extends Error {
    constructor(public status: number, public reason: string | undefined, public message: string) {
        super(message);
    }
}

export interface PlaylistResource {
    id: string,
    snippet: { title: string },
    contentDetails: { itemCount: number }
}

export interface PlaylistItemResource {
    /** Playlist Item ID, not Video ID */
    id: string,
    snippet: {
        title: string,
        position: number,
        videoOwnerChannelTitle?: string,
        resoureId: {
            videoId: string
        }
    },
    contentDetails: { videoId: string },
    status?: { privacyStatus: string }
}

interface Page<T> {
    items: T[];
    nextPageToken: string;
}

async function ytGet<T>(path: string, searchParams: Record<string, string>, token: string): Promise<T> {
    const response = await fetch(`${BASE}/${path}?${new URLSearchParams(searchParams)}`, {
        headers: { Authorization: `Bearer: ${token}` }
    });

    if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new YouTubeAPIError(response.status, body?.error?.errors?.[0]?.reason, body?.error?.message ?? response.statusText);
    }

    return response.json() as Promise<T>;
}

async function ytGetAll<T>(path: string, searchParams: Record<string, string>, token: string): Promise<T[]> {
    const all: T[] = [];

    let pageToken: string | undefined;

    do {
        const page = await ytGet<Page<T>>(
            path, 
            {
                ...searchParams,
                maxResults: '50',
                ...(pageToken ? { pageToken } : {})
            },
            token
        );

        all.push(...page.items);
        pageToken = page.nextPageToken;
    } while (pageToken);

    return all;
}

export const fetchPlaylists = (token: string) => {
    return ytGetAll<PlaylistResource>("playlists", {
        part: "snippet,contentDetails",
        mine: "true"
    }, token);
}

export const fetchPlaylistItems = (playlistId: string, token: string) => {
    return ytGetAll<PlaylistItemResource>("playlistItems", {
        part: "snippet,contentDetails,status",
        playlistId
    }, token);
}