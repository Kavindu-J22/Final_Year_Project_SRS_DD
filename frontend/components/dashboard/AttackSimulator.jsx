import { useState } from 'react';
import axios from 'axios';
import { Terminal, ShieldAlert, Cpu, Network, Zap } from 'lucide-react';

export default function AttackSimulator({ onAttackComplete }) {
  const [status, setStatus] = useState('Idle');
  const [logs, setLogs] = useState([]);
  const [isAttacking, setIsAttacking] = useState(false);

  const addLog = (msg) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const getHeaders = () => {
    const token = localStorage.getItem('cf_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const simulateBruteForce = async () => {
    setIsAttacking(true);
    setStatus('Running Brute Force...');
    setLogs([]);
    addLog('Initiating Brute Force Attack...');

    const passwords = ['123456', 'password', 'admin123', 'qwerty', 'admin'];
    
    for (let i = 0; i < passwords.length; i++) {
      try {
        await axios.post('http://localhost:5004/login', 
          { username: 'admin', password: passwords[i] },
          { headers: getHeaders() }
        );
        addLog(`Attempt ${i + 1}: POST /login admin:${passwords[i]} -> Success`);
      } catch (err) {
        addLog(`Attempt ${i + 1}: POST /login admin:${passwords[i]} -> Failed (401)`);
      }
      // Small delay between requests to show sequence
      await new Promise(r => setTimeout(r, 400));
    }
    
    addLog('Brute Force completed.');
    setStatus('Attack Finished');
    setIsAttacking(false);
    if (onAttackComplete) onAttackComplete();
  };

  const simulateSQLInjection = async () => {
    setIsAttacking(true);
    setStatus('Running SQL Injection...');
    setLogs([]);
    addLog('Initiating SQL Injection Attack...');

    const payloads = [
      "admin' OR 1=1--",
      "admin' UNION SELECT 1,2,3--",
    ];

    for (let i = 0; i < payloads.length; i++) {
      try {
        await axios.post('http://localhost:5004/login', 
          { username: payloads[i], password: 'any' },
          { headers: getHeaders() }
        );
      } catch (err) {
        addLog(`POST /login username="${payloads[i]}" -> Exploit Executed (500)`);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    
    addLog('SQL Injection completed.');
    setStatus('Attack Finished');
    setIsAttacking(false);
    if (onAttackComplete) onAttackComplete();
  };

  const simulateCredentialStuffing = async () => {
    setIsAttacking(true);
    setStatus('Running Credential Stuffing...');
    setLogs([]);
    addLog('Initiating Credential Stuffing Attack...');

    const users = ['john', 'mary', 'test', 'admin', 'guest'];
    
    for (let i = 0; i < users.length; i++) {
      try {
        await axios.post('http://localhost:5004/login', 
          { username: users[i], password: 'password123' },
          { headers: getHeaders() }
        );
      } catch (err) {
        addLog(`POST /login ${users[i]}:password123 -> Failed (401)`);
      }
      await new Promise(r => setTimeout(r, 300));
    }
    
    addLog('Credential Stuffing completed.');
    setStatus('Attack Finished');
    setIsAttacking(false);
    if (onAttackComplete) onAttackComplete();
  };

  return (
    <div className="glass-card p-5 mt-6 border-red-500/30 bg-red-900/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-red-400" />
          <h3 className="text-md font-bold text-slate-200">Vulnerable Cloud Simulator</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-1 rounded ${isAttacking ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            STATUS: {status.toUpperCase()}
          </span>
        </div>
      </div>
      
      <p className="text-xs text-slate-400 mb-4">
        Click a button below to launch an automated attack against the demo cloud (localhost:5004). Logs will automatically flow through the 4 ML services for real-time detection.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <button 
          onClick={simulateBruteForce} 
          disabled={isAttacking}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-amber-500/50 transition-all disabled:opacity-50"
        >
          <Cpu className="w-6 h-6 text-amber-400" />
          <span className="text-sm font-semibold text-slate-300">Brute Force</span>
        </button>

        <button 
          onClick={simulateSQLInjection} 
          disabled={isAttacking}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-red-500/50 transition-all disabled:opacity-50"
        >
          <Zap className="w-6 h-6 text-red-400" />
          <span className="text-sm font-semibold text-slate-300">SQL Injection</span>
        </button>

        <button 
          onClick={simulateCredentialStuffing} 
          disabled={isAttacking}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-purple-500/50 transition-all disabled:opacity-50"
        >
          <Network className="w-6 h-6 text-purple-400" />
          <span className="text-sm font-semibold text-slate-300">Credential Stuffing</span>
        </button>
      </div>

      <div className="bg-black/50 border border-slate-800 rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-emerald-400/80 leading-relaxed">
        {logs.length === 0 ? (
          <span className="text-slate-600">Waiting for attack sequence to begin...</span>
        ) : (
          logs.map((log, i) => (
            <div key={i}>{log}</div>
          ))
        )}
      </div>
    </div>
  );
}
