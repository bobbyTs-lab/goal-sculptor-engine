import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, Trash2, Quote, AlertTriangle, Weight, Volume2 } from 'lucide-react';
import { exportAllData, importAllData, clearAllData, loadSettings, saveSettings } from '@/lib/storage';
import { toast } from 'sonner';
import { EmberCard, FlickerIn } from '@/components/EmberAnimations';

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const handleExport = () => {
    const data = exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goalforge-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Data exported!');
  };

  const handleImport = () => {
    try {
      const data = JSON.parse(importText);
      importAllData(data);
      setImportText('');
      setShowImport(false);
      toast.success('Data imported! Refresh to see changes.');
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast.error('Invalid JSON data');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImportText(ev.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    clearAllData();
    setShowClearConfirm(false);
    toast.success('All data cleared. Refresh to see changes.');
    setTimeout(() => window.location.reload(), 1000);
  };

  const updateSettings = (updates: Partial<typeof settings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    saveSettings(next);
  };

  const updateQuotes = (text: string) => {
    const quotes = text.split('\n').filter(q => q.trim().length > 0);
    updateSettings({ customQuotes: quotes });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <FlickerIn>
        <div>
          <h1 className="font-gothic text-4xl gradient-alien-text glow-green-text ember-particles relative">Settings</h1>
          <p className="text-muted-foreground mt-1 font-medieval">Data management & customization</p>
        </div>
      </FlickerIn>

      <div className="divider-alien" />

      {/* Body Metrics */}
      <EmberCard delay={0}>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-medieval">
              <Weight className="h-5 w-5 text-primary" /> Body Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="flex items-center gap-4">
              <Label className="font-medieval w-32">Bodyweight (lbs)</Label>
              <Input
                type="number"
                value={settings.bodyweight}
                onChange={e => updateSettings({ bodyweight: Number(e.target.value) })}
                className="w-32 border-rough"
                min={50}
                max={500}
              />
            </div>
            <p className="text-xs text-muted-foreground font-medieval">Used for strength standards comparison and 1RM calculations</p>
          </CardContent>
        </Card>
      </EmberCard>

      {/* Ambient Sound */}
      <EmberCard delay={0.05}>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-medieval">
              <Volume2 className="h-5 w-5 text-secondary" /> Ambient Sound
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <Label className="font-medieval">Enable fire ambience toggle in header</Label>
              <Switch
                checked={settings.ambientSoundEnabled}
                onCheckedChange={(checked) => updateSettings({ ambientSoundEnabled: checked })}
              />
            </div>
            <p className="text-xs text-muted-foreground font-medieval">Crackling fire sound generated via Web Audio API — no external files needed</p>
          </CardContent>
        </Card>
      </EmberCard>

      {/* Motivational Quotes */}
      <EmberCard delay={0.1}>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-medieval">
              <Quote className="h-5 w-5 text-primary" /> Motivational Quotes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="flex items-center justify-between">
              <Label className="font-medieval">Show quotes on dashboard</Label>
              <Switch
                checked={settings.quotesEnabled}
                onCheckedChange={(checked) => updateSettings({ quotesEnabled: checked })}
              />
            </div>
            {settings.quotesEnabled && (
              <div>
                <Label className="text-sm text-muted-foreground font-medieval uppercase tracking-wider">
                  Custom Quotes (one per line, leave empty for defaults)
                </Label>
                <Textarea
                  className="mt-1 border-rough h-32 font-mono text-xs"
                  placeholder="Enter your own quotes, one per line..."
                  value={settings.customQuotes.join('\n')}
                  onChange={e => updateQuotes(e.target.value)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </EmberCard>

      {/* Data Management */}
      <EmberCard delay={0.15}>
        <Card className="border-rough relative overflow-hidden scanlines bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-medieval">
              <Download className="h-5 w-5 text-secondary" /> Data Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button onClick={handleExport} className="gradient-alien text-primary-foreground font-bold font-medieval">
                <Download className="h-4 w-4 mr-2" /> Export All Data
              </Button>
              <Button variant="outline" className="border-rough font-medieval" onClick={() => setShowImport(true)}>
                <Upload className="h-4 w-4 mr-2" /> Import Data
              </Button>
            </div>

            <div className="divider-alien" />

            <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-destructive/50 text-destructive hover:bg-destructive/10 font-medieval w-full">
                  <Trash2 className="h-4 w-4 mr-2" /> Clear All Data
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-rough">
                <DialogHeader>
                  <DialogTitle className="font-gothic text-destructive text-xl flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" /> Confirm Delete
                  </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground font-medieval">
                  This will permanently delete all your goals, workouts, and settings. This action cannot be undone.
                </p>
                <div className="flex gap-3 mt-4">
                  <Button variant="outline" className="flex-1 border-rough font-medieval" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
                  <Button variant="destructive" className="flex-1 font-medieval font-bold" onClick={handleClearAll}>Delete Everything</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </EmberCard>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="bg-card border-rough max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-gothic gradient-alien-text text-xl">Import Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm text-muted-foreground font-medieval">Upload JSON file</Label>
              <Input type="file" accept=".json" onChange={handleFileImport} className="mt-1 border-rough" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground font-medieval">Or paste JSON data</Label>
              <Textarea
                className="mt-1 border-rough h-40 font-mono text-xs"
                placeholder='{"goals":[],"sessions":[],...}'
                value={importText}
                onChange={e => setImportText(e.target.value)}
              />
            </div>
            <Button onClick={handleImport} disabled={!importText.trim()} className="w-full gradient-alien text-primary-foreground font-bold font-medieval">
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
