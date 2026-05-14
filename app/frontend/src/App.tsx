import { useEffect, useState } from 'react';
import './App.css';
import { Version } from '../wailsjs/go/main/Bindings';

function App() {
    const [version, setVersion] = useState<string>('');

    useEffect(() => {
        Version().then(setVersion).catch(() => setVersion('unknown'));
    }, []);

    return (
        <div id="App">
            <main className="placeholder">
                <h1>CSV Editor</h1>
                <p>Phase 1 (Core, read-only) — under construction.</p>
                <p>Open a CSV/TSV file to begin once the viewer is implemented.</p>
                {version && <small className="version">v{version}</small>}
            </main>
        </div>
    );
}

export default App;
