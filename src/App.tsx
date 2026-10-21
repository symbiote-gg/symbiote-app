import { Redirect, Route, Router, Switch } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";

import { AppShell } from "./components";
import { useIngestInvalidation } from "./hooks/useIngestInvalidation";
import { About } from "./pages/about";
import { Heroes } from "./pages/heroes";
import { Home } from "./pages/home";
import { Profile } from "./pages/profile";
import { ReplayDetail } from "./pages/replay";
import { Replays } from "./pages/replays";

function App() {
    useIngestInvalidation();

    return (
        <Router hook={useHashLocation}>
            <AppShell>
                <Switch>
                    <Route path="/" component={Home} />
                    <Route path="/replays" component={Replays} />
                    <Route path="/replays/:replayId" component={ReplayDetail} />
                    <Route path="/profile" component={Profile} />
                    <Route path="/heroes" component={Heroes} />
                    <Route path="/about" component={About} />
                    <Route>
                        <Redirect to="/" />
                    </Route>
                </Switch>
            </AppShell>
        </Router>
    );
}

export default App;
