import React, { useState, useEffect, useRef, Fragment } from 'react';
import {
  Home, CalendarDays, History, Play, Square, Pause, CheckCircle2, Check,
  ChevronRight, ChevronLeft, Video, Moon, Sun, Trash2, Trophy, Lock,
  RotateCcw, X, ChevronDown, TrendingUp, Activity, Clock
} from 'lucide-react';
import { WORKOUTS, SCHEDULE } from './data';
import { SK, loadH, saveH, loadT, saveT, fm, fmF, fmD, fmT, isTodayDate, todayW, isComp, getEmbedUrl } from './utils';
import EvolutionChart from './EvolutionChart';

const App = () => {
  const [view, setView] = useState("home");
  const [tm, setTm] = useState(loadT());
  const [aw, setAw] = useState(null);
  const [sess, setSess] = useState(null);
  const [hist, setHist] = useState(loadH());
  const [selH, setSelH] = useState(null);

  const [sessionTime, setSessionTime] = useState(0);
  const [timers, setTimers] = useState({});
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const runningSets = useRef([]);
  const lastTick = useRef(Date.now());

  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [cancelWorkoutConfirm, setCancelWorkoutConfirm] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  const [expandedEx, setExpandedEx] = useState(0);
  const [resumeModal, setResumeModal] = useState(null);

  const today = todayW();

  useEffect(() => {
    if (tm === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [tm]);

  const toggleTheme = () => {
    const next = tm === 'dark' ? 'light' : 'dark';
    setTm(next); saveT(next);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const checkAndStartW = wid => {
    const startedAny = sess?.exercises.some(ex => ex.completed && ex.completed.some(s => s !== "idle" && s !== false)) || false;
    if (sess && sess.workoutId === wid && startedAny) {
      setResumeModal({ type: 'standby', wid });
      return;
    }

    const recentRecord = hist.find(h => h.workoutId === wid && isTodayDate(h.startedAt));
    if (recentRecord) setResumeModal({ type: 'history', wid, recentRecord });
    else initNewWorkout(wid);
  };

  const initNewWorkout = wid => {
    const w = WORKOUTS[wid];
    setAw(w);
    setSess({
      id: null, workoutId: wid, startedAt: new Date().toISOString(),
      exercises: w.exercises.map(ex => ({
        ...ex,
        completed: Array(ex.sets).fill("idle"),
        weights: Array(ex.sets).fill(""),
        repsCompleted: Array(ex.sets).fill("")
      })),
    });
    setTimers({});
    setSessionTime(0);
    setWorkoutStarted(false);
    setExpandedEx(0);
    setView("active");
    setResumeModal(null);
  };

  const continueWorkout = () => {
    const { wid, recentRecord } = resumeModal;
    const w = WORKOUTS[wid];
    setAw(w);

    const reconstructedExercises = w.exercises.map((baseEx, i) => {
      const histEx = recentRecord.exercises[i];
      return {
        ...baseEx,
        completed: histEx && histEx.completed ? [...histEx.completed] : Array(baseEx.sets).fill("idle"),
        weights: histEx && histEx.weights ? [...histEx.weights] : Array(baseEx.sets).fill(""),
        repsCompleted: histEx && histEx.repsCompleted ? [...histEx.repsCompleted] : Array(baseEx.sets).fill("")
      };
    });

    setSess({
      id: recentRecord.id,
      workoutId: wid,
      startedAt: recentRecord.startedAt,
      exercises: reconstructedExercises
    });

    const newTimers = {};
    if (recentRecord.exercises) {
      recentRecord.exercises.forEach((histEx, i) => {
        if (histEx.setTimes) {
          histEx.setTimes.forEach((t, si) => {
            if (t > 0) newTimers[`${i}-${si}`] = t;
          });
        }
      });
    }

    setTimers(newTimers);
    setSessionTime(recentRecord.totalWorkoutSeconds || 0);
    setWorkoutStarted(true);

    const firstUnfinishedIndex = reconstructedExercises.findIndex(ex => !ex.completed.every(isComp));
    setExpandedEx(firstUnfinishedIndex !== -1 ? firstUnfinishedIndex : 0);

    setView("active");
    setResumeModal(null);
  };

  useEffect(() => {
    if (!sess) {
      runningSets.current = [];
      return;
    }
    const active = [];
    sess.exercises.forEach((ex, ei) => {
      ex.completed.forEach((status, si) => {
        if (status === "running") active.push(`${ei}-${si}`);
      });
    });
    runningSets.current = active;
  }, [sess]);

  useEffect(() => {
    let intv;
    if (view === "active" && workoutStarted) {
      lastTick.current = Date.now();
      intv = setInterval(() => {
        const now = Date.now();
        const deltaSeconds = Math.round((now - lastTick.current) / 1000);

        if (deltaSeconds > 0) {
          setSessionTime(p => p + deltaSeconds);
          if (runningSets.current.length > 0) {
            setTimers(prev => {
              const next = { ...prev };
              runningSets.current.forEach(key => {
                next[key] = (next[key] || 0) + deltaSeconds;
              });
              return next;
            });
          }
          lastTick.current = now;
        }
      }, 1000);
    }
    return () => clearInterval(intv);
  }, [view, workoutStarted]);

  const handleSetStatus = (ei, si, newStatus) => {
    if (si > 0 && newStatus === "running" && !isComp(sess.exercises[ei].completed[si - 1])) {
      return;
    }

    if (!workoutStarted && newStatus === "running") setWorkoutStarted(true);

    setSess(p => {
      const next = { ...p, exercises: [...p.exercises] };
      const ex = { ...next.exercises[ei], completed: [...next.exercises[ei].completed] };
      ex.completed[si] = newStatus;
      next.exercises[ei] = ex;
      return next;
    });

    if (newStatus === "completed" && si === sess.exercises[ei].sets - 1) {
      if (ei < sess.exercises.length - 1) {
        setTimeout(() => setExpandedEx(prev => prev === ei ? ei + 1 : prev), 600);
      }
    }
  };

  const handleSetReset = (ei, si) => {
    if (sess) {
      if (si < sess.exercises[ei].completed.length - 1) {
        const nextStatus = sess.exercises[ei].completed[si + 1];
        if (nextStatus === "running" || nextStatus === "paused" || nextStatus === "completed") {
          alert("Desmarque a sessão seguinte antes de reiniciar esta.");
          return;
        }
      }
    }

    setSess(p => {
      const next = { ...p, exercises: [...p.exercises] };
      const ex = { ...next.exercises[ei], completed: [...next.exercises[ei].completed] };
      ex.completed[si] = "idle";
      next.exercises[ei] = ex;
      return next;
    });

    setTimers(prev => ({ ...prev, [`${ei}-${si}`]: 0 }));
  };

  const updateF = (f, ei, si, v) => {
    setSess(p => ({ ...p, exercises: p.exercises.map((ex, i) => { if (i !== ei) return ex; const a = [...ex[f]]; a[si] = v; return { ...ex, [f]: a }; }) }));
  };

  const finish = () => {
    const rec = {
      id: sess.id || Date.now(),
      workoutId: sess.workoutId,
      workoutName: aw.name,
      startedAt: sess.startedAt,
      finishedAt: new Date().toISOString(),
      totalWorkoutSeconds: sessionTime,
      exercises: sess.exercises.map((ex, i) => ({
        name: ex.name, sets: ex.sets, reps: ex.reps,
        completed: ex.completed, weights: ex.weights, repsCompleted: ex.repsCompleted,
        setTimes: ex.completed.map((_, si) => timers[`${i}-${si}`] || 0)
      })),
    };

    let updatedHist;
    if (sess.id) updatedHist = hist.map(h => h.id === sess.id ? rec : h);
    else updatedHist = [rec, ...hist];

    setHist(updatedHist);
    saveH(updatedHist);

    setSess(null); setAw(null); setTimers({});
    setWorkoutStarted(false);
    setView("done"); setTimeout(() => setView("home"), 2500);
  };

  const delRec = id => {
    const u = hist.filter(h => h.id !== id);
    setHist(u); saveH(u); setSelH(null); setDeleteConfirmId(null); setView("history");
  };

  const getExerciseEvolution = (exName) => {
    const stats = [];
    const sortedHist = [...hist].sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

    sortedHist.forEach(session => {
      if (!session.exercises) return;

      const ex = session.exercises.find(e => e.name === exName);
      if (ex && ex.weights && ex.completed) {
        let sessionMaxWeight = 0;
        let foundValidSet = false;

        ex.weights.forEach((w, si) => {
          const status = ex.completed[si];
          const isSetCompleted = isComp(status);
          const weightVal = parseFloat(w);

          if (isSetCompleted && !isNaN(weightVal) && weightVal > 0) {
            if (weightVal >= sessionMaxWeight) {
              sessionMaxWeight = weightVal;
              foundValidSet = true;
            }
          }
        });

        if (foundValidSet) {
          stats.push({ date: session.startedAt, maxWeight: sessionMaxWeight });
        }
      }
    });
    return stats;
  };

  const totDone = sess?.exercises.reduce((s, e) => s + (e.completed ? e.completed.filter(isComp).length : 0), 0) || 0;
  const totSets = sess?.exercises.reduce((s, e) => s + e.sets, 0) || 0;
  const prog = totSets > 0 ? (totDone / totSets) * 100 : 0;
  const hasStartedAnySet = sess?.exercises?.some(ex => ex.completed && ex.completed.some(s => s !== "idle" && s !== false)) || false;

  const renderNav = () => (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-2 pb-6 pt-3 z-50 transition-colors duration-300">
      {[{ id: "home", ic: Home, lb: "Início" }, { id: "schedule", ic: CalendarDays, lb: "Agenda" }, { id: "history", ic: History, lb: "Histórico" }, { id: "evolution", ic: TrendingUp, lb: "Evolução" }].map(x => (
        <button key={x.id} onClick={() => { setView(x.id); }} className={`flex flex-col items-center space-y-1 w-[72px] ${view === x.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
          <div className={`p-1.5 rounded-xl transition-colors ${view === x.id ? 'bg-blue-50 dark:bg-blue-900/30' : ''}`}>
            <x.ic className={`w-6 h-6 ${view === x.id ? 'stroke-[2.5]' : 'stroke-2'}`} />
          </div>
          <span className="text-[10px] font-bold tracking-wide">{x.lb}</span>
        </button>
      ))}
    </div>
  );

  const renderModals = () => (
    <Fragment>
      {resumeModal && resumeModal.type === 'history' && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-slate-900 dark:text-white">Treino finalizado hoje</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
              Já possui um registo para este treino hoje. Deseja reabrir para atualizar ou começar um novo?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={continueWorkout} className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-transform shadow-md shadow-blue-500/20">
                Reabrir treino de hoje
              </button>
              <button onClick={() => initNewWorkout(resumeModal.wid)} className="w-full py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">
                Começar Novo Treino
              </button>
              <button onClick={() => setResumeModal(null)} className="w-full py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {resumeModal && resumeModal.type === 'standby' && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Play className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-slate-900 dark:text-white">Treino em Andamento</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
              Você tem este treino em andamento (em standby). Deseja continuar o treino atual ou começar um novo?
            </p>
            <div className="flex flex-col gap-3">
              <button onClick={() => { setView("active"); setResumeModal(null); }} className="w-full py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white active:scale-95 transition-transform shadow-md shadow-blue-500/20">
                Continuar Treino
              </button>
              <button onClick={() => initNewWorkout(resumeModal.wid)} className="w-full py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">
                Começar Novo Treino
              </button>
              <button onClick={() => setResumeModal(null)} className="w-full py-3 rounded-xl font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 active:scale-95 transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-slate-900 dark:text-white">Tem certeza que deseja excluir?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
              Após a exclusão não será possível recuperar os dados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">
                Cancelar
              </button>
              <button onClick={() => delRec(deleteConfirmId)} className="flex-1 py-3 rounded-xl font-bold bg-red-500 text-white active:scale-95 transition-transform">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelWorkoutConfirm && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto">
              <Pause className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-center mb-2 text-slate-900 dark:text-white">Pausar treino?</h3>
            <p className="text-center text-slate-500 dark:text-slate-400 text-sm mb-6">
              Deseja sair do treino? Seu progresso atual ficará salvo em standby.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setCancelWorkoutConfirm(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 active:scale-95 transition-transform">
                Continuar
              </button>
              <button onClick={() => { setView("home"); setCancelWorkoutConfirm(false); }} className="flex-1 py-3 rounded-xl font-bold bg-amber-500 text-white active:scale-95 transition-transform">
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {activeVideo && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden w-full max-w-md shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-900 dark:text-white truncate pr-4">{activeVideo.name}</h3>
              <button onClick={() => setActiveVideo(null)} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full bg-black relative" style={{ height: "65vh", minHeight: "450px" }}>
              <iframe
                src={getEmbedUrl(activeVideo.video)}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                title={`Vídeo tutorial de ${activeVideo.name}`}
              />
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );

  const renderDone = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 animate-in fade-in zoom-in duration-500">
      <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/40 animate-bounce">
        <Trophy className="w-12 h-12 text-white" />
      </div>
      <h2 className="text-3xl font-extrabold mb-2 text-center text-slate-900 dark:text-white">Treino Concluído!</h2>
      <p className="text-slate-500 dark:text-slate-400 text-center font-medium text-lg">Seu progresso foi salvo no histórico.</p>
    </div>
  );

  const renderHome = () => (
    <div className="animate-in fade-in pb-24 mx-auto max-w-md">
      <div className="px-6 pt-8 pb-4 flex justify-between items-start">
        <div>
          <div className="text-sm font-semibold text-slate-500 mb-1">
            {new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"}, Isabella {tm === "light" ? "☀️" : "🌙"}
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Meus Treinos</h1>
        </div>
        <button onClick={toggleTheme} className="p-3 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-800 rounded-full text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform">
          {tm === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {today.workout ? (() => {
        const tw = WORKOUTS[today.workout];
        return (
          <div onClick={() => checkAndStartW(today.workout)} className="mx-4 mb-8 rounded-[2rem] p-6 cursor-pointer border shadow-lg transition-transform active:scale-[0.98]" style={{ backgroundColor: tm === 'dark' ? `${tw.color}11` : `${tw.color}08`, borderColor: `${tw.color}33`, boxShadow: tm === 'light' ? `0 10px 30px -10px ${tw.color}40` : 'none' }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest" style={{ backgroundColor: `${tw.color}25`, color: tw.color }}>Treino de Hoje</span>
              <span className="text-[11px] font-semibold text-slate-500">{today.day}-feira</span>
            </div>
            <div className="flex items-center gap-5">
              <div className="text-5xl drop-shadow-sm">{tw.icon}</div>
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-white leading-tight mb-1">{tw.name}</div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">{tw.target}</div>
                <div className="text-[11px] font-medium text-slate-500">{tw.exercises.length} exercícios • Intervalos de {tw.rest}</div>
              </div>
            </div>
            <div className="mt-6 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md" style={{ background: `linear-gradient(135deg, ${tw.color}, ${tw.color}DD)` }}>
              <Play className="w-4 h-4 fill-white" /> Começar Treino
            </div>
          </div>
        );
      })() : (
        <div className="mx-4 mb-8 rounded-[2rem] p-8 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center shadow-sm">
          <div className="text-5xl mb-3">🛌</div>
          <div className="text-xl font-bold text-slate-900 dark:text-white mb-1">Dia de Descanso</div>
          <div className="text-sm font-medium text-slate-500">Descanse bem para voltar mais forte amanhã!</div>
        </div>
      )}

      {hist.length > 0 && (
        <div className="px-4 mb-8">
          <div className="flex justify-between items-center mb-3 px-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Últimos Treinos</h3>
            <button onClick={() => setView("history")} className="text-[11px] font-bold text-blue-500 uppercase tracking-widest hover:text-blue-600 transition-colors">
              Ver Histórico
            </button>
          </div>
          <div className="space-y-3">
            {hist.slice(0, 2).map(h => {
              const w = WORKOUTS[h.workoutId];
              const dn = h.exercises.reduce((s, e) => s + (e.completed ? e.completed.filter(isComp).length : 0), 0);
              const tt = h.exercises.reduce((s, e) => s + e.sets, 0);
              const mins = Math.round((h.totalWorkoutSeconds || 0) / 60);

              return (
                <div key={h.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: `${w?.color || "#888"}22` }}>
                        {w?.icon || "🏋️"}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900 dark:text-white">{h.workoutName}</div>
                        <div className="text-[10px] font-medium text-slate-500 mt-0.5">{fmD(h.startedAt)} • {mins}min • {dn}/{tt} sessões</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="px-4">
        <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Todos os Programas</h3>
        <div className="space-y-3">
          {Object.values(WORKOUTS).map(w => (
            <div key={w.id} onClick={() => checkAndStartW(w.id)} className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer active:scale-[0.98] transition-all">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${w.color}15` }}>{w.icon}</div>
                <div className="flex-1">
                  <div className="text-base font-bold text-slate-900 dark:text-white">{w.name}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1 pr-2">{w.target}</div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black" style={{ color: w.color }}>{w.exercises.length}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Exer.</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderActive = () => {
    if (!sess || !aw) return null;
    const w = aw;
    return (
      <div className="animate-in fade-in mx-auto max-w-md">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={() => {
            if (!hasStartedAnySet) {
              setSess(null); setAw(null); setTimers({}); setWorkoutStarted(false); setView("home"); setCancelWorkoutConfirm(false);
            } else {
              setCancelWorkoutConfirm(true);
            }
          }} className="text-red-500 font-bold text-sm bg-red-50 dark:bg-red-900/20 px-3 py-1.5 rounded-full active:scale-95 transition-transform">
            Cancelar
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tempo Total</span>
            <div className="px-4 py-1.5 rounded-full font-bold font-mono text-lg transition-colors bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
              {fm(sessionTime)}
            </div>
          </div>
        </div>

        <div className="sticky top-[69px] z-30 h-1.5 w-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full transition-all duration-500 ease-out" style={{ width: `${prog}%`, backgroundColor: w.color }} />
        </div>

        <div className="p-6 pb-0">
          <div className="flex justify-between items-end">
            <div>
              <div className="text-3xl font-extrabold flex items-center gap-3 mb-1">
                <span>{w.icon}</span> {w.name}
              </div>
              <div className="text-sm font-medium text-slate-500 dark:text-slate-400">{w.target}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black" style={{ color: w.color }}>{totDone}<span className="text-slate-300 dark:text-slate-700 text-lg">/{totSets}</span></div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sessões</div>
            </div>
          </div>
        </div>

        <div className="px-4 pb-32 space-y-3 pt-6">
          {sess.exercises.map((ex, ei) => {
            const allDone = ex.completed && ex.completed.every(isComp);
            const isExpanded = expandedEx === ei;

            return (
              <div key={ex.id} className={`bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden shadow-sm border transition-all duration-300 
                ${allDone && !isExpanded ? 'border-transparent opacity-70 bg-slate-50 dark:bg-slate-900/50' :
                  isExpanded ? 'border-blue-200 dark:border-blue-900/50 ring-4 ring-blue-50 dark:ring-blue-900/10' :
                    'border-slate-200 dark:border-slate-800'}`}>

                <div onClick={() => setExpandedEx(isExpanded ? null : ei)} className={`p-4 flex justify-between items-center cursor-pointer transition-colors active:bg-slate-50 dark:active:bg-slate-800/50 ${isExpanded ? 'bg-blue-50/50 dark:bg-blue-900/10 border-b border-blue-100 dark:border-blue-900/30' : ''}`}>
                  <div className="flex items-center gap-4">
                    {allDone ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500 drop-shadow-sm flex-shrink-0" />
                    ) : (
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-colors ${isExpanded ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-slate-300 text-slate-400'}`}>
                        {ei + 1}
                      </div>
                    )}
                    <div className="flex-1">
                      <h3 className={`font-extrabold leading-tight transition-all ${allDone && !isExpanded ? 'text-slate-500 line-through decoration-slate-300' : isExpanded ? 'text-blue-600 dark:text-blue-400 text-lg' : 'text-slate-700 dark:text-slate-200 text-base'}`}>
                        {ex.name}
                      </h3>
                      {!isExpanded && <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Meta: {ex.sets} sessões • {ex.reps} rept</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isExpanded && ex.video && (
                      <button onClick={(e) => { e.stopPropagation(); setActiveVideo(ex); }} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400 hover:text-blue-500 transition-colors">
                        <Video className="w-4 h-4" />
                      </button>
                    )}
                    <div className={`p-1 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown className="w-5 h-5 text-slate-400" /></div>
                  </div>
                </div>

                <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="p-3 pt-4">
                    <div className="flex justify-between items-center mb-4 px-1">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Descanso {w.rest}</p>
                      {ex.video && (
                        <button onClick={() => setActiveVideo(ex)} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-[11px] font-bold active:scale-95 transition-transform">
                          <Video className="w-3.5 h-3.5" /> Ver Vídeo
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-[40px_1fr_1fr_50px_96px] gap-2 items-center px-2 mb-2">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Sessão</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Peso kg</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Rept</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Tempo</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Ação</div>
                    </div>

                    <div className="space-y-2">
                      {Array.from({ length: ex.sets }).map((_, si) => {
                        const status = ex.completed[si];
                        const isCompleted = isComp(status);
                        const isRunning = status === "running";
                        const isPaused = status === "paused";
                        const isLocked = si > 0 && !isComp(ex.completed[si - 1]);

                        return (
                          <div key={si} className={`grid grid-cols-[40px_1fr_1fr_50px_96px] gap-2 items-center p-1.5 rounded-2xl transition-all duration-300 ${isCompleted ? 'bg-green-50/50 dark:bg-green-900/10' : ''} ${isLocked ? 'opacity-60' : ''}`}>
                            <div className={`flex justify-center items-center text-sm font-bold ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                              {isLocked ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : si + 1}
                            </div>

                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="—"
                              value={ex.weights[si]}
                              onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E', ',', ' '].includes(e.key)) e.preventDefault();
                              }}
                              onChange={e => {
                                let val = e.target.value;
                                val = val.replace(/[^0-9.]/g, '');
                                const parts = val.split('.');
                                if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');

                                if (val === '' || !isNaN(Number(val))) {
                                  updateF("weights", ei, si, val);
                                }
                              }}
                              className={`w-full h-11 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-center font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isCompleted ? 'opacity-70' : ''}`}
                            />

                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder={ex.reps.toString().replace(/[^0-9]/g, '') || "—"}
                              value={ex.repsCompleted?.[si] ?? ""}
                              onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E', ',', '.', ' '].includes(e.key)) e.preventDefault();
                              }}
                              onChange={e => {
                                let val = e.target.value;
                                val = val.replace(/[^0-9]/g, '');
                                if (val === '' || (Number(val) > 0 && Number.isInteger(Number(val)))) {
                                  updateF("repsCompleted", ei, si, val);
                                }
                              }}
                              className={`w-full h-11 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-center font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isCompleted ? 'opacity-70' : ''}`}
                            />

                            <div className={`text-[11px] font-mono font-bold text-center ${isRunning ? 'text-red-500 dark:text-red-400 animate-pulse' : isPaused ? 'text-amber-500 dark:text-amber-400' : isCompleted ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                              {fm(timers[`${ei}-${si}`] || 0)}
                            </div>

                            <div className="flex items-center gap-1 w-full justify-end">
                              {isCompleted ? (
                                <>
                                  <button onClick={() => handleSetReset(ei, si)} disabled={isLocked} className="w-9 h-11 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-transform">
                                    <RotateCcw className="w-3.5 h-3.5" />
                                  </button>
                                  <div className="w-12 h-11 rounded-xl bg-green-500 border-2 border-green-500 shadow-md shadow-green-500/30 flex items-center justify-center">
                                    <Check className="w-5 h-5 stroke-[3] text-white" />
                                  </div>
                                </>
                              ) : isRunning || isPaused ? (
                                <>
                                  <button onClick={() => handleSetStatus(ei, si, isRunning ? "paused" : "running")} className={`w-10 h-11 rounded-xl flex items-center justify-center border-2 active:scale-90 transition-transform ${isRunning ? 'bg-amber-500 border-amber-500 shadow-md shadow-amber-500/30' : 'bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30'}`}>
                                    {isRunning ? <Pause className="w-4 h-4 fill-white text-white" /> : <Play className="w-4 h-4 fill-white text-white ml-0.5" />}
                                  </button>
                                  <button onClick={() => handleSetStatus(ei, si, "completed")} className="w-10 h-11 rounded-xl bg-red-500 border-2 border-red-500 shadow-md shadow-red-500/30 flex items-center justify-center active:scale-90 transition-transform">
                                    <Square className="w-3.5 h-3.5 fill-white text-white" />
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => handleSetStatus(ei, si, "running")} disabled={isLocked} className={`w-full h-11 rounded-xl flex items-center justify-center transition-all transform border-2 ${isLocked ? 'cursor-not-allowed bg-transparent border-slate-200 dark:border-slate-700' : 'active:scale-90 bg-blue-500 border-blue-500 shadow-md shadow-blue-500/30'}`}>
                                  {isLocked ? <Lock className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" /> : <Play className="w-4 h-4 fill-white text-white ml-0.5" />}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          <button onClick={finish} disabled={!hasStartedAnySet}
            className={`w-full py-5 rounded-[20px] font-extrabold text-lg shadow-xl flex items-center justify-center gap-2 mt-8 transition-all
            ${!hasStartedAnySet ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 cursor-not-allowed' :
                prog === 100 ? 'text-white active:scale-[0.98]' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-[0.98]'}`}
            style={hasStartedAnySet && prog === 100 ? { backgroundColor: w.color, boxShadow: `0 10px 25px -5px ${w.color}80` } : {}}>
            {!hasStartedAnySet ? "Inicie uma sessão primeiro" :
              prog === 100 ? <><Trophy className="w-5 h-5" /> Finalizar Treino!</> : `Finalizar Treino (${Math.round(prog)}%)`}
          </button>
        </div>
      </div>
    );
  };

  const renderSchedule = () => (
    <div className="animate-in fade-in p-6 pb-24 mx-auto max-w-md">
      <h2 className="text-2xl font-bold mb-6">Agenda da Semana</h2>
      <div className="space-y-4">
        {SCHEDULE.map(s => {
          const w = s.workout ? WORKOUTS[s.workout] : null;
          return (
            <div key={s.day} className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center gap-4 shadow-sm">
              <div className="font-bold w-20 text-slate-500 dark:text-slate-400">{s.day}</div>
              {w ? (
                <div onClick={() => checkAndStartW(s.workout)} className="flex items-center gap-3 cursor-pointer flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl hover:scale-[1.02] transition-transform">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm" style={{ backgroundColor: `${w.color}22` }}>
                    {w.icon}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white leading-tight">{w.name}</div>
                    <div className="text-[10px] text-slate-500">{w.target}</div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 dark:bg-slate-800 dark:border-slate-700 flex items-center justify-center">
                  <span className="text-slate-400 font-medium text-sm">Descanso Geral</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in p-6 pb-24 mx-auto max-w-md">
      <h2 className="text-2xl font-bold mb-6">Histórico de Treinos</h2>
      {hist.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
          <History className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500 font-medium tracking-tight">Você ainda não tem registros de treino.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hist.map(h => (
            <div key={h.id} className="p-5 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
              <div className="absolute top-4 right-4">
                <button onClick={() => setDeleteConfirmId(h.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl bg-slate-50 dark:bg-slate-800 border-2" style={{ borderColor: `${WORKOUTS[h.workoutId]?.color || '#cbd5e1'}50` }}>
                  {WORKOUTS[h.workoutId]?.icon || "🏋️"}
                </div>
                <div className="flex-1" onClick={() => { setSelH(h); setView("historyDetail"); }} style={{ cursor: "pointer" }}>
                  <h3 className="font-extrabold text-xl leading-none tracking-tight hover:text-blue-500 transition-colors">{h.workoutName}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-semibold mt-1">
                    {fmD(h.startedAt)} às {fmT(h.startedAt)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Duração</div>
                  <div className="font-mono font-bold text-slate-700 dark:text-slate-300">{fmF(h.totalWorkoutSeconds || 0)}</div>
                </div>
                <div className="flex-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sessões Concluídas</div>
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    {h.exercises.reduce((s, e) => s + (e.completed ? e.completed.filter(isComp).length : 0), 0)} / {h.exercises.reduce((s, e) => s + e.sets, 0)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistoryDetail = () => {
    if (!selH) return null;
    const wConfig = WORKOUTS[selH.workoutId];

    return (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 mx-auto max-w-md bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-4 py-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 shadow-sm">
          <button onClick={() => { setView("history"); setSelH(null); }} className="p-2 -ml-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors active:scale-95">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">Detalhes do Treino</h2>
            <p className="text-xs font-medium text-slate-500">{fmD(selH.startedAt)} às {fmT(selH.startedAt)}</p>
          </div>
        </div>

        <div className="p-6 pb-24 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-slate-50 dark:bg-slate-800 border-2" style={{ borderColor: `${wConfig?.color || '#cbd5e1'}50` }}>
                {wConfig?.icon || "🏋️"}
              </div>
              <div>
                <h3 className="font-black text-2xl text-slate-900 dark:text-white">{selH.workoutName}</h3>
                <p className="text-sm font-semibold text-slate-500">{wConfig?.target || "Treino Personalizado"}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duração Total</div>
                <div className="font-mono text-xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> {fmF(selH.totalWorkoutSeconds || 0)}
                </div>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Conclusão</div>
                <div className="text-xl font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  {selH.exercises.reduce((s, e) => s + (e.completed ? e.completed.filter(isComp).length : 0), 0)} / {selH.exercises.reduce((s, e) => s + e.sets, 0)}
                </div>
              </div>
            </div>
          </div>

          <h3 className="font-extrabold text-lg px-2 text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Exercícios Realizados
          </h3>

          <div className="space-y-4">
            {selH.exercises.map((ex, ei) => {
              const completedCount = ex.completed ? ex.completed.filter(isComp).length : 0;
              const isAllCompleted = completedCount === ex.sets;

              return (
                <div key={ei} className={`bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border shadow-sm transition-all duration-300 ${isAllCompleted ? 'border-green-200 dark:border-green-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
                  <div className={`p-4 flex justify-between items-center ${isAllCompleted ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                    <div className="flex items-center gap-4">
                      {isAllCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-slate-300 text-slate-400 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {ei + 1}
                        </div>
                      )}
                      <div>
                        <h4 className={`font-bold text-base ${isAllCompleted ? 'text-green-700 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                          {ex.name}
                        </h4>
                        <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                          {completedCount} de {ex.sets} séries concluídas • Meta: {ex.reps}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 pt-0 bg-slate-50/50 dark:bg-slate-900">
                    <div className="grid grid-cols-[40px_1fr_60px] gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800/60 mb-2">
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Série</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Peso Utilizado</div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center">Tempo</div>
                    </div>

                    <div className="space-y-1.5">
                      {Array.from({ length: ex.sets }).map((_, si) => {
                        const isSetCompleted = isComp(ex.completed?.[si]);
                        const weight = ex.weights?.[si] || "—";
                        const time = ex.setTimes?.[si] || 0;

                        return (
                          <div key={si} className={`grid grid-cols-[40px_1fr_60px] gap-2 items-center p-2 rounded-xl text-sm font-medium ${isSetCompleted ? 'bg-white dark:bg-slate-800/80 shadow-sm' : 'opacity-50 grayscale'}`}>
                            <div className={`text-center font-bold ${isSetCompleted ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}`}>
                              {si + 1}
                            </div>
                            <div className={`text-center font-bold ${isSetCompleted && weight !== "—" ? 'text-blue-600 dark:text-blue-400 text-base' : 'text-slate-400'}`}>
                              {weight !== "—" ? `${weight} kg` : "Sem peso"}
                            </div>
                            <div className="text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                              {time > 0 ? fm(time) : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderEvolution = () => {
    const allExercises = new Set();
    hist.forEach(h => h.exercises?.forEach(ex => allExercises.add(ex.name)));

    const evolvingStats = Array.from(allExercises).map(exName => {
      const stats = getExerciseEvolution(exName);
      if (stats.length === 0) return null;

      const firstWeight = stats[0].maxWeight;
      const lastWeight = stats[stats.length - 1].maxWeight;
      const diff = lastWeight - firstWeight;
      const percent = firstWeight > 0 ? (diff / firstWeight) * 100 : 0;

      return { exName, stats, firstWeight, lastWeight, diff, percent };
    }).filter(Boolean).sort((a, b) => b.stats.length - a.stats.length);

    return (
      <div className="animate-in fade-in p-6 pb-24 mx-auto max-w-md">
        <h2 className="text-2xl font-bold mb-2">Evolução</h2>
        <p className="text-slate-500 text-sm font-medium mb-6">Acompanhe seu progresso de carga nos exercícios.</p>

        {evolvingStats.length === 0 ? (
          <div className="text-center p-8 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-8">
            <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">Você precisa registrar treinos com peso para ver sua evolução.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {evolvingStats.map(({ exName, stats, firstWeight, lastWeight, diff, percent }) => (
              <div key={exName} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <h3 className="font-extrabold text-lg flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${diff > 0 ? 'bg-green-50 text-green-600 dark:bg-green-900/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-900/30'}`}>
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  {exName}
                </h3>

                {stats.length > 1 && (
                  <div className="flex gap-3 mt-4 mb-6">
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Início</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{firstWeight} kg</span>
                    </div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl flex flex-col items-center justify-center">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Atual</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{lastWeight} kg</span>
                    </div>
                    <div className={`flex-1 p-3 rounded-2xl flex flex-col items-center justify-center border ${diff > 0 ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800/40' : 'bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aumento</span>
                      <span className={`text-sm font-bold ${diff > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                        {diff > 0 ? `+${percent.toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  </div>
                )}

                <div className={stats.length <= 1 ? "mt-6" : ""}>
                  <EvolutionChart stats={stats} color={diff > 0 ? "#10B981" : "#3B82F6"} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen transition-colors duration-300 relative bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {view === 'home' && renderHome()}
      {view === 'active' && renderActive()}
      {view === 'done' && renderDone()}
      {view === 'schedule' && renderSchedule()}
      {view === 'history' && renderHistory()}
      {view === 'historyDetail' && renderHistoryDetail()}
      {view === 'evolution' && renderEvolution()}

      {view !== 'historyDetail' && view !== 'active' && view !== 'done' && renderNav()}
      {renderModals()}
    </div>
  );
};

export default App;
