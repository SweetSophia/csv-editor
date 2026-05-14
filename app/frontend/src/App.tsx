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
            <header className="header">
                <h1>CSV Editor</h1>
                <span className="version">{version && `v${version}`}</span>
            </header>
            <main className="placeholder">
                <p>Phase 1 (Core, read-only) — under construction.</p>
                <p>Open a CSV/TSV file to begin once the viewer is implemented.</p>
            </main>
        </div>
    );
}

export default App;
