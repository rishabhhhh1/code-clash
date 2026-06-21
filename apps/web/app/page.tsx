import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold mb-6">
          Battle Your Code Skills
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          CodeClash transforms coding practice into competitive multiplayer battles.
          Challenge friends, climb the ranks, and become a coding legend.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/auth/register"
            className="px-8 py-3 text-lg font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Start Battling
          </Link>
          <Link
            href="/lobby"
            className="px-8 py-3 text-lg font-medium border rounded-md hover:bg-accent transition-colors"
          >
            Browse Lobby
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">1v1 Deathmatch</h3>
            <p className="text-muted-foreground">
              Head-to-head coding battles. First to solve wins.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Battle Royale</h3>
            <p className="text-muted-foreground">
              10-100+ players compete. Last coder standing wins.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Live Rankings</h3>
            <p className="text-muted-foreground">
              ELO-based system. Climb from Bronze to Legend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
