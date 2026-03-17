import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Upload, Trash2, Quote, AlertTriangle, Weight } from 'lucide-react';
import { exportAllData, importAllData, clearAllData, loadSettings, saveSettings } from '@/lib/storage';
import { toast } from 'sonner';

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
    reader.onload = (ev) => { setImportText(ev.target?.result as string); };
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
    <div className="max-w-3xl mx-auto space-y-6 relative">
      {/* Decorative circle */}
      <div className="section-circle circle-violet w-56 h-56 -top-10 -right-10" />

      <div className="relative z-10">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-xs md:text-sm">Data management & customization</p>
      </div>

      {/* Body Metrics */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5 text-primary" /> Body Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Label className="w-32">Bodyweight (lbs)</Label>
            <Input type="number" value={settings.bodyweight} onChange={e => updateSettings({ bodyweight: Number(e.target.value) })} className="w-32" min={50} max={500} />
          </div>
          <p className="text-xs text-muted-foreground">Used for strength standards comparison and 1RM calculations</p>
        </CardContent>
      </Card>

      {/* Motivational Quotes */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-primary" /> Motivational Quotes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Show quotes on dashboard</Label>
            <Switch checked={settings.quotesEnabled} onCheckedChange={(checked) => updateSettings({ quotesEnabled: checked })} />
          </div>
          {settings.quotesEnabled && (
            <div>
              <Label className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                Custom Quotes (one per line, leave empty for defaults)
              </Label>
              <Textarea className="mt-1 h-32 font-mono text-xs" placeholder="Enter your own quotes, one per line..." value={settings.customQuotes.join('\n')} onChange={e => updateQuotes(e.target.value)} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" /> Data Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button onClick={handleExport} className="font-semibold">
              <Download className="h-4 w-4 mr-2" /> Export All Data
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" /> Import Data
            </Button>
          </div>

          <div className="h-px bg-border" />

          <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 w-full">
                <Trash2 className="h-4 w-4 mr-2" /> Clear All Data
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="text-destructive text-xl flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" /> Confirm Delete
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all your goals, workouts, and settings. This action cannot be undone.
              </p>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
                <Button variant="destructive" className="flex-1 font-semibold" onClick={handleClearAll}>Delete Everything</Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImport} onOpenChange={setShowImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Import Data</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-sm text-muted-foreground">Upload JSON file</Label>
              <Input type="file" accept=".json" onChange={handleFileImport} className="mt-1" />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Or paste JSON data</Label>
              <Textarea className="mt-1 h-40 font-mono text-xs" placeholder='{"goals":[],"sessions":[],...}' value={importText} onChange={e => setImportText(e.target.value)} />
            </div>
            <Button onClick={handleImport} disabled={!importText.trim()} className="w-full font-semibold">
              <Upload className="h-4 w-4 mr-2" /> Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
