import { useState } from 'react';
import axios from 'axios';
import { Terminal, ShieldAlert, Cpu, Network, Zap, Ghost, Map, Clock, Database, Key, Unlock, FileWarning, Trash2, EyeOff, FolderOpen, UploadCloud } from 'lucide-react';

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

  const baseReq = async (method, path, data = null) => {
    try {
      if (method === 'POST') await axios.post(`http://localhost:5004${path}`, data, { headers: getHeaders() });
      else if (method === 'GET') await axios.get(`http://localhost:5004${path}`, { headers: getHeaders() });
      else if (method === 'DELETE') await axios.delete(`http://localhost:5004${path}`, { headers: getHeaders() });
    } catch(e) {}
  };

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  // 1. Botnet Brute Force (Deep)
  const simulateBotnet = async () => {
    setIsAttacking(true); setStatus('Botnet Brute Force...'); setLogs([]);
    const ip = '104.28.10.1';
    addLog(`[Stage 1] Botnet performing reconnaissance from ${ip}...`);
    await baseReq('GET', `/files?path=public_index.html&ip=${ip}`);
    await sleep(500);
    
    addLog('[Stage 2] Launching high-velocity credential stuffing...');
    const passwords = ['123456', 'password', 'admin123', 'qwerty', 'admin'];
    for (let i = 0; i < passwords.length; i++) {
      await baseReq('POST', `/login?ip=${ip}`, { username: 'admin', password: passwords[i] });
      addLog(`POST /login admin:${passwords[i]} -> 401 Unauthorized`);
      await sleep(100);
    }
    addLog('[Stage 3] ML Velocity Engine triggered. IP blocked.');
    finishAttack();
  };

  // 2. Insider Threat (Deep)
  const simulateInsider = async () => {
    setIsAttacking(true); setStatus('Insider Exfiltration...'); setLogs([]);
    const ip = '10.0.1.55';
    
    addLog('[Stage 1] Employee logging in during standard business hours...');
    await baseReq('POST', `/login?ip=${ip}`, { username: 'john.doe', password: 'password1' });
    await sleep(800);
    
    addLog('[Stage 2] Employee enters dormant state. Simulating wait time...');
    let d = new Date(); d.setHours(3, 0, 0, 0); // 3:00 AM spoof
    await sleep(800);
    
    addLog(`[Stage 3] Suspicious off-hours activity detected at ${d.toLocaleTimeString()}...`);
    for (let i = 0; i < 4; i++) {
      await baseReq('GET', `/files?path=confidential_q${i}_report.pdf&ip=${ip}&time=${d.toISOString()}`);
      addLog(`GET /files?path=confidential_q${i}_report.pdf -> Downloaded`);
      await sleep(200); 
    }
    addLog('[Stage 4] Massive data exfiltration sequence complete.');
    finishAttack();
  };

  // 3. Impossible Travel (Deep)
  const simulateImpossibleTravel = async () => {
    setIsAttacking(true); setStatus('Impossible Travel...'); setLogs([]);
    addLog('[Stage 1] Legitimate login detected from Corporate VPN (USA).');
    await baseReq('POST', '/login?ip=45.33.22.1', { username: 'ceo', password: 'ceo' });
    addLog(`[USA IP: 45.33.22.1] Login -> Success`);
    await sleep(1000);
    
    addLog('[Stage 2] Token hijacked. Secondary login attempted from North Korea...');
    await baseReq('POST', '/simulate_event?type=ImpossibleTravel&ip=175.45.176.1&user=ceo');
    addLog(`[NK IP: 175.45.176.1] GET /files -> Accessed`);
    await sleep(500);
    
    addLog('[Stage 3] Geo-velocity anomaly calculated (Distance/Time impossible).');
    finishAttack();
  };

  // 4. Advanced APT (Deep)
  const simulateAPT = async () => {
    setIsAttacking(true); setStatus('APT Kill-Chain...'); setLogs([]);
    const attackerIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
    const targetUser = `sysadmin`;
    
    addLog(`[Stage 1: Recon] Brute forcing credentials for ${targetUser}...`);
    for (let i = 0; i < 3; i++) {
        await baseReq('POST', `/login?ip=${attackerIp}`, { username: targetUser, password: `pass${i}` });
        await sleep(300);
    }
    
    addLog('[Stage 2: Initial Access] Compromising account via weak credentials...');
    await baseReq('POST', `/login?ip=${attackerIp}`, { username: targetUser, password: 'admin' });
    await sleep(1000);
    
    addLog('[Stage 3: Exfiltration] Accessing confidential passwords.txt...');
    await baseReq('GET', `/files?path=passwords.txt&ip=${attackerIp}`);
    await sleep(800);

    addLog('[Stage 4: Defense Evasion] Attempting to clear audit trails...');
    await baseReq('DELETE', `/logs?ip=${attackerIp}`);
    
    addLog('Advanced Persistent Threat complete.');
    finishAttack();
  };

  // 5. SQL Injection (Deep)
  const simulateSQLi = async () => {
    setIsAttacking(true); setStatus('SQL Injection...'); setLogs([]);
    const ip = '192.168.1.15';
    
    addLog('[Stage 1] Probing authentication endpoints for vulnerabilities...');
    await baseReq('POST', `/login?ip=${ip}`, { username: "admin'", password: 'any' });
    addLog(`POST /login username="admin'" -> 500 Internal Server Error`);
    await sleep(1000);
    
    addLog('[Stage 2] Exploiting identified SQL vulnerability with UNION SELECT...');
    const payload = "admin' OR '1'='1";
    await baseReq('POST', `/login?ip=${ip}`, { username: payload, password: 'any' });
    addLog(`POST /login username="${payload}" -> Auth Bypass Success`);
    await sleep(800);
    
    addLog('[Stage 3] Dumping user database schema...');
    await baseReq('GET', `/files?path=db_dump.sql&ip=${ip}`);
    addLog('SQL Injection exploitation chain complete.');
    finishAttack();
  };

  // 6. Credential Stuffing (Deep)
  const simulateCredStuffing = async () => {
    setIsAttacking(true); setStatus('Credential Stuffing...'); setLogs([]);
    addLog('[Stage 1] Purchasing leaked credential database from dark web...');
    await sleep(800);
    
    addLog('[Stage 2] Distributing attack across 50 proxy IPs...');
    await baseReq('POST', '/simulate_event?type=CredentialStuffing&ip=185.12.3.4');
    addLog('185.12.3.4: admin/123456 -> Failed');
    addLog('18.22.31.2: root/admin -> Failed');
    addLog('44.11.22.3: jsmith/password123 -> Success!');
    
    await sleep(1000);
    addLog('[Stage 3] ML Distributed-IP anomaly detected.');
    finishAttack();
  };

  // 7. Privilege Escalation (Deep)
  const simulatePrivEscalation = async () => {
    setIsAttacking(true); setStatus('Privilege Escalation...'); setLogs([]);
    const ip = '10.0.5.10';
    
    addLog('[Stage 1] Standard user "guest" logged in successfully.');
    await baseReq('POST', `/login?ip=${ip}`, { username: 'guest', password: 'password' });
    await sleep(800);
    
    addLog('[Stage 2] User discovering IAM policy configurations...');
    await baseReq('GET', `/files?path=iam_roles.json&ip=${ip}`);
    await sleep(800);
    
    addLog('[Stage 3] User attempting to attach "AdministratorAccess" to self...');
    await baseReq('POST', `/privilege?action=admin&ip=${ip}`);
    addLog('POST /privilege action=admin -> Escalation Triggered');
    
    finishAttack();
  };

  // 8. Ransomware (Deep)
  const simulateRansomware = async () => {
    setIsAttacking(true); setStatus('Ransomware...'); setLogs([]);
    const ip = '45.22.11.9';
    
    addLog('[Stage 1] Initial access via compromised service account...');
    await baseReq('POST', `/login?ip=${ip}`, { username: 'service_acc', password: 'password' });
    await sleep(800);
    
    addLog('[Stage 2] Scanning cloud storage buckets for targeting...');
    await baseReq('GET', `/files?path=backup_list.txt&ip=${ip}`);
    await sleep(800);
    
    addLog('[Stage 3] Executing high-speed mass encryption algorithm...');
    await baseReq('POST', `/ransomware?count=1543&ip=${ip}`);
    addLog('1,543 files rapidly encrypted with AES-256 in 2.3 seconds.');
    await sleep(800);
    
    addLog('[Stage 4] Dropping ransom note...');
    await baseReq('POST', `/upload?filename=DECRYPT_MY_FILES.txt&ip=${ip}`);
    
    finishAttack();
  };

  // 9. Defense Evasion (Deep)
  const simulateEvasion = async () => {
    setIsAttacking(true); setStatus('Defense Evasion...'); setLogs([]);
    const ip = '203.0.113.1';
    
    addLog('[Stage 1] Attacker executes malicious actions...');
    await baseReq('GET', `/files?path=sensitive.doc&ip=${ip}`);
    await sleep(800);
    
    addLog('[Stage 2] Attempting to cover tracks by modifying CloudTrail configurations...');
    await baseReq('POST', `/privilege?action=disable_logs&ip=${ip}`);
    await sleep(800);
    
    addLog('[Stage 3] Executing permanent deletion of audit logs...');
    await baseReq('DELETE', `/logs?ip=${ip}`);
    addLog('DELETE /logs -> Success (Audit Trail Cleared)');
    
    finishAttack();
  };

  // 10. Low & Slow AI Evasion (Deep)
  const simulateLowSlow = async () => {
    setIsAttacking(true); setStatus('Low & Slow Evasion...'); setLogs([]);
    addLog('[Stage 1] Attacker probing rate-limit thresholds...');
    await sleep(800);
    
    addLog('[Stage 2] Interweaving malicious auth attempts with legitimate traffic...');
    for (let i = 0; i < 3; i++) {
        addLog(`[Delay: ${15 + i*2} mins] Single authentication attempt fired.`);
        await sleep(400);
    }
    
    await baseReq('POST', '/simulate_event?type=LowAndSlow&ip=104.28.10.2');
    addLog('[Stage 3] Time-Series ML engine correlates delayed sequence as malicious.');
    finishAttack();
  };

  // 11. Path Traversal (Deep)
  const simulatePathTraversal = async () => {
    setIsAttacking(true); setStatus('Path Traversal...'); setLogs([]);
    const ip = '172.16.0.4';
    
    addLog('[Stage 1] Exploring web server directory structure...');
    await baseReq('GET', `/files?path=images/logo.png&ip=${ip}`);
    await sleep(600);
    
    addLog('[Stage 2] Attempting Local File Inclusion (LFI) via traversal payload...');
    await baseReq('GET', `/files?path=../../../../etc/passwd&ip=${ip}`);
    addLog('GET /files?path=../../../../etc/passwd -> 403 Forbidden');
    await sleep(600);
    
    addLog('[Stage 3] Attempting alternate URL-encoded traversal...');
    await baseReq('GET', `/files?path=..%2F..%2Fetc%2Fshadow&ip=${ip}`);
    addLog('Path Traversal exploitation sequence complete.');
    
    finishAttack();
  };

  // 12. Malicious File Upload (Deep)
  const simulateWebShell = async () => {
    setIsAttacking(true); setStatus('Web Shell Upload...'); setLogs([]);
    const ip = '11.22.33.44';
    
    addLog('[Stage 1] Bypassing client-side file extension validation...');
    await sleep(800);
    
    addLog('[Stage 2] Uploading obfuscated PHP reverse-shell...');
    await baseReq('POST', `/upload?filename=c99_shell.php&ip=${ip}`);
    addLog('POST /upload filename=c99_shell.php -> 201 Created');
    await sleep(800);
    
    addLog('[Stage 3] Executing uploaded shell payload to gain RCE...');
    await baseReq('GET', `/files?path=c99_shell.php&cmd=whoami&ip=${ip}`);
    addLog('Web Shell exploitation chain complete.');
    
    finishAttack();
  };

  const finishAttack = () => {
    setStatus('Attack Finished');
    setIsAttacking(false);
    if (onAttackComplete) setTimeout(() => onAttackComplete(), 500);
  };

  const ATTACKS = [
    { name: 'Botnet Brute Force', icon: <Cpu className="w-5 h-5 text-red-400" />, sub: 'Velocity ML', fn: simulateBotnet },
    { name: 'Insider Threat', icon: <Clock className="w-5 h-5 text-amber-400" />, sub: 'Time Anomaly', fn: simulateInsider },
    { name: 'Impossible Travel', icon: <Map className="w-5 h-5 text-cyan-400" />, sub: 'Geo ML', fn: simulateImpossibleTravel },
    { name: 'Advanced APT', icon: <Ghost className="w-5 h-5 text-purple-400" />, sub: 'Kill-Chain', fn: simulateAPT },
    { name: 'SQL Injection', icon: <Database className="w-5 h-5 text-emerald-400" />, sub: 'Payload ML', fn: simulateSQLi },
    { name: 'Credential Stuffing', icon: <Network className="w-5 h-5 text-pink-400" />, sub: 'Distributed IP', fn: simulateCredStuffing },
    { name: 'Privilege Escalation', icon: <Unlock className="w-5 h-5 text-orange-400" />, sub: 'IAM Misuse', fn: simulatePrivEscalation },
    { name: 'Ransomware', icon: <FileWarning className="w-5 h-5 text-red-500" />, sub: 'Mass Modification', fn: simulateRansomware },
    { name: 'Defense Evasion', icon: <Trash2 className="w-5 h-5 text-slate-400" />, sub: 'Log Deletion', fn: simulateEvasion },
    { name: 'Low & Slow Evasion', icon: <EyeOff className="w-5 h-5 text-blue-400" />, sub: 'Time-Series ML', fn: simulateLowSlow },
    { name: 'Path Traversal', icon: <FolderOpen className="w-5 h-5 text-teal-400" />, sub: 'LFI Attempt', fn: simulatePathTraversal },
    { name: 'Web Shell Upload', icon: <UploadCloud className="w-5 h-5 text-fuchsia-400" />, sub: 'Malicious File', fn: simulateWebShell },
  ];

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
        Select from 12 distinct multi-stage attacker personas. Each attack executes a highly realistic kill-chain sequence, generating rich, interconnected forensic data for the ML engine.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {ATTACKS.map((attack, i) => (
          <button 
            key={i} onClick={attack.fn} disabled={isAttacking}
            className="flex flex-col items-center text-center gap-2 p-3 rounded-lg border border-slate-700 bg-slate-900/60 hover:bg-slate-800 hover:border-red-500/50 transition-all disabled:opacity-50 group"
          >
            <div className="group-hover:scale-110 transition-transform duration-300">
              {attack.icon}
            </div>
            <span className="text-[11px] font-semibold text-slate-300 leading-tight">
              {attack.name}
              <br/>
              <span className="text-[9px] text-slate-500 font-normal">({attack.sub})</span>
            </span>
          </button>
        ))}
      </div>

      <div className="bg-black/50 border border-slate-800 rounded-lg p-3 h-40 overflow-y-auto font-mono text-[10px] text-emerald-400/80 leading-relaxed custom-scrollbar">
        {logs.length === 0 ? (
          <span className="text-slate-600">Waiting for attack sequence to begin...</span>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="animate-in fade-in duration-300">{log}</div>
          ))
        )}
      </div>
    </div>
  );
}
