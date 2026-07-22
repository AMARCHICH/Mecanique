import { useState } from 'react';
import { simulations, simulationList, categories } from './physics/simulations';
import SimulationView from './components/SimulationView';

export default function App() {
  const [activeSim, setActiveSim] = useState(simulationList[0].id);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const config = simulations[activeSim];

  const selectSim = (id: string) => {
    setActiveSim(id);
    // Sur mobile, on referme le menu après sélection pour libérer l'écran
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Fond semi-transparent sur mobile quand le menu est ouvert */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 md:transform-none ${
          sidebarOpen ? 'translate-x-0 md:w-72' : '-translate-x-full md:w-0'
        } bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col overflow-hidden flex-shrink-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-700/50">
          <div>
            <h1 className="text-base font-bold tracking-tight">PhysiSim</h1>
            <p className="text-[10px] text-slate-400 leading-tight">
              Laboratoire virtuel de physique
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {categories.map((cat) => (
            <div key={cat} className="mb-3">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest px-3 py-1.5 font-semibold">
                {cat}
              </div>

              {simulationList
                .filter((s) => s.category === cat)
                .map((sim) => (
                  <button
                    key={sim.id}
                    onClick={() => selectSim(sim.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 ${
                      activeSim === sim.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-slate-300 hover:bg-slate-700/60 hover:text-white'
                    }`}
                  >
                    <span className="truncate block">{sim.name}</span>
                  </button>
                ))}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-700/50 text-[10px] text-slate-500 text-center">
          Élaborée par : AMARCHICH Youssef
        </div>
      </aside>

      {/* Toggle Sidebar Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed md:absolute top-2 left-1 z-50 w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center hover:bg-slate-700 shadow-lg transition-all ${
          sidebarOpen ? 'md:left-[272px]' : 'md:left-1'
        }`}
        title={sidebarOpen ? 'Masquer le menu' : 'Afficher le menu'}
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto md:overflow-hidden">
        <SimulationView key={config.id} config={config} />
      </main>
    </div>
  );
}
