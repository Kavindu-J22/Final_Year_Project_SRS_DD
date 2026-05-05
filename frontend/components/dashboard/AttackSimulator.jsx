import { useState } from 'react';
import axios from 'axios';
import { Terminal, ShieldAlert, Cpu, Network, Zap, Ghost, Map, Clock } from 'lucide-react';

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

  const simulateBotnet = async () => {
    setIsAttacking(true); setStatus('Botnet Brute Force...'); setLogs([]);
    addLog('Initiating high-velocity Botnet attack...');

    const passwords = ['123456', 'password', 'admin123', 'qwerty', 'admin'];
    // Fast loop to trigger request_velocity anomaly
    for (let i = 0; i < passwords.length; i++) {
      try {
        await axios.post(`http://localhost:5004/login?ip=104.28.10.1`, 
          { username: 'admin', password: passwords[i] }, { headers: getHeaders() });
        addLog(`POST /login admin:${passwords[i]} -> Success`);
      } catch (err) {
        addLog(`POST /login admin:${passwords[i]} -> Failed (401)`);
      }
      await new Promise(r => setTimeout(r, 50)); // Superhuman speed
    }
    
    addLog('Botnet attack completed.');
    finishAttack();
  };

  const simulateInsider = async () => {
    setIsAttacking(true); setStatus('Insider Exfiltration...'); setLogs([]);
    addLog('Initiating Insider Threat (Time/Data Anomaly)...');

    // Spoof time to 3:00 AM
    let d = new Date();
    d.setHours(3, 0, 0, 0);

    for (let i = 0; i < 5; i++) {
      try {
        await axios.get(`http://localhost:5004/files?path=document_${i}.pdf&ip=45.33.22.1&time=${d.toISOString()}`, 
          { headers: getHeaders() });
        addLog(`[3:00 AM] GET /files?path=document_${i}.pdf -> Downloaded`);
      } catch (err) {}
      await new Promise(r => setTimeout(r, 100)); 
    }
    
    addLog('Data exfiltration completed.');
    finishAttack();
  };

  const simulateImpossibleTravel = async () => {
    setIsAttacking(true); setStatus('Impossible Travel...'); setLogs([]);
    addLog('Initiating Impossible Travel (Account Takeover)...');

    try {
      // 1. USA IP Login
      await axios.post(`http://localhost:5004/login?ip=45.33.22.1`, 
        { username: 'ceo', password: 'ceo' }, { headers: getHeaders() });
      addLog(`[USA IP: 45.33.22.1] Login -> Success`);
      
      await new Promise(r => setTimeout(r, 500));
      
      // 2. North Korea IP File Access 1 second later
      await axios.get(`http://localhost:5004/files?path=secrets.txt&ip=175.45.176.1`, 
        { headers: getHeaders() });
      addLog(`[NK IP: 175.45.176.1] GET /files -> Accessed`);
    } catch (err) {}
    
    addLog('Impossible travel anomaly triggered.');
    finishAttack();
  };

  const simulateAPT = async () => {
    setIsAttacking(true); setStatus('APT Kill-Chain...'); setLogs([]);
    addLog('Initiating Advanced Persistent Threat (APT) sequence...');

    try {
      const attackerIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
      const targetUser = `admin_${Math.floor(Math.random() * 900) + 100}`;
      
      // Stage 1: Reconnaissance (Brute Force)
      addLog(`[Stage 1] Brute forcing credentials for ${targetUser} from ${attackerIp}...`);
      for (let i = 0; i < 5; i++) {
        await axios.post(`http://localhost:5004/login?ip=${attackerIp}`, 
          { username: targetUser, password: `pass${i}` }, { headers: getHeaders() }).catch(() => {});
      }
      addLog('[Stage 1] Brute force triggered. AI Forecast predicting next move...');
      
      // Pause for AI to predict
      await new Promise(r => setTimeout(r, 4000));
      
      // Stage 2: Initial Access (Successful Login)
      addLog('[Stage 2] Executing successful login (Initial Access)...');
      await axios.post(`http://localhost:5004/login?ip=${attackerIp}`, 
          { username: targetUser, password: `admin` }, { headers: getHeaders() }).catch(() => {});
      addLog('[Stage 2] Initial Access achieved. AI will recalculate forecast...');
      
      // Pause
      await new Promise(r => setTimeout(r, 4000));
      
      // Stage 3: Privilege/Exfiltration
      addLog('[Stage 3] Accessing confidential files (Exfiltration)...');
      await axios.get(`http://localhost:5004/files?path=passwords.txt&ip=${attackerIp}`, { headers: getHeaders() }).catch(() => {});
      addLog('[Stage 3] Exfiltration complete.');
      
    } catch (err) {}
    
    addLog('APT sequence completed.');
    finishAttack();
  };

  const finishAttack = () => {
    setStatus('Attack Finished');
    setIsAttacking(false);
    if (onAttackComplete) setTimeout(() => onAttackComplete(), 500);
  };

  return (
    <div className="glass-card p-5 mt-6 border-red-500/30 bg-red-900/5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-red-400" />
          <h3 className="text-md font-bold text-slate-200">Threat Persona Simulator</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono px-2 py-1 rounded ${isAttacking ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
            STATUS: {status.toUpperCase()}
          </span>
        </div>
      </div>
      
      <p className="text-xs text-slate-400 mb-4">
        Select an attacker persona to launch against the demo cloud. The stateful ML models will analyze behavioral contexts (velocity, geo-location, time, and sequences) in real-time.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <button 
          onClick={simulateBotnet} disabled={isAttacking}
          className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-red-500/50 transition-all disabled:opacity-50"
        >
          <Cpu className="w-5 h-5 text-red-400" />
          <span className="text-[11px] font-semibold text-slate-300">Botnet Brute Force<br/><span className="text-[9px] text-slate-500 font-normal">(Triggers Velocity ML)</span></span>
        </button>

        <button 
          onClick={simulateInsider} disabled={isAttacking}
          className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-amber-500/50 transition-all disabled:opacity-50"
        >
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="text-[11px] font-semibold text-slate-300">Insider Threat<br/><span className="text-[9px] text-slate-500 font-normal">(Triggers Time/File ML)</span></span>
        </button>

        <button 
          onClick={simulateImpossibleTravel} disabled={isAttacking}
          className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-cyan-500/50 transition-all disabled:opacity-50"
        >
          <Map className="w-5 h-5 text-cyan-400" />
          <span className="text-[11px] font-semibold text-slate-300">Impossible Travel<br/><span className="text-[9px] text-slate-500 font-normal">(Triggers Geo ML)</span></span>
        </button>

        <button 
          onClick={simulateAPT} disabled={isAttacking}
          className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-purple-500/50 transition-all disabled:opacity-50"
        >
          <Ghost className="w-5 h-5 text-purple-400" />
          <span className="text-[11px] font-semibold text-slate-300">Advanced APT<br/><span className="text-[9px] text-slate-500 font-normal">(Triggers Threat Forecast)</span></span>
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
