import { History, Radio, Swords, TrendingUp, Wrench } from "lucide-react";
import ChampionCard from "../components/champions/ChampionCard";
import MatchCard from "../components/history/MatchCard";
import TopNav from "../components/layout/TopNav";
import LpChartPanel from "../components/lp/LpChartPanel";
import RankCard from "../components/profile/RankCard";
import SummonerCard from "../components/profile/SummonerCard";
import CompactHeader from "../components/search/CompactHeader";
import LandingSearch from "../components/search/LandingSearch";
import QueueToggle from "../components/shared/QueueToggle";
import BuildPanel from "../components/builds/BuildPanel";
import LiveGamePanel from "../components/live/LiveGamePanel";
import { useLiveGame } from "../hooks/UseLiveGame";
import { useSummonerSearch } from "../hooks/useSummonerSearch";
import type { MainTab } from "../types/riot";

const TABS: {
  key: MainTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "lp", label: "Progreso LP", icon: TrendingUp },
  { key: "history", label: "Historial", icon: History },
  { key: "champions", label: "Campeones", icon: Swords },
  { key: "live", label: "En Vivo", icon: Radio },
  { key: "builds", label: "Builds", icon: Wrench }
];

export default function HomePage() {
  const {
    riotId,
    setRiotId,
    region,
    setRegion,
    activeTab,
    setActiveTab,
    queueView,
    setQueueView,
    loading,
    error,
    hasSearched,
    data,
    currentRank,
    lpData,
    recentSummary,
    handleSearch,
    loadDemo
  } = useSummonerSearch();

  const { liveData } = useLiveGame(activeTab === "live" && hasSearched);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,212,255,0.12),_transparent_50%),radial-gradient(ellipse_at_bottom_right,_rgba(255,79,109,0.08),_transparent_50%)]" />
      
      {/* Grid pattern overlay */}
      <div className="fixed inset-0 opacity-[0.015]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <TopNav />

        {!hasSearched ? (
          <LandingSearch
            riotId={riotId}
            setRiotId={setRiotId}
            region={region}
            setRegion={setRegion}
            onSearch={handleSearch}
            loading={loading}
            error={error}
            onDemo={loadDemo}
          />
        ) : (
          <>
            <CompactHeader
              riotId={riotId}
              setRiotId={setRiotId}
              region={region}
              setRegion={setRegion}
              onSearch={handleSearch}
              loading={loading}
              currentName={`${data.profile.gameName}#${data.profile.tagLine}`}
            />

            {error && (
              <div className="mt-4 rounded-lg border border-[#ff4f6d]/20 bg-[#ff4f6d]/10 px-4 py-3 text-sm text-[#ff4f6d]">
                {error}
              </div>
            )}

            {/* Profile cards */}
            <section className="mt-8 grid gap-4 lg:grid-cols-3">
              <SummonerCard profile={data.profile} challenges={data.challenges} />
              <RankCard title="Solo/Duo" entry={data.solo} accent="primary" />
              <RankCard title="Flex 5v5" entry={data.flex} accent="secondary" />
            </section>

            {/* Tabs section */}
            <section className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all ${
                      activeTab === key
                        ? "border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] shadow-[0_0_20px_rgba(0,212,255,0.15)]"
                        : "border-white/[0.06] bg-white/[0.02] text-white/60 hover:border-white/10 hover:bg-white/[0.04] hover:text-white/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>

              {(activeTab === "lp" || activeTab === "history") && (
                <div className="inline-flex rounded-lg border border-white/[0.06] bg-white/[0.02] p-1">
                  <QueueToggle active={queueView === "solo"} onClick={() => setQueueView("solo")}>
                    Solo/Duo
                  </QueueToggle>
                  <QueueToggle active={queueView === "flex"} onClick={() => setQueueView("flex")}>
                    Flex
                  </QueueToggle>
                </div>
              )}
            </section>

            {/* Tab content */}
            {activeTab === "lp" && (
              <LpChartPanel
                queueView={queueView}
                currentRank={currentRank}
                lpData={lpData}
                hasHistory={queueView === "solo" ? data.hasSoloLpHistory : data.hasFlexLpHistory}
              />
            )}

            {activeTab === "history" && (
              <div className="mt-6">
                <div className="mb-5 flex flex-wrap items-center gap-4 text-sm">
                  <span className="text-white/50">Ultimas {data.recentMatches.length} partidas</span>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-[#00d4ff]">{recentSummary.wins}V</span>
                    <span className="font-semibold text-[#ff4f6d]">{recentSummary.losses}D</span>
                    <span className="rounded-md bg-white/[0.04] px-2 py-1 text-white/70">{recentSummary.wr}% WR</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.recentMatches.map((match) => (
                    <MatchCard key={match.matchId} match={match} />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "champions" && (
              <section className="mt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {data.topChampions.map((champion, index) => (
                    <ChampionCard key={champion.championId} champion={champion} index={index} />
                  ))}
                </div>
              </section>
            )}

            {activeTab === "live" && <LiveGamePanel riotData={data} liveData={liveData} />}
            {activeTab === "builds" && <BuildPanel data={data} />}
          </>
        )}
      </div>
    </div>
  );
}
