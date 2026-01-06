// Simple event emitter for settings updates
type SettingsUpdateListener = () => void;

class SettingsEventEmitter {
    private listeners: SettingsUpdateListener[] = [];

    subscribe(listener: SettingsUpdateListener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    emit() {
        this.listeners.forEach(listener => listener());
    }
}

export const settingsEvents = new SettingsEventEmitter();
