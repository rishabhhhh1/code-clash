import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { Layout } from "@/components/layout";
import Lobby from "@/pages/lobby";
import Login from "@/pages/login";
import Register from "@/pages/register";
import CreateRoom from "@/pages/room-create";
import RoomView from "@/pages/room-view";
import BattleView from "@/pages/battle-view";
import BattleResults from "@/pages/battle-results";
import Leaderboard from "@/pages/leaderboard";
import Profile from "@/pages/profile";
import Friends from "@/pages/friends";
import Achievements from "@/pages/achievements";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      {/* Protected/Main Routes */}
      <Route path="/">
        <Layout>
          <Switch>
            <Route path="/" component={Lobby} />
            <Route path="/room/create" component={CreateRoom} />
            <Route path="/room/:roomCode" component={RoomView} />
            <Route path="/battle/:battleId" component={BattleView} />
            <Route path="/battle/:battleId/results" component={BattleResults} />
            <Route path="/leaderboard" component={Leaderboard} />
            <Route path="/profile/:username" component={Profile} />
            <Route path="/friends" component={Friends} />
            <Route path="/achievements" component={Achievements} />
          </Switch>
        </Layout>
      </Route>
      
      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
