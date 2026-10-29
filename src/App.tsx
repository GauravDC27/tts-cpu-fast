/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { CandidateMatrix } from './components/CandidateMatrix';
import { HardwareSimulator } from './components/HardwareSimulator';
import { TrainingPlaybook } from './components/TrainingPlaybook';
import { AudioProsodySandbox } from './components/AudioProsodySandbox';
import { ExecutiveDecision } from './components/ExecutiveDecision';
import { KokoroVsStyleTTSShowdown } from './components/KokoroVsStyleTTSShowdown';
import { H200ClusterMonitor } from './components/H200ClusterMonitor';
import { ArgonJudgeDashboard } from './components/ArgonJudgeDashboard';
import { OmnivoiceAnalysisModal } from './components/OmnivoiceAnalysisModal';
import { ModelDetailDrawer } from './components/ModelDetailDrawer';
import { DeploymentHubModal } from './components/DeploymentHubModal';
import { TTS_CANDIDATES, TTSModelCandidate } from './utils/tts-benchmark';
import { 
  Sparkles, 
  Cpu, 
  Laptop, 
  CheckCircle2, 
  ExternalLink,
  BookOpen,
  Zap,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'candidates' | 'decision' | 'showdown' | 'simulator' | 'training' | 'sandbox' | 'h200' | 'argon'>('argon');
  const [isOmnivoiceModalOpen, setIsOmnivoiceModalOpen] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);
  const [selectedDrawerModel, setSelectedDrawerModel] = useState<TTSModelCandidate | null>(null);

  const handleOpenTrainingForModel = (modelId: string) => {
    setActiveTab('training');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenOmnivoiceModal={() => setIsOmnivoiceModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'argon' && (
          <ArgonJudgeDashboard />
        )}

        {activeTab === 'h200' && (
          <H200ClusterMonitor />
        )}

        {activeTab === 'showdown' && (
          <KokoroVsStyleTTSShowdown />
        )}

        {activeTab === 'decision' && (
          <ExecutiveDecision
            onOpenTrainingTab={() => setActiveTab('training')}
            onOpenSimulatorTab={() => setActiveTab('simulator')}
            onOpenArgonTab={() => setActiveTab('argon')}
          />
        )}

        {activeTab === 'candidates' && (
          <CandidateMatrix
            onSelectModel={(model) => setSelectedDrawerModel(model)}
            onOpenOmnivoiceAnalysis={() => setIsOmnivoiceModalOpen(true)}
            onOpenTrainingGuide={handleOpenTrainingForModel}
          />
        )}

        {activeTab === 'simulator' && (
          <HardwareSimulator />
        )}

        {activeTab === 'training' && (
          <TrainingPlaybook />
        )}

        {activeTab === 'sandbox' && (
          <AudioProsodySandbox />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>Target Architectures: Ubuntu 24-vCPU (AVX-512/AVX2) &amp; Apple Silicon M1 (Unified Memory / AMX)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Evaluated Models: Kokoro-82M, StyleTTS2, Piper, Matcha-TTS, ChatTTS, F5-TTS, OmniVoice</span>
          </div>
        </div>
      </footer>

      {/* Omnivoice Analysis Deep Dive Modal */}
      <OmnivoiceAnalysisModal
        isOpen={isOmnivoiceModalOpen}
        onClose={() => setIsOmnivoiceModalOpen(false)}
      />

      {/* Deployment Hub Modal */}
      <DeploymentHubModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />

      {/* Detailed Candidate Model Drawer */}
      <ModelDetailDrawer
        model={selectedDrawerModel}
        onClose={() => setSelectedDrawerModel(null)}
        onOpenTrainingGuide={handleOpenTrainingForModel}
      />
    </div>
  );
}
