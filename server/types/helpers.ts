export function parseRiotId(riotId: string) {
const parts = riotId.split("#");
if (parts.length !== 2 || !parts[0] || !parts[1]) {
throw new Error("El Riot ID debe tener este formato: Nombre#TAG");
}
return {
gameName: parts[0].trim(),
tagLine: parts[1].trim()
};
}
export function getTimeAgo(timestamp: number) {
const diff = Date.now() - timestamp;
const minutes = Math.floor(diff / 60000);

const hours = Math.floor(diff / 3600000);
const days = Math.floor(diff / 86400000);
if (minutes < 60) return `Hace ${minutes}m`;
if (hours < 24) return `Hace ${hours}h`;
return `Hace ${days}d`;
}
