import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type RiotAccount = {
  puuid: string;
  gameName: string;
  tagLine: string;
};

type RiotSummoner = {
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
  id?: string;
};

type LeagueEntry = {
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
};

type MatchParticipant = {
  puuid: string;
  championName: string;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  totalMinionsKilled?: number;
  neutralMinionsKilled?: number;
  totalDamageDealtToChampions?: number;
  goldEarned?: number;
  individualPosition?: string;
};

type MatchData = {
  metadata: {
    matchId: string;
    participants: string[];
  };
  info: {
    gameCreation: number;
    gameDuration: number;
    queueId: number;
    participants: MatchParticipant[];
  };
};

type ProfileSummaryResponse = {
  account: RiotAccount;
  summoner: RiotSummoner;
  leagueEntries: LeagueEntry[];
  activeGame: any | null;
  matches: MatchData[];
  resolvedPlatform: string;
  warnings?: string[];
};

type ProfileContextValue = {
  profile: ProfileSummaryResponse | null;
  setProfile: (value: ProfileSummaryResponse | null) => void;
};

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

const STORAGE_KEY = 'riot-tracker-profile';

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<ProfileSummaryResponse | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setProfileState(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const setProfile = (value: ProfileSummaryResponse | null) => {
    setProfileState(value);
    if (value) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const contextValue = useMemo(() => ({ profile, setProfile }), [profile]);

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used inside ProfileProvider');
  }
  return context;
}